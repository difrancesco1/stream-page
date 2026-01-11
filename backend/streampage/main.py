from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from streampage.api.cat.cat import cat_router
from streampage.api.media.media import media_router
from streampage.api.opgg.opgg import opgg_router
from streampage.api.riot.riot import riot_router
from streampage.api.user.user import users_router
from streampage.api.page.page import page_router
from streampage.api.user.auth import hash_password
from streampage.config import FRONTEND_URL, IS_RAILWAY
from streampage.db.engine import get_db, get_db_session
from streampage.db.models import User, UserLogin


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: seed default user if no users exist
    with get_db_session() as session:
        if not session.query(User).first():
            user = User(username="rosie")
            session.add(user)
            session.flush()
            session.add(UserLogin(user=user, password=hash_password("Password1!")))
            session.commit()
            print("Seeded default user: rosie")
    yield


app = FastAPI(title="streampage", lifespan=lifespan)

# Configure CORS
allowed_origins = [
    FRONTEND_URL,
    "http://localhost:3000",
]

cors_kwargs = dict(
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# NOTE: `allow_origins=["https://*.up.railway.app"]` does NOT work (it's not a wildcard match).
if IS_RAILWAY:
    cors_kwargs["allow_origin_regex"] = r"^https://.*\.up\.railway\.app$"

app.add_middleware(CORSMiddleware, **cors_kwargs)


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
app.include_router(riot_router, prefix="/riot")
app.include_router(opgg_router, prefix="/opgg")
app.include_router(media_router, prefix="/media")
app.include_router(cat_router, prefix="/cats")
app.include_router(page_router, prefix="/page")
