import os
from typing import Final

from fastapi.security import OAuth2PasswordBearer

# Detect Railway environment
IS_RAILWAY = bool(os.getenv("RAILWAY_ENVIRONMENT"))

# Database configuration
# Railway provides DATABASE_URL automatically when you add a Postgres plugin
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/streampage"  # Local default
)

# Railway uses postgres:// but SQLAlchemy requires postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Frontend URL for CORS
FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "http://localhost:3000"
)

# Server configuration
PORT = int(os.getenv("PORT", 8000))
HOST = os.getenv("HOST", "0.0.0.0")

# Auth configuration - IMPORTANT: Use environment variables for security!
SECRET_KEY: Final[str] = os.getenv(
    "SECRET_KEY", "2cb48b02c2191d966bad7116"
)  # Default for dev only
ALGORITHM: Final[str] = os.getenv("ALGORITHM", "HS256")
OAUTH2_TOKEN_URL: Final[str] = os.getenv("OAUTH2_TOKEN_URL", "users/login")
OAUTH2_SCHEME = OAuth2PasswordBearer(tokenUrl=OAUTH2_TOKEN_URL)