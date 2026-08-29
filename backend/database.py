import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker


# ===========================================================================
# DATABASE CONFIGURATION
# ===========================================================================

# Production:
# Render provides DATABASE_URL for PostgreSQL.
#
# Local development:
# If DATABASE_URL is not configured, PRAVAAH falls back to SQLite.

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./pravaah.db",
)


# ===========================================================================
# DATABASE ENGINE CONFIGURATION
# ===========================================================================

# Render / some PostgreSQL providers may provide the older
# "postgres://" scheme. SQLAlchemy expects "postgresql://".
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace(
        "postgres://",
        "postgresql://",
        1,
    )


# ===========================================================================
# DATABASE ENGINE
# ===========================================================================

if DATABASE_URL.startswith("sqlite"):

    # SQLite configuration for local development.
    engine = create_engine(
        DATABASE_URL,
        connect_args={
            "check_same_thread": False,
        },
    )

else:

    # PostgreSQL configuration for production.
    #
    # pool_pre_ping checks connections before SQLAlchemy uses them.
    # This helps when a cloud database closes an idle connection.
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
    )


# ===========================================================================
# DATABASE SESSION
# ===========================================================================

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


# ===========================================================================
# BASE MODEL
# ===========================================================================

Base = declarative_base()


# ===========================================================================
# DATABASE DEPENDENCY
# ===========================================================================

def get_db():

    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()