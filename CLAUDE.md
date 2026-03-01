# CLAUDE.md

## Project

Full-stack streamer page ("ROS"). FastAPI backend, Next.js frontend (App Router),
PostgreSQL with pgvector. Deployed on Railway. Stability over velocity — keep
changes small and incremental.

## Commands

```bash
# Database (Docker)
docker run -d --name streampage \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=streampage -p 5432:5432 ankane/pgvector

# Backend
cd backend && source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn streampage.main:app --reload --port 8000

# Frontend
cd web && pnpm install && pnpm dev

# Migrations
cd backend && alembic revision --autogenerate -m "description"
alembic upgrade head

# Seed / reset DB
cd backend && python seed_db.py
cd backend && python reset_db.py
```

## Environment Variables

- **Backend** (`.env`): `DATABASE_URL`, `FRONTEND_URL`, `SECRET_KEY`, `RIOT_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
- **Frontend**: `NEXT_PUBLIC_API_URL`

## Conventions

- Backend: async/await everywhere, Pydantic models for request/response schemas, each API domain in its own sub-package under `api/`
- Frontend: Tailwind for styling, modular component design pattern, kebab file naming (example-component.tsx)
- Backend deps in `requirements.txt`, frontend in `package.json` via pnpm
- Use Shadcn for UI components where you can
- 

## Do Not

- Add heavy dependencies without justification
- Break or change existing API contracts without updating both backend and frontend together
- Change asset formats/locations or deployment configs without reason
- Commit `.env` files or secrets

## Good to know

- Media uploads go through Supabase storage (`services/storage.py`), not the local filesystem
- Middleware order in `main.py` matters, don't reorder without understanding the auth flow
- If changing an endpoint shape, both backend route and the corresponding frontend api logic must be updated together
