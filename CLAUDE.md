# CLAUDE.md

## Overview

Stream page ("ROS") is a full-stack web app for a streamer's personal page.
FastAPI backend, Next.js frontend, PostgreSQL with pgvector. Integrates with
Riot Games API, OP.GG, and Supabase for media storage.

The focus is on keeping the app stable, the UI polished, and changes incremental.

## Project Goals

- Keep the app **working and deployable** at all times
- Preserve existing API contracts between frontend and backend
- Prefer small, focused changes over large rewrites
- Keep the UI feeling cohesive and on-brand

## Repository Structure

```
├── CLAUDE.md
├── README.md
├── backend/
│   ├── alembic/                 # DB migrations
│   │   └── versions/
│   ├── alembic.ini
│   ├── requirements.txt
│   ├── railway.toml             # Railway deployment config
│   ├── reset_db.py
│   ├── seed_db.py
│   └── streampage/
│       ├── main.py              # FastAPI app entrypoint
│       ├── config.py
│       ├── api/
│       │   ├── cat/             # Cat endpoints
│       │   ├── media/           # Media/upload endpoints
│       │   ├── middleware/      # Auth middleware
│       │   ├── opgg/            # OP.GG integration
│       │   ├── page/            # Page config endpoints
│       │   ├── riot/            # Riot API integration
│       │   └── user/            # User/auth endpoints
│       ├── db/
│       │   ├── engine.py        # Async SQLAlchemy engine
│       │   ├── models.py        # SQLAlchemy models
│       │   ├── enums.py
│       │   └── riot.py
│       └── services/
│           ├── scheduler.py     # APScheduler background jobs
│           └── storage.py       # Supabase storage service
└── web/
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx
    │   ├── globals.css
    │   ├── api/                 # Next.js API routes
    │   ├── components/          # Page-level components
    │   ├── context/             # React context providers
    │   ├── styles/              # SCSS/CSS modules
    │   ├── discord/             # Route pages
    │   ├── duo/
    │   ├── opgg/
    │   ├── tiktok/
    │   ├── twitter/
    │   └── youtube/
    ├── components/ui/           # Shared UI components
    ├── lib/
    │   ├── api.ts               # API client
    │   └── utils.ts
    ├── public/                  # Static assets (images, fonts, icons)
    ├── package.json
    ├── railway.toml
    ├── next.config.ts
    └── tsconfig.json
```

## Tech Stack

- **Backend**: Python ≥3.11, FastAPI, async SQLAlchemy, Alembic, APScheduler
- **Frontend**: TypeScript, Next.js 16 (App Router), React 19, Tailwind CSS 4, MUI
- **Database**: PostgreSQL with pgvector (Docker)
- **Storage**: Supabase (media uploads)
- **Deployment**: Railway
- **Package manager**: pnpm (frontend)

## Common Commands

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

## Coding Style

- **Backend**: async/await everywhere, Pydantic models for request/response schemas, each API domain in its own sub-package under `api/`
- **Frontend**: App Router conventions, Tailwind + MUI for styling, keep API calls in `lib/api.ts`
- Clear, descriptive names; avoid over-engineering
- Add docstrings/comments only when behavior is not obvious

## Environment Variables

- **Backend** (`.env`): `DATABASE_URL`, `FRONTEND_URL`, `SECRET_KEY`, `RIOT_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
- **Frontend**: `NEXT_PUBLIC_API_URL`

## Dependencies

- Do not introduce heavy new dependencies without justification
- Backend deps go in `requirements.txt`, frontend in `package.json` via pnpm

## Bug Fixes & Changes

- Prefer focused changes; don't mix refactors with behavior changes
- Keep API contracts stable — if changing an endpoint shape, update both backend and frontend together
- Don't change asset formats/locations or deployment configs without reason

## What NOT to Do

- Do not rewrite large portions of the app in one change
- Do not break existing API routes or auth flow
- Do not couple new logic tightly to a single component when it could be shared
- Do not commit `.env` files or secrets

## When in Doubt

1. Preserve existing behavior
2. Choose the simplest solution
3. Keep backend and frontend in sync
