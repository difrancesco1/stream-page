import logging
import os
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from sqlalchemy.orm import sessionmaker

from config import DATABASE_URL
from config import IS_RAILWAY

# Simple logger setup (replace with your preferred logging)
import logging
def setup_logger():
    logging.basicConfig(level=logging.INFO)
    return logging.getLogger(__name__)

# Disable SQLAlchemy logging to avoid verbose query logs
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
logging.getLogger("sqlalchemy.dialects").setLevel(logging.WARNING)
logging.getLogger("sqlalchemy.pool").setLevel(logging.WARNING)
logging.getLogger("sqlalchemy.orm").setLevel(logging.WARNING)

logger = setup_logger()
try:
    # Mask sensitive parts of the URL for logging
    masked_url = DATABASE_URL
    if "@" in DATABASE_URL:
        first_part = DATABASE_URL.split("@")[0]
        masked_url = masked_url.replace(first_part, "***")

    # Configure engine based on environment
    if IS_RAILWAY:
        engine = create_engine(
            DATABASE_URL,
            pool_pre_ping=True,  # Enable connection health checks
            pool_size=10,  # Maximum number of connections to keep in the pool
            max_overflow=20,  # Max connections beyond pool_size
            connect_args={
                "connect_timeout": 10,  # Set connection timeout
                "sslmode": "require",  # Railway requires SSL
                "application_name": "ai_tutor",  # Help identify connections in Railway
            },
            # Disable echo to prevent verbose SQL logging
            echo=False,
        )
    else:
        engine = create_engine(
            DATABASE_URL,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20,
            connect_args={"connect_timeout": 10},
            # Disable echo to prevent verbose SQL logging
            echo=False,
        )

    # Test connection with a specific query that prints the connection detail
    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT version(), current_database(), current_user")
        )
        row = result.fetchone()
        if row:
            logger.info(f"Connected to PostgreSQL: {row[0]}")
            logger.info(f"Database: {row[1]}, User: {row[2]}")
        logger.info("Database connection successful")

except Exception as e:
    logger.error(f"Failed to connect to database: {str(e)}")
    url_msg = masked_url if "masked_url" in locals() else "URL not available"
    logger.error(f"Database URL used: {url_msg}")
    logger.error(
        f"Environment variables: RAILWAY_SERVICE_NAME={os.getenv('RAILWAY_SERVICE_NAME')}",
    )

    # Create a dummy engine that will raise a more helpful error when used
    from sqlalchemy.pool import NullPool

    engine = create_engine(
        "postgresql://localhost/error",
        poolclass=NullPool,
        connect_args={"connect_timeout": 1},
    )

# Create a session factory
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


def get_db() -> Generator[Session, None, None]:
    """Provide a database session for FastAPI dependency injection.

    Ensures the session is properly closed after use and handles rollback
    on exceptions.
    """
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
    """Get a new database session.

    Remember to close the session after use!

    Usage:
        db = get_db_session()
        try:
            db.query(Model).all()
            db.commit()
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Database error: {str(e)}")
            raise
        finally:
            db.close()
    """
    return SessionLocal()
