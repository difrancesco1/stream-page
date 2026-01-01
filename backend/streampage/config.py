import os
from pathlib import Path
from typing import Final

from dotenv import load_dotenv
from fastapi.security import OAuth2PasswordBearer

# DEBUG: Check where we're looking for .env
cwd = Path.cwd()
env_file = cwd / ".env"


# Load .env file before accessing environment variables
result = load_dotenv(verbose=True)


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
OAUTH2_SCHEME_OPTIONAL = OAuth2PasswordBearer(tokenUrl="users/login", auto_error=False)

RIOT_API_KEY: Final[str] = os.getenv("RIOT_API_KEY", "RGAPI-6abca425-c53a-4059-ba3b-62dde8648ceb")

_supabase_url = os.getenv("SUPABASE_URL", "")
# Ensure trailing slash for Supabase storage API compatibility
SUPABASE_URL: Final[str] = _supabase_url.rstrip("/") + "/" if _supabase_url else ""
SUPABASE_SERVICE_KEY: Final[str] = os.getenv("SUPABASE_SERVICE_KEY")
SUPABASE_BUCKET: Final[str] = os.getenv("SUPABASE_BUCKET", "linqq-uploads")

print(f"DEBUG: SUPABASE_URL = {SUPABASE_URL}")
print(f"DEBUG: SUPABASE_SERVICE_KEY = {'SET' if SUPABASE_SERVICE_KEY else 'None'}")
# Service role key starts with 'eyJ' and contains 'service_role' when decoded
if SUPABASE_SERVICE_KEY:
    print(f"DEBUG: Key prefix = {SUPABASE_SERVICE_KEY[:20]}...")