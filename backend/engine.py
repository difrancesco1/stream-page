import logging
import os
from collections.abc import Generator
from functools import lru_cache

from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, sessionmaker

from config import DATABASE_URL, IS_RAILWAY

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Disable verbose SQLAlchemy logging
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
logging.getLogger("sqlalchemy.dialects").setLevel(logging.WARNING)
logging.getLogger("sqlalchemy.pool").setLevel(logging.WARNING)
logging.getLogger("sqlalchemy.orm").setLevel(logging.WARNING)


@lru_cache()
def get_engine():
    """Lazily create and cache the database engine."""
    masked_url = DATABASE_URL
    if "@" in DATABASE_URL:
        first_part = DATABASE_URL.split("@")[0]
        masked_url = masked_url.replace(first_part, "***")
    
    logger.info(f"Creating database engine (Railway: {IS_RAILWAY})")
    
    connect_args = {"connect_timeout": 10}
    if IS_RAILWAY:
        connect_args.update({
            "sslmode": "require",
            "application_name": "ros_backend",
        })
    
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
        connect_args=connect_args,
        echo=False,
    )
    
    # Test connection
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            result.fetchone()
            logger.info("Database connection successful")
    except Exception as e:
        logger.warning(f"Database connection test failed: {e}")
    
    return engine


def get_session_local():
    """Get the session factory."""
    return sessionmaker(
        bind=get_engine(),
        autocommit=False,
        autoflush=False,
        expire_on_commit=False,
    )


def get_db() -> Generator[Session, None, None]:
    """Provide a database session for FastAPI dependency injection."""
    SessionLocal = get_session_local()
    db = SessionLocal()
    try:
        yield db
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error: {str(e)}")
        raise
    finally:
        db.close()


def get_db_session() -> Session:
    """Get a new database session. Remember to close after use!"""
    SessionLocal = get_session_local()
    return SessionLocal()
