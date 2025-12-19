from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import FRONTEND_URL, IS_RAILWAY
from engine import get_db_session

app = FastAPI()

# Configure CORS - allow frontend URL from config
allowed_origins = [FRONTEND_URL]
if IS_RAILWAY:
    # On Railway, also allow the Railway-provided domain
    allowed_origins.append("https://*.up.railway.app")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Hello world"}

get_db_session()