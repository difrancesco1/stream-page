import os
from typing import Final

from fastapi.security import OAuth2PasswordBearer

IS_RAILWAY = bool(os.getenv("RAILWAY_ENVIRONMENT"))

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/streampage"
)

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

SECRET_KEY: Final[str] = os.getenv("SECRET_KEY", "2cb48b02c2191d966bad7116")
ALGORITHM: Final[str] = os.getenv("ALGORITHM", "HS256")
OAUTH2_SCHEME = OAuth2PasswordBearer(tokenUrl="users/login")

RIOT_API_KEY: Final[str] = os.getenv("RIOT_API_KEY", "RGAPI-832357da-7c86-4ccd-9aea-0c400b718a5c")
