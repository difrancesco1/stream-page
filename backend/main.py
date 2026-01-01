"""
Compatibility entrypoint.

The real FastAPI app lives at `streampage.main:app`.
Railway starts that module directly (see `backend/railway.toml`).
"""

import os

from streampage.main import app


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("streampage.main:app", host="0.0.0.0", port=port)
