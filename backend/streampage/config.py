import os
from typing import Final

from dotenv import load_dotenv
from fastapi.security import OAuth2PasswordBearer

# Load .env file before accessing environment variables
load_dotenv()


IS_RAILWAY = bool(os.getenv("RAILWAY_ENVIRONMENT"))

# Get both URLs
_db_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/streampage")
_db_public_url = os.getenv("DATABASE_PUBLIC_URL", "")

if ".railway.internal" in _db_url and _db_public_url:
    DATABASE_URL = _db_public_url
else:
    DATABASE_URL = _db_url

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

SECRET_KEY: Final[str] = os.getenv("SECRET_KEY", "2cb48b02c2191d966bad7116")
ALGORITHM: Final[str] = os.getenv("ALGORITHM", "HS256")
OAUTH2_SCHEME = OAuth2PasswordBearer(tokenUrl="users/login")
OAUTH2_SCHEME_OPTIONAL = OAuth2PasswordBearer(tokenUrl="users/login", auto_error=False)

RIOT_API_KEY: Final[str] = os.getenv("RIOT_API_KEY", "")

SMTP_HOST: Final[str] = os.getenv("SMTP_HOST", "")
SMTP_PORT: Final[int] = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER: Final[str] = os.getenv("SMTP_USER", "")
SMTP_PASSWORD: Final[str] = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL: Final[str] = os.getenv("SMTP_FROM_EMAIL", "")

# Recipient for the "new order" admin notification. Falls back to the creator's
# user.email if unset (see api/shop/shop.py).
SHOP_ADMIN_EMAIL: Final[str] = os.getenv("SHOP_ADMIN_EMAIL", "")

PAYPAL_CLIENT_ID: Final[str] = os.getenv("PAYPAL_CLIENT_ID", "")
PAYPAL_CLIENT_SECRET: Final[str] = os.getenv("PAYPAL_CLIENT_SECRET", "")
PAYPAL_SANDBOX: bool = os.getenv("PAYPAL_SANDBOX", "true").lower() in ("true", "1", "yes")
PAYPAL_TEST_MODE: bool = os.getenv("PAYPAL_TEST_MODE", "false").lower() in ("true", "1", "yes")

STRIPE_SECRET_KEY: Final[str] = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_TEST_MODE: bool = os.getenv("STRIPE_TEST_MODE", "false").lower() in ("true", "1", "yes")

# Legacy Supabase storage. Optional: only used to delete objects that still
# have Supabase URLs, and by scripts/migrate_media_to_r2.py.
_supabase_url = os.getenv("SUPABASE_URL", "")
# Ensure trailing slash for Supabase storage API compatibility
SUPABASE_URL: Final[str] = _supabase_url.rstrip("/") + "/" if _supabase_url else ""
SUPABASE_SERVICE_KEY: Final[str] = os.getenv("SUPABASE_SERVICE_KEY", "")
SUPABASE_BUCKET: Final[str] = os.getenv("SUPABASE_BUCKET", "linqq-uploads")

# Legacy Cloudflare host that fronts the Supabase bucket. Only read by the
# migration scripts, which download through it to avoid Supabase egress.
MEDIA_CDN_URL: Final[str] = os.getenv("MEDIA_CDN_URL", "").rstrip("/")

# All uploaded media is stored in Cloudflare R2 (no egress fees). Required for
# uploads in every environment; use a separate bucket for local development.
R2_ACCOUNT_ID: Final[str] = os.getenv("R2_ACCOUNT_ID", "")
R2_ACCESS_KEY_ID: Final[str] = os.getenv("R2_ACCESS_KEY_ID", "")
R2_SECRET_ACCESS_KEY: Final[str] = os.getenv("R2_SECRET_ACCESS_KEY", "")
R2_BUCKET: Final[str] = os.getenv("R2_BUCKET", "")
R2_PUBLIC_BASE_URL: Final[str] = os.getenv("R2_PUBLIC_BASE_URL", "").rstrip("/")
