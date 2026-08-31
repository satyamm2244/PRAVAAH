"""
PRAVAAH Multi-Hazard Risk Fusion Engine
=======================================

This module converts environmental observations, sensor readings,
and verified citizen reports into explainable ward-level hazard
assessments.

Supported hazards:

1. FLOOD
2. SEVERE_WEATHER
3. FIRE
4. SEISMIC
5. INFRASTRUCTURE

The engine deliberately separates:

    RISK
        How dangerous current conditions appear.

    CONFIDENCE
        How strongly the available evidence supports that assessment.

This distinction is important for uncertainty-aware early warning.

The engine has no FastAPI or SQLAlchemy dependency so it can be
tested independently and reused by the API, assistant, simulator,
alert generation system, and future prediction services.
"""

from __future__ import annotations

import time
from typing import Any


# =============================================================================
# HAZARD TYPES
# =============================================================================

HAZARD_TYPES = {
    "FLOOD",
    "SEVERE_WEATHER",
    "FIRE",
    "SEISMIC",
    "INFRASTRUCTURE",
}


# =============================================================================
# RISK LEVELS
# =============================================================================

RISK_LEVELS = {
    "NORMAL",
    "WATCH",
    "HIGH",
    "CRITICAL",
}


# =============================================================================
# SOURCE MODES
# =============================================================================

REAL_SOURCE_MODES = {
    "REAL",
    "IOT",
    "VERIFIED",
    "OFFICIAL",
    "API",
}


SIMULATED_SOURCE_MODES = {
    "SIMULATED",
    "FALLBACK",
    "MODELLED",
    "MODELED",
}


# =============================================================================
# CONSTANTS
# =============================================================================

MILLISECONDS_PER_MINUTE = 60_000

FRESH_DATA_MINUTES = 10
AGING_DATA_MINUTES = 30
STALE_DATA_MINUTES = 60


# =============================================================================
# FLOOD THRESHOLDS
# =============================================================================

WATCH_RAIN_MM = 30
HIGH_RAIN_MM = 60
CRITICAL_RAIN_MM = 90

WATCH_RIVER_CM = 60
HIGH_RIVER_CM = 80
CRITICAL_RIVER_CM = 95


# =============================================================================
# SEVERE WEATHER THRESHOLDS
# =============================================================================

WATCH_WIND_KMH = 35
HIGH_WIND_KMH = 55
CRITICAL_WIND_KMH = 75


# =============================================================================
# FIRE THRESHOLDS
# =============================================================================

WATCH_FIRE_INDEX = 30
HIGH_FIRE_INDEX = 60
CRITICAL_FIRE_INDEX = 80


# =============================================================================
# SEISMIC THRESHOLDS
#
# Uses a simplified local-intensity style 0-10 input for the prototype.
# It is NOT represented as earthquake magnitude.
# =============================================================================

WATCH_SEISMIC_INTENSITY = 3
HIGH_SEISMIC_INTENSITY = 5
CRITICAL_SEISMIC_INTENSITY = 7


# =============================================================================
# INFRASTRUCTURE THRESHOLDS
#
# Infrastructure stress is represented on a normalized 0-100 scale.
# =============================================================================

WATCH_INFRASTRUCTURE_STRESS = 30
HIGH_INFRASTRUCTURE_STRESS = 60
CRITICAL_INFRASTRUCTURE_STRESS = 80


# =============================================================================
# GENERIC HELPERS
# =============================================================================

def clamp(
    value: float,
    minimum: float,
    maximum: float,
) -> float:
    return max(
        minimum,
        min(
            maximum,
            value,
        ),
    )


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
        (
            value
            - input_min
        )
        /
        (
            input_max
            - input_min
        ),
        0,
        1,
    )

    return (
        output_min
        + ratio
        * (
            output_max
            - output_min
        )
    )


def safe_float(
    value: Any,
    default: float = 0,
) -> float:

    try:
        if value is None:
            return default

        return float(value)

    except (
        TypeError,
        ValueError,
    ):
        return default


def safe_int(
    value: Any,
    default: int = 0,
) -> int:

    try:
        if value is None:
            return default

        return int(value)

    except (
        TypeError,
        ValueError,
    ):
        return default


def now_ms() -> int:
    return int(
        time.time()
        * 1000
    )


# =============================================================================
# RISK LEVEL
# =============================================================================

def risk_level_from_score(
    score: int,
) -> str:

    if score >= 75:
        return "CRITICAL"

    if score >= 55:
        return "HIGH"

    if score >= 30:
        return "WATCH"

    return "NORMAL"


# =============================================================================
# CONFIDENCE LEVEL
# =============================================================================

def confidence_level_from_score(
    score: int,
) -> str:

    if score >= 80:
        return "HIGH"

    if score >= 55:
        return "MEDIUM"

    return "LOW"


# =============================================================================
# SOURCE FRESHNESS
# =============================================================================

def calculate_freshness(
    timestamp: int | None,
    current_time: int | None = None,
) -> dict[str, Any]:

    if current_time is None:
        current_time = now_ms()

    if timestamp is None:
        return {
            "ageMinutes": None,
            "status": "UNKNOWN",
            "score": 45,
        }

    age_ms = max(
        0,
        current_time
        - timestamp,
    )

    age_minutes = (
        age_ms
        / MILLISECONDS_PER_MINUTE
    )

    if age_minutes <= FRESH_DATA_MINUTES:
        status = "FRESH"
        score = 100

    elif age_minutes <= AGING_DATA_MINUTES:
        status = "AGING"
        score = 80

    elif age_minutes <= STALE_DATA_MINUTES:
        status = "STALE"
        score = 50

    else:
        status = "VERY_STALE"
        score = 20

    return {
        "ageMinutes": round(
            age_minutes,
            1,
        ),
        "status": status,
        "score": score,
    }


# =============================================================================
# SOURCE RELIABILITY
# =============================================================================

def source_reliability_score(
    mode: str | None,
) -> int:

    clean_mode = (
        mode
        or ""
    ).strip().upper()

    if clean_mode in REAL_SOURCE_MODES:
        return 95

    if clean_mode in SIMULATED_SOURCE_MODES:
        return 45

    return 60


# =============================================================================
# REPORT NORMALIZATION
# =============================================================================

def normalize_report_text(
    value: Any,
) -> str:

    return (
        str(
            value
            or ""
        )
        .strip()
        .lower()
        .replace(
            "_",
            " ",
        )
        .replace(
            "-",
            " ",
        )
    )


# =============================================================================
# REPORT -> HAZARD CLASSIFICATION
# =============================================================================

def classify_report_hazard(
    report: dict[str, Any],
) -> str | None:

    report_type = normalize_report_text(
        report.get(
            "reportType",
            report.get(
                "report_type",
                "",
            ),
        )
    )

    description = normalize_report_text(
        report.get(
            "description",
            "",
        )
    )

    text = (
        report_type
        + " "
        + description
    )


    flood_keywords = {
        "flood",
        "flooding",
        "waterlogging",
        "water logged",
        "water level",
        "river",
        "drain overflow",
        "road underwater",
        "water entering",
    }

    fire_keywords = {
        "fire",
        "smoke",
        "burning",
        "flame",
        "explosion",
        "gas leak",
        "forest fire",
        "building fire",
    }

    seismic_keywords = {
        "earthquake",
        "earth quake",
        "seismic",
        "tremor",
        "ground shaking",
        "aftershock",
    }

    infrastructure_keywords = {
        "building collapse",
        "collapsed building",
        "wall collapse",
        "bridge damage",
        "road damage",
        "road crack",
        "sinkhole",
        "electric pole",
        "power line",
        "transformer",
        "drain damage",
        "infrastructure",
        "structural damage",
    }

    weather_keywords = {
        "cyclone",
        "storm",
        "heavy rain",
        "strong wind",
        "high wind",
        "lightning",
        "hail",
        "heatwave",
        "heat wave",
        "thunderstorm",
    }


    for keyword in fire_keywords:
        if keyword in text:
            return "FIRE"

    for keyword in seismic_keywords:
        if keyword in text:
            return "SEISMIC"

    for keyword in infrastructure_keywords:
        if keyword in text:
            return "INFRASTRUCTURE"

    for keyword in flood_keywords:
        if keyword in text:
            return "FLOOD"

    for keyword in weather_keywords:
        if keyword in text:
            return "SEVERE_WEATHER"

    return None


# =============================================================================
# REPORT SEVERITY
# =============================================================================

def report_severity_weight(
    severity: str | None,
) -> float:

    clean = (
        severity
        or ""
    ).strip().upper()

    weights = {
        "LOW": 0.35,
        "MEDIUM": 0.55,
        "HIGH": 0.8,
        "CRITICAL": 1.0,
    }

    return weights.get(
        clean,
        0.5,
    )


# =============================================================================
# VERIFIED REPORT FILTER
# =============================================================================

def verified_reports_for_hazard(
    reports: list[dict[str, Any]],
    hazard_type: str,
) -> list[dict[str, Any]]:

    result = []

    for report in reports:

        status = (
            str(
                report.get(
                    "status",
                    "",
                )
            )
            .strip()
            .upper()
        )

        if status != "VERIFIED":
            continue

        detected_hazard = (
            classify_report_hazard(
                report
            )
        )

        if (
            detected_hazard
            == hazard_type
        ):
            result.append(
                report
            )

    return result


# =============================================================================
# REPORT RISK CONTRIBUTION
# =============================================================================

def calculate_report_risk(
    reports: list[dict[str, Any]],
) -> int:

    if not reports:
        return 0

    total = 0.0

    for report in reports:

        severity = (
            report.get(
                "severity",
                "MEDIUM",
            )
        )

        total += (
            12
            * report_severity_weight(
                severity
            )
        )

    count_bonus = min(
        12,
        max(
            0,
            len(reports)
            - 1,
        )
        * 3,
    )

    total += count_bonus

    return round(
        min(
            30,
            total,
        )
    )


# =============================================================================
# REPORT EVIDENCE
# =============================================================================

def build_report_evidence(
    reports: list[dict[str, Any]],
    hazard_type: str,
) -> list[dict[str, Any]]:

    if not reports:
        return []

    highest_severity = "LOW"

    severity_rank = {
        "LOW": 1,
        "MEDIUM": 2,
        "HIGH": 3,
        "CRITICAL": 4,
    }

    for report in reports:

        severity = (
            str(
                report.get(
                    "severity",
                    "LOW",
                )
            )
            .strip()
            .upper()
        )

        if (
            severity_rank.get(
                severity,
                0,
            )
            >
            severity_rank.get(
                highest_severity,
                0,
            )
        ):
            highest_severity = severity

    return [
        {
            "sourceType":
                "CITIZEN_REPORT",

            "sourceName":
                "Verified citizen reports",

            "mode":
                "VERIFIED",

            "hazardType":
                hazard_type,

            "value":
                len(reports),

            "unit":
                "reports",

            "severity":
                highest_severity,

            "description":
                (
                    f"{len(reports)} verified citizen "
                    f"report(s) support this assessment."
                ),

            "freshness":
                {
                    "status":
                        "AVAILABLE",

                    "ageMinutes":
                        None,
                },

            "reliabilityScore":
                90,
        }
    ]


# =============================================================================
# FLOOD SCORE
# =============================================================================

def flood_rain_score(
    rainfall_mm: float,
) -> float:

    rain = max(
        0,
        rainfall_mm,
    )

    if rain <= 10:
        return interpolate(
            rain,
            0,
            10,
            0,
            3,
        )

    if rain <= 30:
        return interpolate(
            rain,
            10,
            30,
            3,
            12,
        )

    if rain <= 60:
        return interpolate(
            rain,
            30,
            60,
            12,
            28,
        )

    if rain <= 90:
        return interpolate(
            rain,
            60,
            90,
            28,
            38,
        )

    return 40


def flood_river_score(
    river_level_cm: float,
) -> float:

    level = max(
        0,
        river_level_cm,
    )

    if level <= 20:
        return 0

    if level <= 40:
        return interpolate(
            level,
            20,
            40,
            0,
            6,
        )

    if level <= 60:
        return interpolate(
            level,
            40,
            60,
            6,
            16,
        )

    if level <= 80:
        return interpolate(
            level,
            60,
            80,
            16,
            30,
        )

    if level <= 95:
        return interpolate(
            level,
            80,
            95,
            30,
            38,
        )

    return 40


# =============================================================================
# ACTION LIBRARY
# =============================================================================

CITIZEN_ACTIONS = {

    "FLOOD": [
        "Avoid flooded roads, underpasses, open drains, and riverbanks.",
        "Move essential documents, medicines, and valuables to a higher level.",
        "Keep your phone charged and prepare for evacuation if conditions worsen.",
        "Do not walk or drive through moving floodwater.",
    ],

    "SEVERE_WEATHER": [
        "Stay indoors where possible and avoid unnecessary travel.",
        "Stay away from trees, weak structures, electric poles, and exposed areas.",
        "Secure loose outdoor objects that may become dangerous in strong winds.",
        "Monitor official weather and emergency alerts.",
    ],

    "FIRE": [
        "Move away from smoke, flames, gas cylinders, and electrical hazards.",
        "Do not re-enter an affected building after evacuation.",
        "Use stairs instead of lifts during a building evacuation.",
        "Contact official fire and emergency services for an active fire.",
    ],

    "SEISMIC": [
        "Drop, cover, and hold during strong ground shaking.",
        "Move away from windows, glass, shelves, and unstable objects.",
        "After shaking stops, leave damaged structures carefully if necessary.",
        "Expect possible aftershocks and follow official instructions.",
    ],

    "INFRASTRUCTURE": [
        "Stay away from damaged buildings, bridges, roads, poles, walls, and drains.",
        "Do not enter structures showing cracks, collapse, or visible instability.",
        "Avoid touching fallen electrical equipment or exposed wires.",
        "Follow diversion, evacuation, or closure instructions issued by authorities.",
    ],
}


OFFICER_ACTIONS = {

    "FLOOD": [
        "Inspect drainage bottlenecks and reported waterlogging locations.",
        "Monitor river and rainfall observations for rapid escalation.",
        "Prepare evacuation support for vulnerable low-lying locations.",
        "Coordinate road closures where water depth creates unsafe conditions.",
    ],

    "SEVERE_WEATHER": [
        "Monitor official weather observations and high-wind conditions.",
        "Inspect vulnerable trees, temporary structures, and electrical infrastructure.",
        "Prepare emergency response teams for weather-related incidents.",
        "Issue targeted travel or shelter guidance when thresholds escalate.",
    ],

    "FIRE": [
        "Verify the reported fire location and dispatch the appropriate response team.",
        "Establish a safe exclusion zone around the affected location.",
        "Assess nearby buildings and infrastructure for propagation risk.",
        "Coordinate evacuation when smoke or fire threatens populated areas.",
    ],

    "SEISMIC": [
        "Verify seismic observations through authoritative sources.",
        "Prioritize inspection of critical infrastructure and vulnerable structures.",
        "Prepare search-and-rescue resources for confirmed structural damage.",
        "Restrict access to unsafe or damaged areas.",
    ],

    "INFRASTRUCTURE": [
        "Verify reported structural or infrastructure damage.",
        "Restrict access to unsafe buildings, roads, bridges, poles, or drains.",
        "Dispatch the appropriate engineering or utility inspection team.",
        "Escalate evacuation or closure actions when structural failure is possible.",
    ],
}


# =============================================================================
# AFFECTED AREA
# =============================================================================

def build_affected_area(
    ward: str,
    risk_level: str,
) -> dict[str, Any]:

    return {
        "primaryWard":
            ward,

        "scope":
            (
                "WARD_AND_NEARBY"
                if risk_level
                in {
                    "HIGH",
                    "CRITICAL",
                }
                else "WARD"
            ),

        "description":
            (
                f"{ward} and potentially nearby vulnerable areas"
                if risk_level
                in {
                    "HIGH",
                    "CRITICAL",
                }
                else f"{ward}"
            ),
    }


# =============================================================================
# CONFIDENCE ENGINE
# =============================================================================

def calculate_confidence(
    evidence: list[dict[str, Any]],
) -> tuple[int, str]:

    if not evidence:
        return (
            20,
            "LOW",
        )

    reliability_scores = []

    freshness_scores = []

    source_types = set()


    for item in evidence:

        source_type = (
            str(
                item.get(
                    "sourceType",
                    "UNKNOWN",
                )
            )
            .strip()
            .upper()
        )

        source_types.add(
            source_type
        )


        reliability = safe_int(
            item.get(
                "reliabilityScore",
                60,
            ),
            60,
        )

        reliability_scores.append(
            clamp(
                reliability,
                0,
                100,
            )
        )


        freshness = (
            item.get(
                "freshness",
                {},
            )
            or {}
        )

        freshness_status = (
            str(
                freshness.get(
                    "status",
                    "UNKNOWN",
                )
            )
            .strip()
            .upper()
        )

        freshness_map = {
            "FRESH": 100,
            "AVAILABLE": 90,
            "AGING": 80,
            "STALE": 50,
            "VERY_STALE": 20,
            "UNKNOWN": 45,
        }

        freshness_scores.append(
            freshness_map.get(
                freshness_status,
                45,
            )
        )


    reliability_average = (
        sum(
            reliability_scores
        )
        /
        len(
            reliability_scores
        )
    )

    freshness_average = (
        sum(
            freshness_scores
        )
        /
        len(
            freshness_scores
        )
    )


    independent_source_bonus = min(
        20,
        max(
            0,
            len(
                source_types
            )
            - 1,
        )
        * 10,
    )


    evidence_volume_bonus = min(
        10,
        max(
            0,
            len(
                evidence
            )
            - 1,
        )
        * 5,
    )


    score = (
        reliability_average
        * 0.55
        +
        freshness_average
        * 0.30
        +
        independent_source_bonus
        +
        evidence_volume_bonus
    )


    score = round(
        clamp(
            score,
            0,
            100,
        )
    )


    return (
        score,
        confidence_level_from_score(
            score
        ),
    )


# =============================================================================
# RAIN EVIDENCE
# =============================================================================

def build_rain_evidence(
    ward_data: dict[str, Any],
) -> dict[str, Any]:

    rainfall = safe_float(
        ward_data.get(
            "rainfallMm",
            0,
        )
    )

    sources = (
        ward_data.get(
            "sources",
            {},
        )
        or {}
    )

    mode = (
        sources.get(
            "rainfallMode",
            "UNKNOWN",
        )
    )

    return {
        "sourceType":
            "WEATHER",

        "sourceName":
            sources.get(
                "rainfall",
                "Weather observation",
            ),

        "mode":
            mode,

        "value":
            rainfall,

        "unit":
            "mm",

        "description":
            (
                f"Rainfall observation is {rainfall:.1f} mm."
            ),

        "freshness":
            {
                "status":
                    "FRESH",

                "ageMinutes":
                    0,
            },

        "reliabilityScore":
            source_reliability_score(
                mode
            ),
    }


# =============================================================================
# RIVER EVIDENCE
# =============================================================================

def build_river_evidence(
    ward_data: dict[str, Any],
) -> dict[str, Any]:

    river_level = safe_float(
        ward_data.get(
            "riverLevelCm",
            0,
        )
    )

    sources = (
        ward_data.get(
            "sources",
            {},
        )
        or {}
    )

    mode = (
        sources.get(
            "riverLevelMode",
            "UNKNOWN",
        )
    )

    timestamp = (
        sources.get(
            "riverLevelTimestamp"
        )
    )

    freshness = (
        calculate_freshness(
            safe_int(
                timestamp,
                0,
            )
            if timestamp
            is not None
            else None
        )
    )

    return {
        "sourceType":
            "RIVER_SENSOR",

        "sourceName":
            sources.get(
                "riverLevel",
                "River observation",
            ),

        "mode":
            mode,

        "value":
            river_level,

        "unit":
            "cm",

        "description":
            (
                f"River-level observation is {river_level:.1f} cm."
            ),

        "freshness":
            freshness,

        "reliabilityScore":
            source_reliability_score(
                mode
            ),
    }


# =============================================================================
# OPTIONAL OBSERVATION EVIDENCE
# =============================================================================

def optional_observation_evidence(
    source_type: str,
    source_name: str,
    mode: str,
    value: float,
    unit: str,
    timestamp: int | None,
    description: str,
) -> dict[str, Any]:

    return {
        "sourceType":
            source_type,

        "sourceName":
            source_name,

        "mode":
            mode,

        "value":
            value,

        "unit":
            unit,

        "description":
            description,

        "freshness":
            calculate_freshness(
                timestamp
            ),

        "reliabilityScore":
            source_reliability_score(
                mode
            ),
    }


# =============================================================================
# FLOOD ASSESSMENT
# =============================================================================

def assess_flood(
    ward_data: dict[str, Any],
    reports: list[dict[str, Any]],
) -> dict[str, Any]:

    ward = str(
        ward_data.get(
            "ward",
            "UNKNOWN",
        )
    )

    rainfall = safe_float(
        ward_data.get(
            "rainfallMm",
            0,
        )
    )

    river_level = safe_float(
        ward_data.get(
            "riverLevelCm",
            0,
        )
    )


    hazard_reports = (
        verified_reports_for_hazard(
            reports,
            "FLOOD",
        )
    )


    rain_score = flood_rain_score(
        rainfall
    )

    river_score = flood_river_score(
        river_level
    )

    report_score = calculate_report_risk(
        hazard_reports
    )


    active_signals = 0

    if rainfall >= WATCH_RAIN_MM:
        active_signals += 1

    if river_level >= WATCH_RIVER_CM:
        active_signals += 1

    if hazard_reports:
        active_signals += 1


    if active_signals >= 3:
        amplification = 10

    elif active_signals == 2:
        amplification = 5

    else:
        amplification = 0


    risk_score = round(
        min(
            100,
            rain_score
            + river_score
            + report_score
            + amplification,
        )
    )


    risk_level = (
        risk_level_from_score(
            risk_score
        )
    )


    if (
        hazard_reports
        and risk_level
        == "NORMAL"
    ):
        risk_level = "WATCH"


    if (
        rainfall
        >= WATCH_RAIN_MM
        or river_level
        >= WATCH_RIVER_CM
    ):
        if risk_level == "NORMAL":
            risk_level = "WATCH"


    if (
        rainfall
        >= HIGH_RAIN_MM
        or river_level
        >= HIGH_RIVER_CM
    ):
        if risk_level in {
            "NORMAL",
            "WATCH",
        }:
            risk_level = "HIGH"


    critical_physical_signal = (
        rainfall
        >= CRITICAL_RAIN_MM
        or river_level
        >= CRITICAL_RIVER_CM
    )


    supporting_evidence = (
        bool(
            hazard_reports
        )
        or (
            river_level
            >= HIGH_RIVER_CM
            and rainfall
            >= WATCH_RAIN_MM
        )
    )


    if (
        critical_physical_signal
        and supporting_evidence
    ):
        risk_level = "CRITICAL"

        risk_score = max(
            risk_score,
            75,
        )


    evidence = [
        build_rain_evidence(
            ward_data
        ),
        build_river_evidence(
            ward_data
        ),
    ]

    evidence.extend(
        build_report_evidence(
            hazard_reports,
            "FLOOD",
        )
    )


    confidence_score, confidence_level = (
        calculate_confidence(
            evidence
        )
    )


    return build_assessment(
        ward=ward,
        hazard_type="FLOOD",
        risk_score=risk_score,
        risk_level=risk_level,
        confidence_score=confidence_score,
        confidence_level=confidence_level,
        evidence=evidence,
    )


# =============================================================================
# SEVERE WEATHER ASSESSMENT
# =============================================================================

def assess_severe_weather(
    ward_data: dict[str, Any],
    reports: list[dict[str, Any]],
) -> dict[str, Any]:

    ward = str(
        ward_data.get(
            "ward",
            "UNKNOWN",
        )
    )

    rainfall = safe_float(
        ward_data.get(
            "rainfallMm",
            0,
        )
    )

    wind_speed = safe_float(
        ward_data.get(
            "windSpeedKmh",
            0,
        )
    )


    hazard_reports = (
        verified_reports_for_hazard(
            reports,
            "SEVERE_WEATHER",
        )
    )


    rain_component = interpolate(
        rainfall,
        0,
        100,
        0,
        35,
    )


    wind_component = interpolate(
        wind_speed,
        0,
        100,
        0,
        45,
    )


    report_component = (
        calculate_report_risk(
            hazard_reports
        )
    )


    risk_score = round(
        min(
            100,
            rain_component
            + wind_component
            + report_component,
        )
    )


    risk_level = (
        risk_level_from_score(
            risk_score
        )
    )


    if (
        wind_speed
        >= CRITICAL_WIND_KMH
        and hazard_reports
    ):
        risk_level = "CRITICAL"

        risk_score = max(
            risk_score,
            75,
        )

    elif (
        wind_speed
        >= HIGH_WIND_KMH
    ):
        risk_level = max_risk_level(
            risk_level,
            "HIGH",
        )

    elif (
        wind_speed
        >= WATCH_WIND_KMH
        or hazard_reports
    ):
        risk_level = max_risk_level(
            risk_level,
            "WATCH",
        )


    evidence = [
        build_rain_evidence(
            ward_data
        )
    ]


    if ward_data.get("windSpeedKmh") is not None:

        evidence.append(
            optional_observation_evidence(
                source_type="WEATHER",
                source_name=(
                    (ward_data.get("sources") or {}).get(
                        "windSpeed",
                        "Weather wind observation",
                    )
                ),
                mode=(
                    (ward_data.get("sources") or {}).get(
                        "windSpeedMode",
                        "UNKNOWN",
                    )
                ),
                value=wind_speed,
                unit="km/h",
                timestamp=(
                    (ward_data.get("sources") or {}).get(
                        "windSpeedTimestamp"
                    )
                ),
                description=(
                    f"Wind-speed observation is "
                    f"{wind_speed:.1f} km/h."
                ),
            )
        )


    evidence.extend(
        build_report_evidence(
            hazard_reports,
            "SEVERE_WEATHER",
        )
    )


    confidence_score, confidence_level = (
        calculate_confidence(
            evidence
        )
    )


    return build_assessment(
        ward=ward,
        hazard_type="SEVERE_WEATHER",
        risk_score=risk_score,
        risk_level=risk_level,
        confidence_score=confidence_score,
        confidence_level=confidence_level,
        evidence=evidence,
    )


# =============================================================================
# FIRE ASSESSMENT
# =============================================================================

def assess_fire(
    ward_data: dict[str, Any],
    reports: list[dict[str, Any]],
) -> dict[str, Any]:

    ward = str(
        ward_data.get(
            "ward",
            "UNKNOWN",
        )
    )


    fire_index = safe_float(
        ward_data.get(
            "fireRiskIndex",
            0,
        )
    )


    smoke_level = safe_float(
        ward_data.get(
            "smokeLevel",
            0,
        )
    )


    hazard_reports = (
        verified_reports_for_hazard(
            reports,
            "FIRE",
        )
    )


    index_component = interpolate(
        fire_index,
        0,
        100,
        0,
        60,
    )


    smoke_component = interpolate(
        smoke_level,
        0,
        100,
        0,
        20,
    )


    report_component = (
        calculate_report_risk(
            hazard_reports
        )
    )


    risk_score = round(
        min(
            100,
            index_component
            + smoke_component
            + report_component,
        )
    )


    risk_level = (
        risk_level_from_score(
            risk_score
        )
    )


    if (
        fire_index
        >= CRITICAL_FIRE_INDEX
        and hazard_reports
    ):
        risk_level = "CRITICAL"

        risk_score = max(
            risk_score,
            75,
        )

    elif (
        fire_index
        >= HIGH_FIRE_INDEX
    ):
        risk_level = max_risk_level(
            risk_level,
            "HIGH",
        )

    elif (
        fire_index
        >= WATCH_FIRE_INDEX
        or hazard_reports
    ):
        risk_level = max_risk_level(
            risk_level,
            "WATCH",
        )


    evidence = []


    if ward_data.get("fireRiskIndex") is not None:

        evidence.append(
            optional_observation_evidence(
                source_type="FIRE_SENSOR",
                source_name=(
                    (ward_data.get("sources") or {}).get(
                        "fireRisk",
                        "Fire-risk observation",
                    )
                ),
                mode=(
                    (ward_data.get("sources") or {}).get(
                        "fireRiskMode",
                        "UNKNOWN",
                    )
                ),
                value=fire_index,
                unit="index",
                timestamp=(
                    (ward_data.get("sources") or {}).get(
                        "fireRiskTimestamp"
                    )
                ),
                description=(
                    f"Fire-risk index is "
                    f"{fire_index:.1f}/100."
                ),
            )
        )


    if ward_data.get("smokeLevel") is not None:

        evidence.append(
            optional_observation_evidence(
                source_type="SMOKE_SENSOR",
                source_name=(
                    (ward_data.get("sources") or {}).get(
                        "smoke",
                        "Smoke observation",
                    )
                ),
                mode=(
                    (ward_data.get("sources") or {}).get(
                        "smokeMode",
                        "UNKNOWN",
                    )
                ),
                value=smoke_level,
                unit="index",
                timestamp=(
                    (ward_data.get("sources") or {}).get(
                        "smokeTimestamp"
                    )
                ),
                description=(
                    f"Smoke observation is "
                    f"{smoke_level:.1f}."
                ),
            )
        )


    evidence.extend(
        build_report_evidence(
            hazard_reports,
            "FIRE",
        )
    )


    confidence_score, confidence_level = (
        calculate_confidence(
            evidence
        )
    )


    return build_assessment(
        ward=ward,
        hazard_type="FIRE",
        risk_score=risk_score,
        risk_level=risk_level,
        confidence_score=confidence_score,
        confidence_level=confidence_level,
        evidence=evidence,
    )


# =============================================================================
# SEISMIC ASSESSMENT
# =============================================================================

def assess_seismic(
    ward_data: dict[str, Any],
    reports: list[dict[str, Any]],
) -> dict[str, Any]:

    ward = str(
        ward_data.get(
            "ward",
            "UNKNOWN",
        )
    )


    intensity = safe_float(
        ward_data.get(
            "seismicIntensity",
            0,
        )
    )


    hazard_reports = (
        verified_reports_for_hazard(
            reports,
            "SEISMIC",
        )
    )


    physical_component = interpolate(
        intensity,
        0,
        10,
        0,
        75,
    )


    report_component = (
        calculate_report_risk(
            hazard_reports
        )
    )


    risk_score = round(
        min(
            100,
            physical_component
            + report_component,
        )
    )


    risk_level = (
        risk_level_from_score(
            risk_score
        )
    )


    if (
        intensity
        >= CRITICAL_SEISMIC_INTENSITY
        and hazard_reports
    ):
        risk_level = "CRITICAL"

        risk_score = max(
            risk_score,
            75,
        )

    elif (
        intensity
        >= HIGH_SEISMIC_INTENSITY
    ):
        risk_level = max_risk_level(
            risk_level,
            "HIGH",
        )

    elif (
        intensity
        >= WATCH_SEISMIC_INTENSITY
        or hazard_reports
    ):
        risk_level = max_risk_level(
            risk_level,
            "WATCH",
        )


    evidence = []


    if ward_data.get("seismicIntensity") is not None:

        evidence.append(
            optional_observation_evidence(
                source_type="SEISMIC_SENSOR",
                source_name=(
                    (ward_data.get("sources") or {}).get(
                        "seismic",
                        "Seismic observation",
                    )
                ),
                mode=(
                    (ward_data.get("sources") or {}).get(
                        "seismicMode",
                        "UNKNOWN",
                    )
                ),
                value=intensity,
                unit="local-intensity-index",
                timestamp=(
                    (ward_data.get("sources") or {}).get(
                        "seismicTimestamp"
                    )
                ),
                description=(
                    f"Local seismic intensity "
                    f"is {intensity:.1f}/10."
                ),
            )
        )


    evidence.extend(
        build_report_evidence(
            hazard_reports,
            "SEISMIC",
        )
    )


    confidence_score, confidence_level = (
        calculate_confidence(
            evidence
        )
    )


    return build_assessment(
        ward=ward,
        hazard_type="SEISMIC",
        risk_score=risk_score,
        risk_level=risk_level,
        confidence_score=confidence_score,
        confidence_level=confidence_level,
        evidence=evidence,
    )


# =============================================================================
# INFRASTRUCTURE ASSESSMENT
# =============================================================================

def assess_infrastructure(
    ward_data: dict[str, Any],
    reports: list[dict[str, Any]],
) -> dict[str, Any]:

    ward = str(
        ward_data.get(
            "ward",
            "UNKNOWN",
        )
    )


    stress = safe_float(
        ward_data.get(
            "infrastructureStress",
            0,
        )
    )


    hazard_reports = (
        verified_reports_for_hazard(
            reports,
            "INFRASTRUCTURE",
        )
    )


    physical_component = interpolate(
        stress,
        0,
        100,
        0,
        75,
    )


    report_component = (
        calculate_report_risk(
            hazard_reports
        )
    )


    risk_score = round(
        min(
            100,
            physical_component
            + report_component,
        )
    )


    risk_level = (
        risk_level_from_score(
            risk_score
        )
    )


    if (
        stress
        >= CRITICAL_INFRASTRUCTURE_STRESS
        and hazard_reports
    ):
        risk_level = "CRITICAL"

        risk_score = max(
            risk_score,
            75,
        )

    elif (
        stress
        >= HIGH_INFRASTRUCTURE_STRESS
    ):
        risk_level = max_risk_level(
            risk_level,
            "HIGH",
        )

    elif (
        stress
        >= WATCH_INFRASTRUCTURE_STRESS
        or hazard_reports
    ):
        risk_level = max_risk_level(
            risk_level,
            "WATCH",
        )


    evidence = []


    if ward_data.get("infrastructureStress") is not None:

        evidence.append(
            optional_observation_evidence(
                source_type="INFRASTRUCTURE_SENSOR",
                source_name=(
                    (ward_data.get("sources") or {}).get(
                        "infrastructure",
                        "Infrastructure observation",
                    )
                ),
                mode=(
                    (ward_data.get("sources") or {}).get(
                        "infrastructureMode",
                        "UNKNOWN",
                    )
                ),
                value=stress,
                unit="index",
                timestamp=(
                    (ward_data.get("sources") or {}).get(
                        "infrastructureTimestamp"
                    )
                ),
                description=(
                    f"Infrastructure stress "
                    f"is {stress:.1f}/100."
                ),
            )
        )


    evidence.extend(
        build_report_evidence(
            hazard_reports,
            "INFRASTRUCTURE",
        )
    )


    confidence_score, confidence_level = (
        calculate_confidence(
            evidence
        )
    )


    return build_assessment(
        ward=ward,
        hazard_type="INFRASTRUCTURE",
        risk_score=risk_score,
        risk_level=risk_level,
        confidence_score=confidence_score,
        confidence_level=confidence_level,
        evidence=evidence,
    )


# =============================================================================
# RISK LEVEL COMPARISON
# =============================================================================

def max_risk_level(
    first: str,
    second: str,
) -> str:

    rank = {
        "NORMAL": 0,
        "WATCH": 1,
        "HIGH": 2,
        "CRITICAL": 3,
    }

    if (
        rank.get(
            second,
            0,
        )
        >
        rank.get(
            first,
            0,
        )
    ):
        return second

    return first


# =============================================================================
# ASSESSMENT BUILDER
# =============================================================================

def build_assessment(
    ward: str,
    hazard_type: str,
    risk_score: int,
    risk_level: str,
    confidence_score: int,
    confidence_level: str,
    evidence: list[dict[str, Any]],
) -> dict[str, Any]:

    stale_sources = [
        item
        for item in evidence
        if (
            item.get(
                "freshness",
                {},
            )
            .get(
                "status"
            )
            in {
                "STALE",
                "VERY_STALE",
            }
        )
    ]


    return {
        "ward":
            ward,

        "hazardType":
            hazard_type,

        "riskScore":
            int(
                clamp(
                    risk_score,
                    0,
                    100,
                )
            ),

        "riskLevel":
            risk_level,

        "confidenceScore":
            int(
                clamp(
                    confidence_score,
                    0,
                    100,
                )
            ),

        "confidenceLevel":
            confidence_level,

        "affectedArea":
            build_affected_area(
                ward,
                risk_level,
            ),

        "evidence":
            evidence,

        "evidenceCount":
            len(
                evidence
            ),

        "citizenActions":
            CITIZEN_ACTIONS.get(
                hazard_type,
                [],
            ),

        "officerActions":
            OFFICER_ACTIONS.get(
                hazard_type,
                [],
            ),

        "dataFreshness":
            {
                "hasStaleSources":
                    bool(
                        stale_sources
                    ),

                "staleSourceCount":
                    len(
                        stale_sources
                    ),
            },

        "generatedAt":
            now_ms(),
    }


# =============================================================================
# MAIN MULTI-HAZARD FUSION FUNCTION
# =============================================================================

def assess_ward_hazards(
    ward_data: dict[str, Any],
    verified_reports: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:

    """
    Evaluate every supported hazard for one ward.

    verified_reports should contain report dictionaries. Reports that
    are not VERIFIED are automatically ignored by the hazard classifiers.
    """

    if verified_reports is None:
        verified_reports = []


    flood = assess_flood(
        ward_data,
        verified_reports,
    )

    severe_weather = (
        assess_severe_weather(
            ward_data,
            verified_reports,
        )
    )

    fire = assess_fire(
        ward_data,
        verified_reports,
    )

    seismic = assess_seismic(
        ward_data,
        verified_reports,
    )

    infrastructure = (
        assess_infrastructure(
            ward_data,
            verified_reports,
        )
    )


    assessments = [
        flood,
        severe_weather,
        fire,
        seismic,
        infrastructure,
    ]


    assessments.sort(
        key=lambda item: (
            item[
                "riskScore"
            ],
            item[
                "confidenceScore"
            ],
        ),
        reverse=True,
    )


    primary = assessments[0]


    active_hazards = [
        item
        for item in assessments
        if item[
            "riskLevel"
        ]
        != "NORMAL"
    ]


    return {
        "ward":
            ward_data.get(
                "ward"
            ),

        "primaryHazard":
            primary[
                "hazardType"
            ],

        "overallRiskScore":
            primary[
                "riskScore"
            ],

        "overallRiskLevel":
            primary[
                "riskLevel"
            ],

        "overallConfidenceScore":
            primary[
                "confidenceScore"
            ],

        "overallConfidenceLevel":
            primary[
                "confidenceLevel"
            ],

        "activeHazardCount":
            len(
                active_hazards
            ),

        "activeHazards":
            [
                item[
                    "hazardType"
                ]
                for item
                in active_hazards
            ],

        "hazards":
            assessments,

        "generatedAt":
            now_ms(),
    }


# =============================================================================
# PUBLIC SUMMARY HELPER
# =============================================================================

def build_hazard_summary(
    fusion_result: dict[str, Any],
) -> dict[str, Any]:

    """
    Lightweight summary suitable for dashboards and ward APIs.
    """

    return {
        "primaryHazard":
            fusion_result.get(
                "primaryHazard"
            ),

        "riskScore":
            fusion_result.get(
                "overallRiskScore",
                0,
            ),

        "riskLevel":
            fusion_result.get(
                "overallRiskLevel",
                "NORMAL",
            ),

        "confidenceScore":
            fusion_result.get(
                "overallConfidenceScore",
                0,
            ),

        "confidenceLevel":
            fusion_result.get(
                "overallConfidenceLevel",
                "LOW",
            ),

        "activeHazardCount":
            fusion_result.get(
                "activeHazardCount",
                0,
            ),

        "activeHazards":
            fusion_result.get(
                "activeHazards",
                [],
            ),
    }