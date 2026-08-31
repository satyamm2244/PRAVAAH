from fastapi import (
    FastAPI,
    HTTPException,
    UploadFile,
    File,
    Form,
    Depends,
)
from create_officer import create_officer
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from sqlalchemy.orm import Session
from pydantic import BaseModel

import json
import os
import random
import time
import uuid

from datetime import datetime
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

from data.wards import WARD_COORDINATES

from database import (
    Base,
    engine,
    get_db,
)

from models import (
    Alert,
    IncidentReport,
    SensorReading,
    Notification,
)

from auth import (
    authenticate_user,
    create_access_token,
    create_normal_user,
    require_officer,
    require_user,
    user_to_dict,
)

from emergency_assistant import generate_emergency_response

from risk_engine import (
    assess_ward_hazards,
    build_hazard_summary,
)


# =============================================================================
# DATABASE INITIALIZATION
# =============================================================================

Base.metadata.create_all(bind=engine)

try:
    create_officer()
except Exception as error:
    print(
        "Officer bootstrap failed:",
        error,
    )


# =============================================================================
# FASTAPI APP
# =============================================================================

app = FastAPI(
    title="PRAVAAH Backend",
    version="2.0.0",
    description="Backend API for PRAVAAH disaster risk monitoring system",
)


# =============================================================================
# CORS
# =============================================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://192.168.1.27:3000",
        "https://pravaah-delta.vercel.app",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# CONFIG
# =============================================================================

SIMULATION_UPDATE_SECONDS = 4
WEATHER_REFRESH_SECONDS = 300

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

INDIA_TIMEZONE = ZoneInfo("Asia/Kolkata")

UPLOAD_DIR = "uploads"

ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}

MAX_IMAGE_SIZE = 5 * 1024 * 1024


# =============================================================================
# CREATE UPLOAD DIRECTORY
# =============================================================================

os.makedirs(UPLOAD_DIR, exist_ok=True)

app.mount(
    "/uploads",
    StaticFiles(directory=UPLOAD_DIR),
    name="uploads",
)


# =============================================================================
# SIMULATED WARD STATE
# =============================================================================

def create_initial_state():
    state = {}

    for ward_id in WARD_COORDINATES:
        state[ward_id] = {
            "rainfallMm": random.randint(10, 50),
            "riverLevelCm": random.randint(5, 35),
            "reportCount": 0,
        }

    if "W14" in state:
        state["W14"]["riverLevelCm"] = 42

    if "W58" in state:
        state["W58"]["riverLevelCm"] = 34

    if "W32" in state:
        state["W32"]["riverLevelCm"] = 29

    return state


WARD_STATE = create_initial_state()
LAST_SIMULATION_UPDATE = time.time()


# =============================================================================
# WEATHER CACHE
# =============================================================================

REAL_RAINFALL = {}
LAST_WEATHER_UPDATE = 0
WEATHER_AVAILABLE = False
WEATHER_ERROR = None


# =============================================================================
# REQUEST MODELS
# =============================================================================

class EmergencyAssistantRequest(BaseModel):
    message: str
    ward: str


class AlertCreateRequest(BaseModel):
    id: str
    ward: str
    priority: str
    trigger: str
    level: str
    title: str
    message: str
    risk: int
    confidence: int
    primaryHazard: str
    recommendedAction: str
    createdAt: int


# =============================================================================
# GENERAL HELPERS
# =============================================================================

def clamp(value, minimum, maximum):
    return max(minimum, min(maximum, value))


def drift_value(value, change, minimum, maximum):
    movement = random.randint(-change, change)

    return clamp(
        value + movement,
        minimum,
        maximum,
    )


def normalize_ward(ward_id: str):
    ward_id = ward_id.upper()

    if ward_id not in WARD_COORDINATES:
        raise HTTPException(
            status_code=404,
            detail=f"Ward {ward_id} not found",
        )

    return ward_id


# =============================================================================
# ALERT POLICY
# =============================================================================

ALERT_LEVEL_RANK = {
    "NORMAL": 0,
    "WATCH": 1,
    "HIGH": 2,
    "CRITICAL": 3,
}

ALERT_PRIORITY_BY_LEVEL = {
    "WATCH": "MEDIUM",
    "HIGH": "HIGH",
    "CRITICAL": "CRITICAL",
}

ALERT_COOLDOWN_MINUTES = 30
ALERT_CANDIDATE_BUCKET_MINUTES = 15


def normalize_hazard_type(hazard_type: str):
    clean_hazard = (
        (hazard_type or "UNKNOWN")
        .strip()
        .upper()
        .replace("-", "_")
        .replace(" ", "_")
    )

    aliases = {
        "WEATHER": "SEVERE_WEATHER",
        "SEVEREWEATHER": "SEVERE_WEATHER",
        "EARTHQUAKE": "SEISMIC",
        "STRUCTURAL": "INFRASTRUCTURE",
    }

    return aliases.get(
        clean_hazard,
        clean_hazard,
    )


def get_published_alert_for_ward_hazard(
    ward_id: str,
    hazard_type: str,
    db: Session,
):
    clean_hazard = normalize_hazard_type(
        hazard_type
    )

    return (
        db.query(Alert)
        .filter(
            Alert.ward == ward_id,
            Alert.primary_hazard == clean_hazard,
            Alert.status == "PUBLISHED",
        )
        .order_by(
            Alert.published_at.desc()
        )
        .first()
    )


def get_recent_dismissed_alert_for_ward_hazard(
    ward_id: str,
    hazard_type: str,
    db: Session,
):
    cutoff = (
        int(time.time() * 1000)
        - ALERT_COOLDOWN_MINUTES * 60 * 1000
    )

    clean_hazard = normalize_hazard_type(
        hazard_type
    )

    return (
        db.query(Alert)
        .filter(
            Alert.ward == ward_id,
            Alert.primary_hazard == clean_hazard,
            Alert.status == "DISMISSED",
            Alert.dismissed_at.isnot(None),
            Alert.dismissed_at >= cutoff,
        )
        .order_by(
            Alert.dismissed_at.desc()
        )
        .first()
    )


def build_alert_candidate_id(
    ward_id: str,
    hazard_type: str,
    now_ms: int,
):
    bucket_ms = (
        ALERT_CANDIDATE_BUCKET_MINUTES
        * 60
        * 1000
    )

    bucket = now_ms // bucket_ms

    clean_hazard = (
        normalize_hazard_type(hazard_type)
        .lower()
        .replace("_", "-")
    )

    return (
        f"candidate-{ward_id.lower()}-"
        f"{clean_hazard}-{bucket}"
    )


def candidate_uses_only_stale_physical_evidence(
    hazard: dict,
):
    evidence = hazard.get(
        "evidence",
        [],
    )

    if not evidence:
        return False

    physical = [
        item
        for item in evidence
        if item.get("sourceType")
        != "CITIZEN_REPORT"
    ]

    if not physical:
        return False

    return all(
        item.get(
            "freshness",
            {},
        ).get("status")
        in {
            "STALE",
            "VERY_STALE",
        }
        for item in physical
    )


def build_alert_candidate(
    ward_id: str,
    hazard: dict,
    now_ms: int,
):
    hazard_type = normalize_hazard_type(
        hazard.get(
            "hazardType",
            "UNKNOWN",
        )
    )

    level = (
        hazard.get(
            "riskLevel",
            "NORMAL",
        )
        .strip()
        .upper()
    )

    risk = int(
        hazard.get(
            "riskScore",
            0,
        )
    )

    confidence = int(
        hazard.get(
            "confidenceScore",
            0,
        )
    )

    affected_area = hazard.get(
        "affectedArea",
        {
            "primaryWard": ward_id,
            "scope": "WARD",
            "description": ward_id,
        },
    )

    area_description = (
        affected_area.get(
            "description"
        )
        or ward_id
    )

    citizen_actions = hazard.get(
        "citizenActions",
        [],
    )

    recommended_action = (
        citizen_actions[0]
        if citizen_actions
        else "Follow official emergency instructions."
    )

    stale_only = (
        candidate_uses_only_stale_physical_evidence(
            hazard
        )
    )

    return {
        "id": build_alert_candidate_id(
            ward_id,
            hazard_type,
            now_ms,
        ),
        "ward": ward_id,
        "priority":
            ALERT_PRIORITY_BY_LEVEL.get(
                level,
                "MEDIUM",
            ),
        "trigger":
            "MULTI_HAZARD_FUSION",
        "level":
            level,
        "title": (
            f"{hazard_type.replace('_', ' ').title()} "
            f"Alert - {ward_id}"
        ),
        "message": (
            f"{level} "
            f"{hazard_type.replace('_', ' ').lower()} "
            f"risk detected for {area_description}. "
            f"Risk score {risk}/100 with "
            f"{confidence}% confidence."
        ),
        "risk":
            risk,
        "confidence":
            confidence,
        "primaryHazard":
            hazard_type,
        "recommendedAction":
            recommended_action,
        "createdAt":
            now_ms,
        "affectedArea":
            affected_area,
        "evidence":
            hazard.get(
                "evidence",
                [],
            ),
        "evidenceCount":
            hazard.get(
                "evidenceCount",
                0,
            ),
        "citizenActions":
            citizen_actions,
        "officerActions":
            hazard.get(
                "officerActions",
                [],
            ),
        "dataFreshness":
            hazard.get(
                "dataFreshness",
                {},
            ),
        "staleOnlyPhysicalEvidence":
            stale_only,
        "publishRecommended":
            not stale_only,
        "source":
            "MULTI_HAZARD_ENGINE",
        "candidateAction":
            (
                "OFFICER_REVIEW_STALE"
                if stale_only
                else "NEW"
            ),
    }

# =============================================================================
# ALERT CANDIDATES
# =============================================================================

@app.get("/api/alerts/candidates")
def get_alert_candidates(
    db: Session = Depends(get_db),
    current_officer=Depends(require_officer),
):
    update_simulation()
    fetch_real_rainfall()

    candidates = []

    suppressed_duplicates = 0
    suppressed_cooldown = 0
    escalation_candidates = 0
    stale_review_candidates = 0

    now_ms = int(
        time.time() * 1000
    )

    for ward_id in WARD_COORDINATES:
        ward_data = build_ward_response(
            ward_id,
            db,
        )

        multi_hazard = ward_data.get(
            "multiHazard",
            {},
        )

        hazards = multi_hazard.get(
            "hazards",
            [],
        )

        for hazard in hazards:
            level = (
                hazard.get(
                    "riskLevel",
                    "NORMAL",
                )
                .strip()
                .upper()
            )

            if level == "NORMAL":
                continue

            hazard_type = normalize_hazard_type(
                hazard.get(
                    "hazardType",
                    "UNKNOWN",
                )
            )

            existing_published = (
                get_published_alert_for_ward_hazard(
                    ward_id=ward_id,
                    hazard_type=hazard_type,
                    db=db,
                )
            )

            if existing_published is not None:
                incoming_rank = (
                    ALERT_LEVEL_RANK.get(
                        level,
                        0,
                    )
                )

                existing_rank = (
                    ALERT_LEVEL_RANK.get(
                        (
                            existing_published.level
                            or "NORMAL"
                        )
                        .strip()
                        .upper(),
                        0,
                    )
                )

                if incoming_rank <= existing_rank:
                    suppressed_duplicates += 1
                    continue

            recent_dismissed = (
                get_recent_dismissed_alert_for_ward_hazard(
                    ward_id=ward_id,
                    hazard_type=hazard_type,
                    db=db,
                )
            )

            if recent_dismissed is not None:
                suppressed_cooldown += 1
                continue

            candidate = build_alert_candidate(
                ward_id,
                hazard,
                now_ms,
            )

            if existing_published is not None:
                candidate[
                    "candidateAction"
                ] = "ESCALATE"

                candidate[
                    "existingAlertId"
                ] = existing_published.id

                candidate[
                    "existingLevel"
                ] = existing_published.level

                escalation_candidates += 1

            elif (
                candidate[
                    "candidateAction"
                ]
                == "OFFICER_REVIEW_STALE"
            ):
                stale_review_candidates += 1

            candidates.append(
                candidate
            )

    candidates.sort(
        key=lambda item: (
            ALERT_LEVEL_RANK.get(
                item.get(
                    "level",
                    "NORMAL",
                ),
                0,
            ),
            item.get(
                "risk",
                0,
            ),
            item.get(
                "confidence",
                0,
            ),
        ),
        reverse=True,
    )

    return {
        "count":
            len(candidates),
        "suppressedDuplicates":
            suppressed_duplicates,
        "suppressedCooldown":
            suppressed_cooldown,
        "escalationCandidates":
            escalation_candidates,
        "staleReviewCandidates":
            stale_review_candidates,
        "cooldownMinutes":
            ALERT_COOLDOWN_MINUTES,
        "candidateBucketMinutes":
            ALERT_CANDIDATE_BUCKET_MINUTES,
        "generatedAt":
            int(time.time() * 1000),
        "candidates":
            candidates,
    }


# =============================================================================
# ALERT HISTORY
# =============================================================================

@app.get("/api/alerts/history/all")
def get_alert_history(
    db: Session = Depends(get_db),
    current_officer=Depends(require_officer),
):
    alerts = (
        db.query(Alert)
        .order_by(
            Alert.created_at.desc()
        )
        .all()
    )

    return [
        alert_to_dict(alert)
        for alert in alerts
    ]

# =============================================================================
# CREATE / PUBLISH ALERT
# =============================================================================

@app.post(
    "/api/alerts",
    status_code=201,
)
def publish_alert(
    request: AlertCreateRequest,
    db: Session = Depends(get_db),
    current_officer=Depends(require_officer),
):
    ward_id = normalize_ward(
        request.ward
    )

    existing_alert = (
        db.query(Alert)
        .filter(
            Alert.id == request.id
        )
        .first()
    )

    if existing_alert:
        raise HTTPException(
            status_code=409,
            detail="Alert already exists.",
        )

    clean_primary_hazard = (
        normalize_hazard_type(
            request.primaryHazard
        )
    )

    incoming_level = (
        request.level
        .strip()
        .upper()
    )

    if incoming_level not in ALERT_LEVEL_RANK:
        raise HTTPException(
            status_code=400,
            detail="Invalid alert level.",
        )

    duplicate_published_alert = (
        get_published_alert_for_ward_hazard(
            ward_id=ward_id,
            hazard_type=clean_primary_hazard,
            db=db,
        )
    )

    if duplicate_published_alert is not None:
        existing_level = (
            duplicate_published_alert.level
            or "NORMAL"
        ).strip().upper()

        incoming_rank = ALERT_LEVEL_RANK.get(
            incoming_level,
            0,
        )

        existing_rank = ALERT_LEVEL_RANK.get(
            existing_level,
            0,
        )

        if incoming_rank <= existing_rank:
            raise HTTPException(
                status_code=409,
                detail={
                    "message": (
                        "An active published alert already exists "
                        "for this ward and hazard at the same or "
                        "higher severity."
                    ),
                    "existingAlertId":
                        duplicate_published_alert.id,
                    "ward":
                        ward_id,
                    "primaryHazard":
                        clean_primary_hazard,
                    "existingLevel":
                        existing_level,
                    "incomingLevel":
                        incoming_level,
                },
            )

        duplicate_published_alert.priority = (
            request.priority
            .strip()
            .upper()
        )
        duplicate_published_alert.trigger = (
            request.trigger
            .strip()
            .upper()
        )
        duplicate_published_alert.level = (
            incoming_level
        )
        duplicate_published_alert.title = (
            request.title.strip()
        )
        duplicate_published_alert.message = (
            request.message.strip()
        )
        duplicate_published_alert.risk = (
            request.risk
        )
        duplicate_published_alert.confidence = (
            request.confidence
        )
        duplicate_published_alert.recommended_action = (
            request.recommendedAction.strip()
        )
        duplicate_published_alert.primary_hazard = (
            clean_primary_hazard
        )

        try:
            create_notification(
                db=db,
                recipient_role="USER",
                notification_type="ALERT",
                severity=incoming_level,
                title=(
                    "Alert Escalated: "
                    f"{request.title.strip()}"
                ),
                message=request.message.strip(),
                ward=ward_id,
                action_type="VIEW_ALERT",
                action_target=
                    duplicate_published_alert.id,
            )

            db.commit()
            db.refresh(
                duplicate_published_alert
            )

        except Exception as error:
            db.rollback()
            print(
                "Unable to escalate alert:",
                error,
            )
            raise HTTPException(
                status_code=500,
                detail="Unable to escalate alert.",
            )

        return alert_to_dict(
            duplicate_published_alert
        )

    now = int(
        time.time() * 1000
    )

    alert = Alert(
        id=request.id,
        ward=ward_id,
        priority=
            request.priority.strip().upper(),
        trigger=
            request.trigger.strip().upper(),
        level=
            incoming_level,
        title=
            request.title.strip(),
        message=
            request.message.strip(),
        risk=
            request.risk,
        confidence=
            request.confidence,
        primary_hazard=
            clean_primary_hazard,
        recommended_action=
            request.recommendedAction.strip(),
        status="PUBLISHED",
        published_by=
            getattr(
                current_officer,
                "id",
                None,
            ),
        created_at=
            request.createdAt,
        published_at=
            now,
        dismissed_at=
            None,
    )

    try:
        db.add(alert)

        create_notification(
            db=db,
            recipient_role="USER",
            notification_type="ALERT",
            severity=incoming_level,
            title=request.title,
            message=request.message,
            ward=ward_id,
            action_type="VIEW_ALERT",
            action_target=request.id,
        )

        db.commit()
        db.refresh(alert)

    except Exception as error:
        db.rollback()
        print(
            "Unable to publish alert:",
            error,
        )
        raise HTTPException(
            status_code=500,
            detail="Unable to publish alert.",
        )

    return alert_to_dict(
        alert
    )


# =============================================================================
# GET PUBLIC PUBLISHED ALERTS
# =============================================================================

@app.get("/api/alerts")
def get_published_alerts(
    db: Session = Depends(get_db),
):
    alerts = (
        db.query(Alert)
        .filter(
            Alert.status == "PUBLISHED"
        )
        .order_by(
            Alert.published_at.desc()
        )
        .all()
    )

    return [
        alert_to_dict(alert)
        for alert in alerts
    ]


# =============================================================================
# DISMISS ALERT
# =============================================================================

@app.patch(
    "/api/alerts/{alert_id}/dismiss"
)
def dismiss_alert(
    alert_id: str,
    db: Session = Depends(get_db),
    current_officer=Depends(require_officer),
):
    alert = (
        db.query(Alert)
        .filter(
            Alert.id == alert_id
        )
        .first()
    )

    if alert is None:
        raise HTTPException(
            status_code=404,
            detail="Alert not found.",
        )

    if alert.status == "DISMISSED":
        return alert_to_dict(
            alert
        )

    alert.status = "DISMISSED"

    alert.dismissed_at = int(
        time.time() * 1000
    )

    try:
        db.commit()

        db.refresh(
            alert
        )

    except Exception as error:
        db.rollback()

        print(
            "Unable to dismiss alert:",
            error,
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to dismiss alert.",
        )

    return alert_to_dict(
        alert
    )

# =============================================================================
# DISMISS ALERT CANDIDATE
# =============================================================================

@app.post("/api/alerts/candidates/{candidate_id}/dismiss")
def dismiss_alert_candidate(
    candidate_id: str,
    ward: str,
    hazard: str,
    level: str,
    risk: int,
    confidence: int,
    db: Session = Depends(get_db),
    current_officer=Depends(require_officer),
):
    ward_id = normalize_ward(
        ward
    )

    clean_hazard = normalize_hazard_type(
        hazard
    )

    clean_level = (
        level
        .strip()
        .upper()
    )

    if clean_level not in ALERT_LEVEL_RANK:
        raise HTTPException(
            status_code=400,
            detail="Invalid alert level.",
        )

    existing = (
        db.query(Alert)
        .filter(
            Alert.id == candidate_id
        )
        .first()
    )

    if existing is not None:
        if existing.status == "DISMISSED":
            return alert_to_dict(
                existing
            )

        raise HTTPException(
            status_code=409,
            detail="Candidate ID already exists.",
        )

    active_alert = (
        get_published_alert_for_ward_hazard(
            ward_id=ward_id,
            hazard_type=clean_hazard,
            db=db,
        )
    )

    if active_alert is not None:
        raise HTTPException(
            status_code=409,
            detail={
                "message": (
                    "A published alert already exists "
                    "for this ward and hazard."
                ),
                "existingAlertId":
                    active_alert.id,
            },
        )

    now = int(
        time.time() * 1000
    )

    dismissed_candidate = Alert(
        id=candidate_id,
        ward=ward_id,
        priority=
            ALERT_PRIORITY_BY_LEVEL.get(
                clean_level,
                "MEDIUM",
            ),
        trigger="MULTI_HAZARD_FUSION",
        level=clean_level,
        title=(
            f"{clean_hazard.replace('_', ' ').title()} "
            f"Candidate - {ward_id}"
        ),
        message=(
            "Alert candidate dismissed "
            "during officer review."
        ),
        risk=int(
            clamp(
                risk,
                0,
                100,
            )
        ),
        confidence=int(
            clamp(
                confidence,
                0,
                100,
            )
        ),
        primary_hazard=
            clean_hazard,
        recommended_action=
            "Officer reviewed and dismissed this candidate.",
        status="DISMISSED",
        published_by=
            getattr(
                current_officer,
                "id",
                None,
            ),
        created_at=now,
        published_at=now,
        dismissed_at=now,
    )

    try:
        db.add(
            dismissed_candidate
        )
        db.commit()
        db.refresh(
            dismissed_candidate
        )

    except Exception as error:
        db.rollback()
        print(
            "Unable to dismiss alert candidate:",
            error,
        )
        raise HTTPException(
            status_code=500,
            detail="Unable to dismiss alert candidate.",
        )

    return alert_to_dict(
        dismissed_candidate
    )


# =============================================================================
# SERIALIZERS
# =============================================================================

def report_to_dict(report: IncidentReport):
    return {
        "id": report.id,
        "reporterUserId": report.reporter_user_id,
        "ward": report.ward,
        "reportType": report.report_type,
        "severity": report.severity,
        "description": report.description,
        "latitude": report.latitude,
        "longitude": report.longitude,
        "photoUrl": report.photo_url,
        "status": report.status,
        "createdAt": report.created_at,
        "verifiedAt": report.verified_at,
    }


def alert_to_dict(alert: Alert):
    return {
        "id": alert.id,
        "ward": alert.ward,
        "priority": alert.priority,
        "trigger": alert.trigger,
        "level": alert.level,
        "title": alert.title,
        "message": alert.message,
        "risk": alert.risk,
        "confidence": alert.confidence,
        "primaryHazard": alert.primary_hazard,
        "recommendedAction": alert.recommended_action,
        "status": alert.status,
        "publishedBy": alert.published_by,
        "createdAt": alert.created_at,
        "publishedAt": alert.published_at,
        "dismissedAt": alert.dismissed_at,
    }


def notification_to_dict(notification: Notification):
    return {
        "id": notification.id,
        "recipientRole": notification.recipient_role,
        "recipientUserId": notification.recipient_user_id,
        "type": notification.notification_type,
        "severity": notification.severity,
        "title": notification.title,
        "message": notification.message,
        "ward": notification.ward,
        "actionType": notification.action_type,
        "actionTarget": notification.action_target,
        "isRead": bool(notification.is_read),
        "createdAt": notification.created_at,
        "readAt": notification.read_at,
    }


def sensor_to_dict(reading: SensorReading):
    return {
        "id": reading.id,
        "sensorId": reading.sensor_id,
        "ward": reading.ward,
        "sensorType": reading.sensor_type,
        "value": reading.value,
        "unit": reading.unit,
        "latitude": reading.latitude,
        "longitude": reading.longitude,
        "status": reading.status,
        "source": reading.source,
        "timestamp": reading.timestamp,
    }


# =============================================================================
# NOTIFICATION HELPER
# =============================================================================

def create_notification(
    db: Session,
    recipient_role: str,
    notification_type: str,
    severity: str,
    title: str,
    message: str,
    recipient_user_id: str | None = None,
    ward: str | None = None,
    action_type: str | None = None,
    action_target: str | None = None,
):
    notification = Notification(
        id=str(uuid.uuid4()),
        recipient_role=recipient_role.strip().upper(),
        recipient_user_id=recipient_user_id,
        notification_type=notification_type.strip().upper(),
        severity=severity.strip().upper(),
        title=title.strip(),
        message=message.strip(),
        ward=ward,
        action_type=action_type,
        action_target=action_target,
        is_read=0,
        created_at=int(time.time() * 1000),
        read_at=None,
    )

    db.add(notification)

    return notification


# =============================================================================
# REPORT HELPERS
# =============================================================================

def count_verified_reports(ward_id: str, db: Session):
    return (
        db.query(IncidentReport)
        .filter(
            IncidentReport.ward == ward_id,
            IncidentReport.status == "VERIFIED",
        )
        .count()
    )


def count_ward_reports_by_status(
    ward_id: str,
    status: str,
    db: Session,
):
    return (
        db.query(IncidentReport)
        .filter(
            IncidentReport.ward == ward_id,
            IncidentReport.status == status,
        )
        .count()
    )


def count_total_ward_reports(ward_id: str, db: Session):
    return (
        db.query(IncidentReport)
        .filter(IncidentReport.ward == ward_id)
        .count()
    )


def count_reports_by_status(db: Session, status: str):
    return (
        db.query(IncidentReport)
        .filter(IncidentReport.status == status)
        .count()
    )


def get_ward_report_breakdown(ward_id: str, db: Session):
    return {
        "verified": count_verified_reports(ward_id, db),
        "pending": count_ward_reports_by_status(
            ward_id,
            "PENDING",
            db,
        ),
        "rejected": count_ward_reports_by_status(
            ward_id,
            "REJECTED",
            db,
        ),
        "total": count_total_ward_reports(ward_id, db),
    }

def get_verified_ward_reports(
    ward_id: str,
    db: Session,
):
    reports = (
        db.query(IncidentReport)
        .filter(
            IncidentReport.ward == ward_id,
            IncidentReport.status == "VERIFIED",
        )
        .order_by(
            IncidentReport.created_at.desc()
        )
        .all()
    )

    return [
        report_to_dict(report)
        for report in reports
    ]


# =============================================================================
# SENSOR HELPERS
# =============================================================================

def validate_sensor_type(sensor_type: str):
    clean_type = sensor_type.strip().upper()

    allowed_types = {
        # Existing hydrological sensors
        "RIVER_LEVEL",
        "WATER_LEVEL",
        "RAINFALL",
        "DRAIN_LEVEL",

        # Severe weather
        "WIND_SPEED",

        # Fire
        "SMOKE",
        "FIRE_RISK",

        # Seismic
        "SEISMIC_INTENSITY",

        # Infrastructure
        "INFRASTRUCTURE_STRESS",
    }

    if clean_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=(
                "sensorType must be one of: "
                "RIVER_LEVEL, WATER_LEVEL, RAINFALL, DRAIN_LEVEL, "
                "WIND_SPEED, SMOKE, FIRE_RISK, "
                "SEISMIC_INTENSITY, or INFRASTRUCTURE_STRESS."
            ),
        )

    return clean_type

def validate_sensor_status(status: str):
    clean_status = status.strip().upper()

    allowed_statuses = {
        "ONLINE",
        "OFFLINE",
        "MAINTENANCE",
    }

    if clean_status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="status must be ONLINE, OFFLINE, or MAINTENANCE.",
        )

    return clean_status


# =============================================================================
# SIMULATION UPDATE
# =============================================================================

def update_simulation():
    global LAST_SIMULATION_UPDATE

    now = time.time()

    if now - LAST_SIMULATION_UPDATE < SIMULATION_UPDATE_SECONDS:
        return

    for ward_id in WARD_STATE:
        current = WARD_STATE[ward_id]

        current["rainfallMm"] = drift_value(
            current["rainfallMm"],
            change=4,
            minimum=0,
            maximum=150,
        )

        current["riverLevelCm"] = drift_value(
            current["riverLevelCm"],
            change=3,
            minimum=-20,
            maximum=80,
        )

    LAST_SIMULATION_UPDATE = now


# =============================================================================
# OPEN-METEO
# =============================================================================

def fetch_real_rainfall():
    global REAL_RAINFALL
    global LAST_WEATHER_UPDATE
    global WEATHER_AVAILABLE
    global WEATHER_ERROR

    now = time.time()

    if (
        WEATHER_AVAILABLE
        and REAL_RAINFALL
        and now - LAST_WEATHER_UPDATE < WEATHER_REFRESH_SECONDS
    ):
        return

    try:
        ward_ids = list(WARD_COORDINATES.keys())

        latitudes = ",".join(
            str(WARD_COORDINATES[ward_id]["latitude"])
            for ward_id in ward_ids
        )

        longitudes = ",".join(
            str(WARD_COORDINATES[ward_id]["longitude"])
            for ward_id in ward_ids
        )

        parameters = {
            "latitude": latitudes,
            "longitude": longitudes,
            "hourly": "precipitation",
            "forecast_days": 1,
            "timezone": "Asia/Kolkata",
            "precipitation_unit": "mm",
        }

        request_url = OPEN_METEO_URL + "?" + urlencode(parameters)

        request = Request(
            request_url,
            headers={
                "User-Agent": "PRAVAAH-SIH-Prototype/1.0"
            },
        )

        with urlopen(request, timeout=12) as response:
            payload = json.loads(
                response.read().decode("utf-8")
            )

        if not isinstance(payload, list):
            payload = [payload]

        current_hour = (
            datetime.now(INDIA_TIMEZONE)
            .replace(
                minute=0,
                second=0,
                microsecond=0,
            )
            .strftime("%Y-%m-%dT%H:%M")
        )

        rainfall_result = {}

        for index, ward_id in enumerate(ward_ids):
            if index >= len(payload):
                continue

            weather_data = payload[index]

            hourly = weather_data.get("hourly", {})
            times = hourly.get("time", [])
            precipitation = hourly.get("precipitation", [])

            if not times:
                continue

            try:
                hour_index = times.index(current_hour)

            except ValueError:
                current_local_hour = datetime.now(
                    INDIA_TIMEZONE
                ).hour

                hour_index = min(
                    current_local_hour,
                    len(times) - 1,
                )

            if hour_index >= len(precipitation):
                continue

            rain_value = precipitation[hour_index]

            if rain_value is None:
                rain_value = 0

            rainfall_result[ward_id] = round(
                float(rain_value),
                2,
            )

        if rainfall_result:
            REAL_RAINFALL = rainfall_result
            WEATHER_AVAILABLE = True
            WEATHER_ERROR = None
            LAST_WEATHER_UPDATE = now

        else:
            raise RuntimeError(
                "Open-Meteo returned no usable rainfall data."
            )

    except Exception as error:
        print(
            "Open-Meteo rainfall fetch failed:",
            error,
        )

        WEATHER_AVAILABLE = False
        WEATHER_ERROR = str(error)


def get_rainfall(ward_id: str):
    if (
        WEATHER_AVAILABLE
        and ward_id in REAL_RAINFALL
    ):
        return REAL_RAINFALL[ward_id]

    return WARD_STATE[ward_id]["rainfallMm"]


# =============================================================================
# SAVE PHOTO
# =============================================================================

async def save_photo(photo: UploadFile | None):
    if photo is None:
        return None

    if photo.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Photo must be JPEG, PNG, or WEBP.",
        )

    file_bytes = await photo.read()

    if len(file_bytes) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="Photo size must be under 5 MB.",
        )

    extension_map = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
    }

    extension = extension_map[photo.content_type]

    filename = f"{uuid.uuid4()}{extension}"

    filepath = os.path.join(
        UPLOAD_DIR,
        filename,
    )

    with open(filepath, "wb") as output_file:
        output_file.write(file_bytes)

    return f"/uploads/{filename}"



# =============================================================================
# LATEST ONLINE RIVER SENSOR
# =============================================================================

def get_latest_online_sensor(
    ward_id: str,
    sensor_type: str,
    db: Session,
):
    """
    Return the newest ONLINE reading for a specific
    sensor type in a ward.
    """

    return (
        db.query(SensorReading)
        .filter(
            SensorReading.ward == ward_id,
            SensorReading.sensor_type == sensor_type,
            SensorReading.status == "ONLINE",
        )
        .order_by(
            SensorReading.timestamp.desc()
        )
        .first()
    )


def get_latest_online_river_sensor(
    ward_id: str,
    db: Session,
):
    """Backward-compatible helper for existing river-level logic."""

    return get_latest_online_sensor(
        ward_id=ward_id,
        sensor_type="RIVER_LEVEL",
        db=db,
    )

def build_ward_response(
    ward_id: str,
    db: Session,
):
    # =========================================================================
    # BASE WARD INFORMATION
    # =========================================================================

    coordinates = WARD_COORDINATES[
        ward_id
    ]

    reading = WARD_STATE[
        ward_id
    ]


    # =========================================================================
    # RAINFALL
    # =========================================================================

    rainfall = get_rainfall(
        ward_id
    )


    rainfall_source = (
        "Open-Meteo weather model"
        if WEATHER_AVAILABLE
        else "Simulated weather fallback"
    )


    rainfall_mode = (
        "REAL"
        if WEATHER_AVAILABLE
        else "SIMULATED"
    )


    # =========================================================================
    # RIVER LEVEL
    # =========================================================================

    latest_river_sensor = (
        get_latest_online_river_sensor(
            ward_id,
            db,
        )
    )


    if latest_river_sensor is not None:

        river_level = float(
            latest_river_sensor.value
        )


        river_level_source = (
            latest_river_sensor.sensor_id
        )


        river_level_mode = (
            "IOT"
        )


        river_level_timestamp = (
            latest_river_sensor.timestamp
        )


    else:

        river_level = (
            reading[
                "riverLevelCm"
            ]
        )


        river_level_source = (
            "Simulated river sensor fallback"
        )


        river_level_mode = (
            "SIMULATED"
        )


        river_level_timestamp = (
            None
        )


    # =========================================================================
    # MULTI-HAZARD SENSOR OBSERVATIONS
    # =========================================================================

    latest_wind_sensor = get_latest_online_sensor(
        ward_id,
        "WIND_SPEED",
        db,
    )

    latest_fire_sensor = get_latest_online_sensor(
        ward_id,
        "FIRE_RISK",
        db,
    )

    latest_smoke_sensor = get_latest_online_sensor(
        ward_id,
        "SMOKE",
        db,
    )

    latest_seismic_sensor = get_latest_online_sensor(
        ward_id,
        "SEISMIC_INTENSITY",
        db,
    )

    latest_infrastructure_sensor = get_latest_online_sensor(
        ward_id,
        "INFRASTRUCTURE_STRESS",
        db,
    )

    def sensor_value(sensor):
        if sensor is None:
            return None

        return float(sensor.value)

    wind_speed_kmh = sensor_value(latest_wind_sensor)
    fire_risk_index = sensor_value(latest_fire_sensor)
    smoke_level = sensor_value(latest_smoke_sensor)
    seismic_intensity = sensor_value(latest_seismic_sensor)
    infrastructure_stress = sensor_value(
        latest_infrastructure_sensor
    )


    # =========================================================================
    # REPORT INFORMATION
    # =========================================================================

    report_breakdown = (
        get_ward_report_breakdown(
            ward_id,
            db,
        )
    )


    verified_report_count = (
        report_breakdown[
            "verified"
        ]
    )


    reading[
        "reportCount"
    ] = verified_report_count


    # Get the actual verified report objects.
    #
    # The old system only needed the number of reports.
    # Multi-hazard fusion needs report type, severity,
    # description, and verification information.
    verified_reports = (
        get_verified_ward_reports(
            ward_id,
            db,
        )
    )


    # =========================================================================
    # BASE WARD RESPONSE
    # =========================================================================

    ward_response = {

        "ward":
            ward_id,


        # ---------------------------------------------------------------------
        # EXISTING ENVIRONMENTAL DATA
        # ---------------------------------------------------------------------

        "rainfallMm":
            rainfall,

        "riverLevelCm":
            river_level,

        # ---------------------------------------------------------------------
        # MULTI-HAZARD SENSOR VALUES
        # ---------------------------------------------------------------------

        "windSpeedKmh":
            wind_speed_kmh,

        "fireRiskIndex":
            fire_risk_index,

        "smokeLevel":
            smoke_level,

        "seismicIntensity":
            seismic_intensity,

        "infrastructureStress":
            infrastructure_stress,


        # ---------------------------------------------------------------------
        # EXISTING REPORT COUNTS
        # ---------------------------------------------------------------------

        "reportCount":
            verified_report_count,

        "verifiedReportCount":
            report_breakdown[
                "verified"
            ],

        "pendingReportCount":
            report_breakdown[
                "pending"
            ],

        "rejectedReportCount":
            report_breakdown[
                "rejected"
            ],

        "totalReportCount":
            report_breakdown[
                "total"
            ],


        # ---------------------------------------------------------------------
        # LOCATION
        # ---------------------------------------------------------------------

        "latitude":
            coordinates[
                "latitude"
            ],

        "longitude":
            coordinates[
                "longitude"
            ],


        # ---------------------------------------------------------------------
        # DATA MODE
        # ---------------------------------------------------------------------

        "dataMode":
            "HYBRID",


        # ---------------------------------------------------------------------
        # DATA SOURCES
        # ---------------------------------------------------------------------

        "sources": {

            "rainfall":
                rainfall_source,

            "rainfallMode":
                rainfall_mode,

            "riverLevel":
                river_level_source,

            "riverLevelMode":
                river_level_mode,

            "riverLevelTimestamp":
                river_level_timestamp,

            "windSpeed": (
                latest_wind_sensor.sensor_id
                if latest_wind_sensor
                else None
            ),

            "windSpeedMode": (
                latest_wind_sensor.source
                if latest_wind_sensor
                else None
            ),

            "windSpeedTimestamp": (
                latest_wind_sensor.timestamp
                if latest_wind_sensor
                else None
            ),

            "fireRisk": (
                latest_fire_sensor.sensor_id
                if latest_fire_sensor
                else None
            ),

            "fireRiskMode": (
                latest_fire_sensor.source
                if latest_fire_sensor
                else None
            ),

            "fireRiskTimestamp": (
                latest_fire_sensor.timestamp
                if latest_fire_sensor
                else None
            ),

            "smoke": (
                latest_smoke_sensor.sensor_id
                if latest_smoke_sensor
                else None
            ),

            "smokeMode": (
                latest_smoke_sensor.source
                if latest_smoke_sensor
                else None
            ),

            "smokeTimestamp": (
                latest_smoke_sensor.timestamp
                if latest_smoke_sensor
                else None
            ),

            "seismic": (
                latest_seismic_sensor.sensor_id
                if latest_seismic_sensor
                else None
            ),

            "seismicMode": (
                latest_seismic_sensor.source
                if latest_seismic_sensor
                else None
            ),

            "seismicTimestamp": (
                latest_seismic_sensor.timestamp
                if latest_seismic_sensor
                else None
            ),

            "infrastructure": (
                latest_infrastructure_sensor.sensor_id
                if latest_infrastructure_sensor
                else None
            ),

            "infrastructureMode": (
                latest_infrastructure_sensor.source
                if latest_infrastructure_sensor
                else None
            ),

            "infrastructureTimestamp": (
                latest_infrastructure_sensor.timestamp
                if latest_infrastructure_sensor
                else None
            ),

            "crowdReports":
                "Human-verified citizen reports",

            "crowdReportsMode":
                "REAL",
        },


        # ---------------------------------------------------------------------
        # TIMESTAMP
        # ---------------------------------------------------------------------

        "timestamp":
            int(
                time.time()
                * 1000
            ),
    }


    # =========================================================================
    # MULTI-HAZARD FUSION
    # =========================================================================

    fusion_result = (
        assess_ward_hazards(
            ward_data=
                ward_response,

            verified_reports=
                verified_reports,
        )
    )


    # =========================================================================
    # LIGHTWEIGHT SUMMARY
    # =========================================================================

    hazard_summary = (
        build_hazard_summary(
            fusion_result
        )
    )


    # =========================================================================
    # BACKWARD-COMPATIBLE TOP-LEVEL FIELDS
    # =========================================================================
    #
    # Existing frontend code can continue using rainfallMm,
    # riverLevelCm, reportCount, etc.
    #
    # New frontend code can use these additional fields.

    ward_response[
        "primaryHazard"
    ] = hazard_summary[
        "primaryHazard"
    ]


    ward_response[
        "riskScore"
    ] = hazard_summary[
        "riskScore"
    ]


    ward_response[
        "riskLevel"
    ] = hazard_summary[
        "riskLevel"
    ]


    ward_response[
        "confidenceScore"
    ] = hazard_summary[
        "confidenceScore"
    ]


    ward_response[
        "confidenceLevel"
    ] = hazard_summary[
        "confidenceLevel"
    ]


    ward_response[
        "activeHazardCount"
    ] = hazard_summary[
        "activeHazardCount"
    ]


    ward_response[
        "activeHazards"
    ] = hazard_summary[
        "activeHazards"
    ]


    # =========================================================================
    # FULL MULTI-HAZARD INTELLIGENCE
    # =========================================================================

    ward_response[
        "multiHazard"
    ] = fusion_result


    return ward_response


# =============================================================================
# EMERGENCY ASSISTANT RISK ENGINE
# =============================================================================

WATCH_RAIN_MM = 30
HIGH_RAIN_MM = 60
CRITICAL_RAIN_MM = 90

WATCH_RIVER_CM = 60
HIGH_RIVER_CM = 80
CRITICAL_RIVER_CM = 95


def interpolate(
    value: float,
    input_min: float,
    input_max: float,
    output_min: float,
    output_max: float,
) -> float:

    if input_max == input_min:
        return output_max

    ratio = clamp(
        (value - input_min)
        / (input_max - input_min),
        0,
        1,
    )

    return (
        output_min
        + ratio * (output_max - output_min)
    )


def calculate_assistant_rain_score(
    rainfall_mm: float,
) -> float:

    rain = max(0, rainfall_mm)

    if rain <= 10:
        return interpolate(
            rain, 0, 10, 0, 3
        )

    if rain <= 30:
        return interpolate(
            rain, 10, 30, 3, 12
        )

    if rain <= 60:
        return interpolate(
            rain, 30, 60, 12, 28
        )

    if rain <= 90:
        return interpolate(
            rain, 60, 90, 28, 38
        )

    return 40


def calculate_assistant_river_score(
    river_level_cm: float,
) -> float:

    level = max(0, river_level_cm)

    if level <= 20:
        return 0

    if level <= 40:
        return interpolate(
            level, 20, 40, 0, 6
        )

    if level <= 60:
        return interpolate(
            level, 40, 60, 6, 16
        )

    if level <= 80:
        return interpolate(
            level, 60, 80, 16, 30
        )

    if level <= 95:
        return interpolate(
            level, 80, 95, 30, 38
        )

    return 40


def calculate_assistant_report_score(
    verified_reports: int,
) -> float:

    reports = max(0, verified_reports)

    if reports == 0:
        return 0

    if reports == 1:
        return 6

    if reports == 2:
        return 9

    if reports == 3:
        return 12

    if reports <= 5:
        return interpolate(
            reports, 3, 5, 12, 16
        )

    if reports <= 8:
        return interpolate(
            reports, 5, 8, 16, 19
        )

    return 20


def calculate_assistant_amplification(
    rainfall_mm: float,
    river_level_cm: float,
    verified_reports: int,
) -> int:

    active_signals = 0

    if rainfall_mm >= WATCH_RAIN_MM:
        active_signals += 1

    if river_level_cm >= WATCH_RIVER_CM:
        active_signals += 1

    if verified_reports > 0:
        active_signals += 1

    if active_signals == 3:
        return 10

    if active_signals == 2:
        return 5

    return 0


def calculate_assistant_risk_score(
    rainfall_mm: float,
    river_level_cm: float,
    verified_reports: int,
) -> int:

    rain_score = calculate_assistant_rain_score(
        rainfall_mm
    )

    river_score = calculate_assistant_river_score(
        river_level_cm
    )

    report_score = calculate_assistant_report_score(
        verified_reports
    )

    amplification_score = (
        calculate_assistant_amplification(
            rainfall_mm,
            river_level_cm,
            verified_reports,
        )
    )

    total = (
        rain_score
        + river_score
        + report_score
        + amplification_score
    )

    return round(min(100, total))


def assistant_risk_level(
    risk_score: int,
    rainfall_mm: float,
    river_level_cm: float,
    verified_reports: int,
) -> str:

    if risk_score >= 75:
        level = "CRITICAL"

    elif risk_score >= 55:
        level = "HIGH"

    elif risk_score >= 30:
        level = "WATCH"

    else:
        level = "NORMAL"

    if verified_reports > 0 and level == "NORMAL":
        level = "WATCH"

    if (
        rainfall_mm >= WATCH_RAIN_MM
        or river_level_cm >= WATCH_RIVER_CM
    ):
        if level == "NORMAL":
            level = "WATCH"

    if (
        rainfall_mm >= HIGH_RAIN_MM
        or river_level_cm >= HIGH_RIVER_CM
    ):
        if level in {"NORMAL", "WATCH"}:
            level = "HIGH"

    critical_physical_signal = (
        rainfall_mm >= CRITICAL_RAIN_MM
        or river_level_cm >= CRITICAL_RIVER_CM
    )

    supporting_evidence = (
        verified_reports > 0
        or (
            river_level_cm >= HIGH_RIVER_CM
            and rainfall_mm >= WATCH_RAIN_MM
        )
    )

    if (
        critical_physical_signal
        and supporting_evidence
    ):
        level = "CRITICAL"

    return level


# =============================================================================
# AUTHENTICATION
# =============================================================================

@app.post(
    "/api/auth/register",
    status_code=201,
)
def register_user(
    name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db),
):
    user = create_normal_user(
        db,
        name,
        email,
        password,
    )

    token = create_access_token(user)

    return {
        "accessToken": token,
        "tokenType": "bearer",
        "user": user_to_dict(user),
    }


@app.post("/api/auth/login")
def login_user(
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db),
):
    user = authenticate_user(
        db,
        email,
        password,
    )

    token = create_access_token(user)

    return {
        "accessToken": token,
        "tokenType": "bearer",
        "user": user_to_dict(user),
    }


@app.get("/api/auth/me")
def get_authenticated_user(
    current_user=Depends(require_user),
):
    return {
        "user": user_to_dict(current_user)
    }


# =============================================================================
# EMERGENCY ASSISTANT
# =============================================================================

@app.post("/api/assistant/chat")
def emergency_assistant_chat(
    request: EmergencyAssistantRequest,
    db: Session = Depends(get_db),
):
    message = request.message.strip()

    if not message:
        raise HTTPException(
            status_code=400,
            detail="Message is required.",
        )

    ward_id = normalize_ward(
        request.ward.strip().upper()
    )

    update_simulation()
    fetch_real_rainfall()

    ward_data = build_ward_response(
        ward_id,
        db,
    )

    verified_reports = int(
        ward_data.get(
            "verifiedReportCount",
            ward_data.get(
                "reportCount",
                0,
            ),
        )
    )

    rainfall_mm = float(
        ward_data.get("rainfallMm", 0)
    )

    river_level_cm = float(
        ward_data.get("riverLevelCm", 0)
    )

    risk_score = calculate_assistant_risk_score(
        rainfall_mm,
        river_level_cm,
        verified_reports,
    )

    risk_level = assistant_risk_level(
        risk_score,
        rainfall_mm,
        river_level_cm,
        verified_reports,
    )

    response = generate_emergency_response(
        message=message,
        ward_data=ward_data,
        risk_level=risk_level,
    )

    response["riskScore"] = risk_score
    response["dataMode"] = ward_data.get(
        "dataMode",
        "HYBRID",
    )

    response["sources"] = ward_data.get(
        "sources",
        {},
    )

    response["timestamp"] = int(
        time.time() * 1000
    )

    return response


# =============================================================================
# HEALTH
# =============================================================================

@app.get("/api/health")
def health(
    db: Session = Depends(get_db),
):
    reports_stored = (
        db.query(IncidentReport).count()
    )

    return {
        "status": "ok",
        "service": "PRAVAAH Backend",
        "version": "2.0.0",
        "database": "SQLite",
        "databaseStatus": "online",
        "wardsLoaded": len(WARD_COORDINATES),
        "reportsStored": reports_stored,
        "sensorReadingsStored": (
            db.query(SensorReading).count()
        ),
        "weatherAvailable": WEATHER_AVAILABLE,
    }


# =============================================================================
# SYSTEM STATUS
# =============================================================================

@app.get("/api/system-status")
def system_status(
    db: Session = Depends(get_db),
):
    rainfall_mode = (
        "real"
        if WEATHER_AVAILABLE
        else "simulated"
    )

    rainfall_description = (
        "Open-Meteo hourly precipitation data"
        if WEATHER_AVAILABLE
        else (
            "Open-Meteo unavailable - "
            "simulation fallback active"
        )
    )

    total_reports = db.query(
        IncidentReport
    ).count()

    pending_reports = count_reports_by_status(
        db,
        "PENDING",
    )

    verified_reports = count_reports_by_status(
        db,
        "VERIFIED",
    )

    rejected_reports = count_reports_by_status(
        db,
        "REJECTED",
    )

    return {
        "status": "operational",
        "dataMode": "HYBRID",

        "services": {
            "wardData": {
                "status": "online",
                "mode": "real",
                "description": (
                    "Real Bhubaneswar ward coordinates"
                ),
            },

            "rainfall": {
                "status": "online",
                "mode": rainfall_mode,
                "description": rainfall_description,
            },

            "riverLevel": {
                "status": "online",
                "mode": "simulated",
                "description": (
                    "IoT river-level readings where "
                    "available with simulated fallback"
                ),
            },

            "crowdReports": {
                "status": "online",
                "mode": "real",
                "description": (
                    "Human-verified citizen incident "
                    "reports with GPS and photo evidence"
                ),
            },

            "database": {
                "status": "online",
                "mode": "persistent",
                "description": (
                    "SQLite persistent incident-report database"
                ),
            },

            "authentication": {
                "status": "online",
                "mode": "JWT",
                "description": (
                    "Role-based USER and OFFICER authentication"
                ),
            },
        },

        "reports": {
            "total": total_reports,
            "pending": pending_reports,
            "verified": verified_reports,
            "rejected": rejected_reports,
        },

        "verificationPolicy": {
            "riskContribution": "VERIFIED_ONLY",
            "pendingReports": (
                "Do not affect operational risk score"
            ),
            "rejectedReports": (
                "Excluded from operational risk score"
            ),
        },

        "lastUpdated": int(time.time() * 1000),
    }


# =============================================================================
# WEATHER
# =============================================================================

@app.get("/api/weather")
def weather():
    update_simulation()
    fetch_real_rainfall()

    return {
        "provider": (
            "Open-Meteo"
            if WEATHER_AVAILABLE
            else "Simulation"
        ),

        "mode": (
            "REAL"
            if WEATHER_AVAILABLE
            else "SIMULATED"
        ),

        "available": WEATHER_AVAILABLE,

        "wards": [
            {
                "ward": ward_id,
                "rainfallMm": get_rainfall(
                    ward_id
                ),
            }
            for ward_id in WARD_COORDINATES
        ],

        "lastUpdated": (
            int(LAST_WEATHER_UPDATE * 1000)
            if LAST_WEATHER_UPDATE
            else None
        ),

        "error": WEATHER_ERROR,
    }


# =============================================================================
# ALL WARDS
# =============================================================================

@app.get("/api/wards")
def get_all_wards(
    db: Session = Depends(get_db),
):
    update_simulation()
    fetch_real_rainfall()

    return [
        build_ward_response(
            ward_id,
            db,
        )
        for ward_id in WARD_COORDINATES
    ]


# =============================================================================
# SINGLE WARD
# =============================================================================

@app.get("/api/wards/{ward_id}")
def get_ward(
    ward_id: str,
    db: Session = Depends(get_db),
):
    ward_id = normalize_ward(ward_id)

    update_simulation()
    fetch_real_rainfall()

    return build_ward_response(
        ward_id,
        db,
    )


# =============================================================================
# SUBMIT REPORT
# =============================================================================

@app.post(
    "/api/reports",
    status_code=201,
)
async def create_report(
    ward: str = Form(...),
    reportType: str = Form(...),
    severity: str = Form(...),
    description: str = Form(...),
    latitude: float | None = Form(None),
    longitude: float | None = Form(None),
    photo: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    current_user=Depends(require_user),
):
    ward_id = normalize_ward(ward)

    severity = severity.upper()

    allowed_severity = {
        "LOW",
        "MEDIUM",
        "HIGH",
        "CRITICAL",
    }

    if severity not in allowed_severity:
        raise HTTPException(
            status_code=400,
            detail=(
                "Severity must be LOW, MEDIUM, "
                "HIGH, or CRITICAL."
            ),
        )

    clean_report_type = reportType.strip()

    if len(clean_report_type) < 2:
        raise HTTPException(
            status_code=400,
            detail="Report type is required.",
        )

    clean_description = description.strip()

    if len(clean_description) < 3:
        raise HTTPException(
            status_code=400,
            detail="Description is too short.",
        )

    if (
        latitude is not None
        and not -90 <= latitude <= 90
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid latitude.",
        )

    if (
        longitude is not None
        and not -180 <= longitude <= 180
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid longitude.",
        )

    photo_url = await save_photo(photo)

    report = IncidentReport(
        id=str(uuid.uuid4()),
        reporter_user_id=current_user.id,
        ward=ward_id,
        report_type=clean_report_type,
        severity=severity,
        description=clean_description,
        latitude=latitude,
        longitude=longitude,
        photo_url=photo_url,
        status="PENDING",
        created_at=int(time.time() * 1000),
        verified_at=None,
    )

    try:
        db.add(report)

        create_notification(
            db=db,
            recipient_role="OFFICER",
            notification_type="REPORT",
            severity=severity,
            title="New Incident Report",
            message=(
                f"A {severity} severity "
                f"{clean_report_type} incident "
                f"was reported in {ward_id}."
            ),
            ward=ward_id,
            action_type="VIEW_REPORT",
            action_target=report.id,
        )

        db.commit()
        db.refresh(report)

    except Exception:
        db.rollback()

        if photo_url:
            filepath = photo_url.lstrip("/")

            if os.path.exists(filepath):
                os.remove(filepath)

        raise HTTPException(
            status_code=500,
            detail="Unable to store incident report.",
        )

    WARD_STATE[ward_id]["reportCount"] = (
        count_verified_reports(
            ward_id,
            db,
        )
    )

    return report_to_dict(report)


# =============================================================================
# ALL REPORTS
# =============================================================================

@app.get("/api/reports")
def get_reports(
    db: Session = Depends(get_db),
):
    reports = (
        db.query(IncidentReport)
        .order_by(
            IncidentReport.created_at.desc()
        )
        .all()
    )

    return [
        report_to_dict(report)
        for report in reports
    ]


# =============================================================================
# REPORTS FOR ONE WARD
# =============================================================================

@app.get("/api/reports/ward/{ward_id}")
def get_reports_for_ward(
    ward_id: str,
    db: Session = Depends(get_db),
):
    ward_id = normalize_ward(ward_id)

    reports = (
        db.query(IncidentReport)
        .filter(
            IncidentReport.ward == ward_id
        )
        .order_by(
            IncidentReport.created_at.desc()
        )
        .all()
    )

    return [
        report_to_dict(report)
        for report in reports
    ]


# =============================================================================
# SINGLE REPORT
# =============================================================================

@app.get("/api/reports/{report_id}")
def get_single_report(
    report_id: str,
    db: Session = Depends(get_db),
):
    report = (
        db.query(IncidentReport)
        .filter(
            IncidentReport.id == report_id
        )
        .first()
    )

    if report is None:
        raise HTTPException(
            status_code=404,
            detail="Report not found",
        )

    return report_to_dict(report)


# =============================================================================
# VERIFY / REJECT REPORT
# =============================================================================

@app.patch(
    "/api/reports/{report_id}/verification"
)
async def verify_report(
    report_id: str,
    status: str = Form(...),
    db: Session = Depends(get_db),
    current_officer=Depends(require_officer),
):
    status = status.upper()

    allowed_status = {
        "PENDING",
        "VERIFIED",
        "REJECTED",
    }

    if status not in allowed_status:
        raise HTTPException(
            status_code=400,
            detail=(
                "Status must be PENDING, "
                "VERIFIED, or REJECTED."
            ),
        )

    report = (
        db.query(IncidentReport)
        .filter(
            IncidentReport.id == report_id
        )
        .first()
    )

    if report is None:
        raise HTTPException(
            status_code=404,
            detail="Report not found",
        )

    previous_status = report.status
    report.status = status

    if status in {"VERIFIED", "REJECTED"}:
        report.verified_at = int(
            time.time() * 1000
        )

    else:
        report.verified_at = None

    try:
        if (
            report.reporter_user_id is not None
            and status in {
                "VERIFIED",
                "REJECTED",
            }
            and previous_status != status
        ):
            if status == "VERIFIED":
                create_notification(
                    db=db,
                    recipient_role="USER",
                    recipient_user_id=(
                        report.reporter_user_id
                    ),
                    notification_type="REPORT",
                    severity="SUCCESS",
                    title="Report Verified",
                    message=(
                        f"Your {report.report_type} "
                        f"incident report for {report.ward} "
                        f"has been verified by an officer."
                    ),
                    ward=report.ward,
                    action_type="VIEW_REPORT",
                    action_target=report.id,
                )

            elif status == "REJECTED":
                create_notification(
                    db=db,
                    recipient_role="USER",
                    recipient_user_id=(
                        report.reporter_user_id
                    ),
                    notification_type="REPORT",
                    severity="INFO",
                    title="Report Rejected",
                    message=(
                        f"Your {report.report_type} "
                        f"incident report for {report.ward} "
                        f"was reviewed and rejected."
                    ),
                    ward=report.ward,
                    action_type="VIEW_REPORT",
                    action_target=report.id,
                )

        db.commit()
        db.refresh(report)

    except Exception as error:
        db.rollback()

        print(
            "Unable to update report verification:",
            error,
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to update report "
                "verification status."
            ),
        )

    WARD_STATE[report.ward]["reportCount"] = (
        count_verified_reports(
            report.ward,
            db,
        )
    )

    return report_to_dict(report)


# =============================================================================
# MY REPORTS
# =============================================================================

@app.get("/api/my-reports")
def get_my_reports(
    db: Session = Depends(get_db),
    current_user=Depends(require_user),
):
    if getattr(
        current_user,
        "role",
        None,
    ) != "USER":
        raise HTTPException(
            status_code=403,
            detail="Citizen account required.",
        )

    reports = (
        db.query(IncidentReport)
        .filter(
            IncidentReport.reporter_user_id
            == current_user.id
        )
        .order_by(
            IncidentReport.created_at.desc()
        )
        .all()
    )

    return [
        report_to_dict(report)
        for report in reports
    ]


@app.get("/api/my-reports/{report_id}")
def get_my_report(
    report_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_user),
):
    if getattr(
        current_user,
        "role",
        None,
    ) != "USER":
        raise HTTPException(
            status_code=403,
            detail="Citizen account required.",
        )

    report = (
        db.query(IncidentReport)
        .filter(
            IncidentReport.id == report_id,
            IncidentReport.reporter_user_id
            == current_user.id,
        )
        .first()
    )

    if report is None:
        raise HTTPException(
            status_code=404,
            detail="Report not found.",
        )

    return report_to_dict(report)


# =============================================================================
# SENSOR INGESTION
# =============================================================================

@app.post(
    "/api/sensors/readings",
    status_code=201,
)
def create_sensor_reading(
    sensorId: str = Form(...),
    ward: str = Form(...),
    sensorType: str = Form(...),
    value: float = Form(...),
    unit: str = Form(...),
    latitude: float | None = Form(None),
    longitude: float | None = Form(None),
    status: str = Form("ONLINE"),
    source: str = Form("IOT"),
    db: Session = Depends(get_db),
):
    ward_id = normalize_ward(ward)

    clean_sensor_id = sensorId.strip()

    if len(clean_sensor_id) < 2:
        raise HTTPException(
            status_code=400,
            detail="sensorId is required.",
        )

    clean_sensor_type = validate_sensor_type(
        sensorType
    )

    clean_unit = unit.strip()

    if not clean_unit:
        raise HTTPException(
            status_code=400,
            detail="unit is required.",
        )

    clean_status = validate_sensor_status(
        status
    )

    clean_source = (
        source.strip().upper() or "IOT"
    )

    if (
        latitude is not None
        and not -90 <= latitude <= 90
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid latitude.",
        )

    if (
        longitude is not None
        and not -180 <= longitude <= 180
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid longitude.",
        )

    if latitude is None:
        latitude = WARD_COORDINATES[
            ward_id
        ]["latitude"]

    if longitude is None:
        longitude = WARD_COORDINATES[
            ward_id
        ]["longitude"]

    reading = SensorReading(
        id=str(uuid.uuid4()),
        sensor_id=clean_sensor_id,
        ward=ward_id,
        sensor_type=clean_sensor_type,
        value=float(value),
        unit=clean_unit,
        latitude=latitude,
        longitude=longitude,
        status=clean_status,
        source=clean_source,
        timestamp=int(time.time() * 1000),
    )

    try:
        db.add(reading)
        db.commit()
        db.refresh(reading)

    except Exception as error:
        db.rollback()

        print(
            "Unable to store sensor reading:",
            error,
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to store sensor reading.",
        )

    return sensor_to_dict(reading)


# =============================================================================
# ALL SENSOR READINGS
# =============================================================================

@app.get("/api/sensors")
def get_sensor_readings(
    db: Session = Depends(get_db),
):
    readings = (
        db.query(SensorReading)
        .order_by(
            SensorReading.timestamp.desc()
        )
        .all()
    )

    return [
        sensor_to_dict(reading)
        for reading in readings
    ]


# =============================================================================
# LATEST SENSOR READINGS
# =============================================================================

@app.get("/api/sensors/latest")
def get_latest_sensor_readings(
    db: Session = Depends(get_db),
):
    readings = (
        db.query(SensorReading)
        .order_by(
            SensorReading.timestamp.desc()
        )
        .all()
    )

    latest = {}

    for reading in readings:
        key = (
            reading.ward,
            reading.sensor_type,
        )

        if key not in latest:
            latest[key] = reading

    return [
        sensor_to_dict(reading)
        for reading in latest.values()
    ]


# =============================================================================
# SENSOR READINGS FOR ONE WARD
# =============================================================================

@app.get("/api/sensors/ward/{ward_id}")
def get_sensor_readings_for_ward(
    ward_id: str,
    db: Session = Depends(get_db),
):
    ward_id = normalize_ward(ward_id)

    readings = (
        db.query(SensorReading)
        .filter(
            SensorReading.ward == ward_id
        )
        .order_by(
            SensorReading.timestamp.desc()
        )
        .all()
    )

    return [
        sensor_to_dict(reading)
        for reading in readings
    ]


# =============================================================================
# NOTIFICATIONS
# =============================================================================

@app.get("/api/notifications")
def get_notifications(
    db: Session = Depends(get_db),
    current_user=Depends(require_user),
):
    user_id = getattr(
        current_user,
        "id",
        None,
    )

    user_role = getattr(
        current_user,
        "role",
        "USER",
    )

    notifications = (
        db.query(Notification)
        .filter(
            Notification.recipient_role.in_(
                [
                    user_role,
                    "ALL",
                ]
            ),
            (
                (Notification.recipient_user_id == None)
                |
                (Notification.recipient_user_id == user_id)
            ),
        )
        .order_by(
            Notification.created_at.desc()
        )
        .limit(50)
        .all()
    )

    return [
        notification_to_dict(notification)
        for notification in notifications
    ]


# =============================================================================
# UNREAD NOTIFICATION COUNT
# =============================================================================

@app.get("/api/notifications/unread-count")
def get_notification_unread_count(
    db: Session = Depends(get_db),
    current_user=Depends(require_user),
):
    user_id = getattr(
        current_user,
        "id",
        None,
    )

    user_role = getattr(
        current_user,
        "role",
        "USER",
    )

    count = (
        db.query(Notification)
        .filter(
            Notification.recipient_role.in_(
                [
                    user_role,
                    "ALL",
                ]
            ),
            (
                (Notification.recipient_user_id == None)
                |
                (Notification.recipient_user_id == user_id)
            ),
            Notification.is_read == 0,
        )
        .count()
    )

    return {"count": count}


# =============================================================================
# MARK ONE NOTIFICATION AS READ
# =============================================================================

@app.patch(
    "/api/notifications/{notification_id}/read"
)
def mark_notification_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_user),
):
    user_id = getattr(
        current_user,
        "id",
        None,
    )

    user_role = getattr(
        current_user,
        "role",
        "USER",
    )

    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id
        )
        .first()
    )

    if notification is None:
        raise HTTPException(
            status_code=404,
            detail="Notification not found.",
        )

    if notification.recipient_role not in {
        user_role,
        "ALL",
    }:
        raise HTTPException(
            status_code=403,
            detail=(
                "You cannot access this notification."
            ),
        )

    if (
        notification.recipient_user_id
        is not None
        and notification.recipient_user_id
        != user_id
    ):
        raise HTTPException(
            status_code=403,
            detail=(
                "You cannot access this notification."
            ),
        )

    notification.is_read = 1
    notification.read_at = int(
        time.time() * 1000
    )

    try:
        db.commit()
        db.refresh(notification)

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Unable to update notification.",
        )

    return notification_to_dict(notification)


# =============================================================================
# MARK ALL NOTIFICATIONS AS READ
# =============================================================================

@app.patch("/api/notifications/read-all")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user=Depends(require_user),
):
    user_id = getattr(
        current_user,
        "id",
        None,
    )

    user_role = getattr(
        current_user,
        "role",
        "USER",
    )

    notifications = (
        db.query(Notification)
        .filter(
            Notification.recipient_role.in_(
                [
                    user_role,
                    "ALL",
                ]
            ),
            (
                (Notification.recipient_user_id == None)
                |
                (Notification.recipient_user_id == user_id)
            ),
            Notification.is_read == 0,
        )
        .all()
    )

    now = int(time.time() * 1000)

    for notification in notifications:
        notification.is_read = 1
        notification.read_at = now

    try:
        db.commit()

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Unable to update notifications.",
        )

    return {
        "updated": len(notifications)
    }