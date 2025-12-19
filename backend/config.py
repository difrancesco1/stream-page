import os

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
