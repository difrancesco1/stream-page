from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from streampage.api.user.user import users_router
from streampage.config import FRONTEND_URL, IS_RAILWAY
from streampage.db.engine import get_db

app = FastAPI(title="streampage")

# Configure CORS
allowed_origins = [
    FRONTEND_URL,
    "http://localhost:3000",
]
if IS_RAILWAY:
    allowed_origins.append("https://*.up.railway.app")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def health_check():
    return {"status": "ok", "message": "ROS API is running"}


@app.get("/api/health")
def api_health():
    """Health check endpoint for Railway."""
    return {"status": "healthy"}


@app.get("/api/db-health")
def db_health(db: Session = Depends(get_db)):
    """Test database connection."""
    try:
        result = db.execute(text("SELECT 1"))
        result.fetchone()

        tables_result = db.execute(text(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
        ))
        tables = [row[0] for row in tables_result.fetchall()]

        return {
            "status": "connected",
            "database": "streampage",
            "tables": tables
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


app.include_router(users_router, prefix="/users")
