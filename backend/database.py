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
# NORMALIZE POSTGRESQL URL
# ===========================================================================

# Some providers may still provide the older "postgres://" scheme.
# SQLAlchemy expects "postgresql://".

if DATABASE_URL.startswith(
    "postgres://"
):
    DATABASE_URL = DATABASE_URL.replace(
        "postgres://",
        "postgresql://",
        1,
    )


# ===========================================================================
# DATABASE ENGINE
# ===========================================================================

if DATABASE_URL.startswith(
    "sqlite"
):

    # Local SQLite configuration.
    engine = create_engine(
        DATABASE_URL,
        connect_args={
            "check_same_thread":
                False,
        },
    )

else:

    # PostgreSQL production configuration.
    #
    # Keep the pool deliberately controlled because
    # cloud PostgreSQL plans often have limited
    # available database connections.
    #
    # pool_pre_ping:
    # Checks whether a pooled connection is alive
    # before SQLAlchemy gives it to a request.
    #
    # pool_size:
    # Number of persistent database connections.
    #
    # max_overflow:
    # Extra temporary connections allowed during
    # short traffic bursts.
    #
    # pool_timeout:
    # Maximum number of seconds a request waits
    # for an available connection.
    #
    # pool_recycle:
    # Recreates older pooled connections periodically.
    #
    # pool_reset_on_return:
    # Rolls back unfinished transaction state before
    # returning a connection to the pool.

    engine = create_engine(
        DATABASE_URL,

        pool_pre_ping=True,

        pool_size=5,

        max_overflow=5,

        pool_timeout=10,

        pool_recycle=300,

        pool_reset_on_return="rollback",
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