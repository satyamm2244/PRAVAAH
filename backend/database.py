import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker


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

    # -----------------------------------------------------------------------
    # LOCAL DEVELOPMENT - SQLITE
    # -----------------------------------------------------------------------

    engine = create_engine(
        DATABASE_URL,
        connect_args={
            "check_same_thread": False,
        },
    )

else:

    # -----------------------------------------------------------------------
    # PRODUCTION - POSTGRESQL / NEON
    # -----------------------------------------------------------------------
    #
    # Neon already provides server-side connection pooling, but keeping a
    # small SQLAlchemy pool here allows the Render backend process to reuse
    # established PostgreSQL/TLS connections between API requests.
    #
    # Previously NullPool created a brand-new connection for every request.
    # That avoided pool exhaustion, but added roughly 2-3 seconds of latency
    # in production.
    #
    # The expensive N+1 ward queries have now been removed, so a small local
    # connection pool is appropriate again.
    # -----------------------------------------------------------------------

    engine = create_engine(
        DATABASE_URL,

        # Check that a pooled connection is still alive before using it.
        pool_pre_ping=True,

        # Keep a small number of reusable connections.
        pool_size=5,

        # Allow a few temporary extra connections during short traffic bursts.
        max_overflow=5,

        # Wait up to 30 seconds if every pooled connection is busy.
        pool_timeout=30,

        # Periodically recycle connections to avoid stale long-lived sessions.
        pool_recycle=300,

        # Prefer recently used connections. This helps keep fewer connections
        # actively warm when traffic is light.
        pool_use_lifo=True,

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