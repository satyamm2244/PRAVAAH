import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import NullPool


# ===========================================================================
# DATABASE CONFIGURATION
# ===========================================================================

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./pravaah.db",
)


# ===========================================================================
# NORMALIZE POSTGRESQL URL
# ===========================================================================

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

    # Local development database
    engine = create_engine(
        DATABASE_URL,
        connect_args={
            "check_same_thread": False,
        },
    )

else:

    # Production PostgreSQL / Neon
    #
    # PRAVAAH uses Neon's pooled connection endpoint.
    # Therefore we do not need another persistent
    # SQLAlchemy QueuePool in front of Neon's pool.
    #
    # NullPool means:
    # request opens connection
    #       ↓
    # query executes
    #       ↓
    # session closes
    #       ↓
    # connection is immediately released
    #
    # This prevents SQLAlchemy QueuePool exhaustion.

    engine = create_engine(
        DATABASE_URL,

        poolclass=NullPool,

        pool_pre_ping=True,

        connect_args={
            "connect_timeout": 10,
        },
    )


# ===========================================================================
# DATABASE SESSION
# ===========================================================================

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
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

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()