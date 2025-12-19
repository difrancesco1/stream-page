from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import FRONTEND_URL, IS_RAILWAY, PORT

app = FastAPI(title="ROS API")

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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
