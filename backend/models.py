from sqlalchemy import (
    BigInteger,
    Column,
    Float,
    Integer,
    String,
    Text,
)

from database import Base


# =============================================================================
# INCIDENT REPORT MODEL
# =============================================================================

class IncidentReport(Base):

    __tablename__ = "incident_reports"

    # -------------------------------------------------------------------------
    # IDENTIFICATION
    # -------------------------------------------------------------------------

    id = Column(
        String,
        primary_key=True,
        index=True,
    )

    # -------------------------------------------------------------------------
    # REPORTER / OWNER
    # -------------------------------------------------------------------------

    # ID of the citizen who submitted this report.
    #
    # nullable=True is intentional because reports created before this feature
    # do not have an owner stored in the database.
    reporter_user_id = Column(
        String,
        nullable=True,
        index=True,
    )

    # -------------------------------------------------------------------------
    # INCIDENT INFORMATION
    # -------------------------------------------------------------------------

    ward = Column(
        String,
        nullable=False,
        index=True,
    )

    report_type = Column(
        String,
        nullable=False,
    )

    severity = Column(
        String,
        nullable=False,
    )

    description = Column(
        Text,
        nullable=False,
    )

    # -------------------------------------------------------------------------
    # LOCATION
    # -------------------------------------------------------------------------

    latitude = Column(
        Float,
        nullable=True,
    )

    longitude = Column(
        Float,
        nullable=True,
    )

    # -------------------------------------------------------------------------
    # PHOTO
    # -------------------------------------------------------------------------

    photo_url = Column(
        String,
        nullable=True,
    )

    # -------------------------------------------------------------------------
    # VERIFICATION
    # -------------------------------------------------------------------------

    status = Column(
        String,
        nullable=False,
        default="PENDING",
        index=True,
    )

    # -------------------------------------------------------------------------
    # TIMESTAMPS
    # -------------------------------------------------------------------------

    created_at = Column(
        BigInteger,
        nullable=False,
    )

    verified_at = Column(
        BigInteger,
        nullable=True,
    )


# =============================================================================
# SENSOR READING MODEL
# =============================================================================

class SensorReading(Base):

    __tablename__ = "sensor_readings"

    # -------------------------------------------------------------------------
    # READING ID
    # -------------------------------------------------------------------------

    id = Column(
        String,
        primary_key=True,
        index=True,
    )

    # -------------------------------------------------------------------------
    # SENSOR INFORMATION
    # -------------------------------------------------------------------------

    sensor_id = Column(
        String,
        nullable=False,
        index=True,
    )

    ward = Column(
        String,
        nullable=False,
        index=True,
    )

    sensor_type = Column(
        String,
        nullable=False,
        index=True,
    )

    # -------------------------------------------------------------------------
    # SENSOR VALUE
    # -------------------------------------------------------------------------

    value = Column(
        Float,
        nullable=False,
    )

    unit = Column(
        String,
        nullable=False,
    )

    # -------------------------------------------------------------------------
    # SENSOR LOCATION
    # -------------------------------------------------------------------------

    latitude = Column(
        Float,
        nullable=True,
    )

    longitude = Column(
        Float,
        nullable=True,
    )

    # -------------------------------------------------------------------------
    # SENSOR STATUS
    # -------------------------------------------------------------------------

    status = Column(
        String,
        nullable=False,
        default="ONLINE",
    )

    # -------------------------------------------------------------------------
    # DATA SOURCE
    # -------------------------------------------------------------------------

    source = Column(
        String,
        nullable=False,
        default="IOT",
    )

    # -------------------------------------------------------------------------
    # TIMESTAMP
    # -------------------------------------------------------------------------

    timestamp = Column(
        BigInteger,
        nullable=False,
        index=True,
    )


# =============================================================================
# USER MODEL
# =============================================================================

class User(Base):

    __tablename__ = "users"

    # -------------------------------------------------------------------------
    # IDENTIFICATION
    # -------------------------------------------------------------------------

    id = Column(
        String,
        primary_key=True,
        index=True,
    )

    # -------------------------------------------------------------------------
    # USER INFORMATION
    # -------------------------------------------------------------------------

    name = Column(
        String,
        nullable=False,
    )

    email = Column(
        String,
        nullable=False,
        unique=True,
        index=True,
    )

    # -------------------------------------------------------------------------
    # AUTHENTICATION
    # -------------------------------------------------------------------------

    password_hash = Column(
        String,
        nullable=False,
    )

    # -------------------------------------------------------------------------
    # ROLE
    # -------------------------------------------------------------------------

    role = Column(
        String,
        nullable=False,
        default="USER",
        index=True,
    )

    # -------------------------------------------------------------------------
    # ACCOUNT STATUS
    # -------------------------------------------------------------------------

    status = Column(
        String,
        nullable=False,
        default="ACTIVE",
        index=True,
    )

    # -------------------------------------------------------------------------
    # TIMESTAMPS
    # -------------------------------------------------------------------------

    created_at = Column(
        BigInteger,
        nullable=False,
    )

    last_login_at = Column(
        BigInteger,
        nullable=True,
    )


# =============================================================================
# ALERT MODEL
# =============================================================================

class Alert(Base):

    __tablename__ = "alerts"

    # -------------------------------------------------------------------------
    # IDENTIFICATION
    # -------------------------------------------------------------------------

    id = Column(
        String,
        primary_key=True,
        index=True,
    )

    # -------------------------------------------------------------------------
    # TARGET WARD
    # -------------------------------------------------------------------------

    ward = Column(
        String,
        nullable=False,
        index=True,
    )

    # -------------------------------------------------------------------------
    # ALERT CLASSIFICATION
    # -------------------------------------------------------------------------

    priority = Column(
        String,
        nullable=False,
        index=True,
    )

    trigger = Column(
        String,
        nullable=False,
        index=True,
    )

    level = Column(
        String,
        nullable=False,
        index=True,
    )

    # -------------------------------------------------------------------------
    # ALERT CONTENT
    # -------------------------------------------------------------------------

    title = Column(
        String,
        nullable=False,
    )

    message = Column(
        Text,
        nullable=False,
    )

    primary_hazard = Column(
        String,
        nullable=False,
    )

    recommended_action = Column(
        Text,
        nullable=False,
    )

    # -------------------------------------------------------------------------
    # RISK INFORMATION
    # -------------------------------------------------------------------------

    risk = Column(
        Integer,
        nullable=False,
    )

    confidence = Column(
        Integer,
        nullable=False,
    )

    # -------------------------------------------------------------------------
    # PUBLICATION STATUS
    # -------------------------------------------------------------------------

    status = Column(
        String,
        nullable=False,
        default="PUBLISHED",
        index=True,
    )

    # -------------------------------------------------------------------------
    # OFFICER INFORMATION
    # -------------------------------------------------------------------------

    published_by = Column(
        String,
        nullable=True,
        index=True,
    )

    # -------------------------------------------------------------------------
    # TIMESTAMPS
    # -------------------------------------------------------------------------

    created_at = Column(
        BigInteger,
        nullable=False,
        index=True,
    )

    published_at = Column(
        BigInteger,
        nullable=False,
        index=True,
    )

    dismissed_at = Column(
        BigInteger,
        nullable=True,
    )
# =============================================================================
# NOTIFICATION MODEL
# =============================================================================

class Notification(Base):

    __tablename__ = "notifications"

    # -------------------------------------------------------------------------
    # IDENTIFICATION
    # -------------------------------------------------------------------------

    id = Column(
        String,
        primary_key=True,
        index=True,
    )

    # -------------------------------------------------------------------------
    # RECIPIENT
    # -------------------------------------------------------------------------

    # USER, OFFICER, or ALL
    recipient_role = Column(
        String,
        nullable=False,
        index=True,
    )

    # Optional specific user ID.
    # If None, notification applies to everyone in recipient_role.
    recipient_user_id = Column(
        String,
        nullable=True,
        index=True,
    )

    # -------------------------------------------------------------------------
    # NOTIFICATION CLASSIFICATION
    # -------------------------------------------------------------------------

    # REPORT, ALERT, RISK, SENSOR, SYSTEM
    notification_type = Column(
        String,
        nullable=False,
        index=True,
    )

    # INFO, WATCH, HIGH, CRITICAL, SUCCESS
    severity = Column(
        String,
        nullable=False,
        default="INFO",
        index=True,
    )

    # -------------------------------------------------------------------------
    # CONTENT
    # -------------------------------------------------------------------------

    title = Column(
        String,
        nullable=False,
    )

    message = Column(
        Text,
        nullable=False,
    )

    # -------------------------------------------------------------------------
    # RELATED WARD
    # -------------------------------------------------------------------------

    ward = Column(
        String,
        nullable=True,
        index=True,
    )

    # -------------------------------------------------------------------------
    # ACTION
    # -------------------------------------------------------------------------

    # Example:
    # VIEW_WARD
    # VIEW_REPORT
    # VIEW_ALERT
    action_type = Column(
        String,
        nullable=True,
    )

    # Example:
    # W14
    # report UUID
    # alert UUID
    action_target = Column(
        String,
        nullable=True,
        index=True,
    )

    # -------------------------------------------------------------------------
    # READ STATUS
    # -------------------------------------------------------------------------

    is_read = Column(
        Integer,
        nullable=False,
        default=0,
        index=True,
    )

    # -------------------------------------------------------------------------
    # TIMESTAMPS
    # -------------------------------------------------------------------------

    created_at = Column(
        BigInteger,
        nullable=False,
        index=True,
    )

    read_at = Column(
        BigInteger,
        nullable=True,
    )