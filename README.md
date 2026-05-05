# ROS - Development Setup Guide

A full-stack application with a FastAPI backend and Next.js frontend.

---

## 📋 Prerequisites

Before getting started, ensure you have the following installed:

| Tool        | Version | Installation                                           |
| ----------- | ------- | ------------------------------------------------------ |
| **Docker**  | Latest  | [docker.com](https://docker.com)                       |
| **Node.js** | ≥20.9.0 | [nodejs.org](https://nodejs.org)                       |
| **pnpm**    | Latest  | `npm install -g pnpm`                                  |
| **Python**  | ≥3.11   | [python.org](https://python.org)                       |
| **VS Code** | Latest  | [code.visualstudio.com](https://code.visualstudio.com) |

---

## 🗄️ Database Setup (Docker + PostgreSQL)

The project uses PostgreSQL with the pgvector extension for database operations.

### 1. Start the PostgreSQL Container

Run the following command to spin up a PostgreSQL database with pgvector:

```bash
docker run -d \
  --name streampage \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=streampage \
  -p 5432:5432 \
  -v streampage_postgres_data:/var/lib/postgresql/data \
  ankane/pgvector
```

### 2. Verify the Container is Running

```bash
docker ps
```

You should see a container named `streampage` in the list.

### 3. Common Docker Commands

| Command                                                     | Description               |
| ----------------------------------------------------------- | ------------------------- |
| `docker stop streampage`                                    | Stop the database         |
| `docker start streampage`                                   | Start the database        |
| `docker logs streampage`                                    | View database logs        |
| `docker exec -it streampage psql -U postgres -d streampage` | Connect to database shell |

---

## ⚙️ Backend Setup (FastAPI)

The backend is a FastAPI application located in `/backend/`.

### 1. Navigate to Backend Directory

```bash
cd backend
```

### 2. Create a Virtual Environment

```bash
python -m venv venv
```

### 3. Activate the Virtual Environment

**macOS/Linux:**

```bash
source venv/bin/activate
```

**Windows:**

```bash
venv\Scripts\activate
```

### 4. Install Dependencies

```bash
pip install -r requirements.txt
```

### 5. Run Database Migrations

Ensure your PostgreSQL container is running, then apply migrations:

```bash
alembic upgrade head
```

### 6. Start the Backend Server

```bash
uvicorn streampage.main:app --reload --port 8000
```

The API will be available at: **http://localhost:8000**

### Backend Environment Variables

The backend uses these environment variables (with defaults for local development):

| Variable               | Default                                                    | Description                                          |
| ---------------------- | ---------------------------------------------------------- | ---------------------------------------------------- |
| `DATABASE_URL`         | `postgresql://postgres:postgres@localhost:5432/streampage` | PostgreSQL connection string                         |
| `FRONTEND_URL`         | `http://localhost:3000`                                    | Frontend URL for CORS                                |
| `SECRET_KEY`           | (dev default)                                              | JWT signing key                                      |
| `RIOT_API_KEY`         | (dev default)                                              | Riot Games API key                                   |
| `PAYPAL_CLIENT_ID`     | (empty)                                                    | PayPal REST app client id (sandbox or live)          |
| `PAYPAL_CLIENT_SECRET` | (empty)                                                    | PayPal REST app secret (sandbox or live)             |
| `PAYPAL_SANDBOX`       | `true`                                                     | Use PayPal sandbox API; set `false` for production   |

### API Health Check Endpoints

- `GET /` - Basic health check
- `GET /api/health` - API health status
- `GET /api/db-health` - Database connection status

---

## 🌐 Frontend Setup (Next.js)

The frontend is a Next.js application located in `ros/web/`.

### 1. Navigate to Frontend Directory

```bash
cd web
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Start the Development Server

```bash
pnpm dev
```

The frontend will be available at: **http://localhost:3000**

### Frontend Environment Variables

Create a `.env.local` file in `web/` if you need to override defaults:

| Variable                       | Default                 | Description                                  |
| ------------------------------ | ----------------------- | -------------------------------------------- |
| `NEXT_PUBLIC_API_URL`          | `http://localhost:8000` | Backend API URL                              |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | (empty)                 | PayPal client id used by the JS SDK Buttons  |

---

## 💳 PayPal Setup (Sandbox)

Checkout uses PayPal Orders v2. To run an end-to-end sandbox test:

### 1. Create a sandbox app

1. Sign in at [developer.paypal.com](https://developer.paypal.com).
2. Go to **Apps & Credentials** -> **Sandbox** tab -> **Create App**.
3. Name it `streampage-sandbox`, then copy the **Client ID** and **Secret**.

### 2. Set env vars

In `backend/.env`:

```
PAYPAL_SANDBOX=true
PAYPAL_CLIENT_ID=<sandbox client id>
PAYPAL_CLIENT_SECRET=<sandbox secret>
```

In `web/.env.local`:

```
NEXT_PUBLIC_PAYPAL_CLIENT_ID=<sandbox client id>
```

Restart both servers after changing env files.

### 3. Test buyer accounts

Sandbox -> **Accounts** in the developer dashboard auto-generates a buyer account. Use that email and password in the PayPal popup during checkout.

### 4. Going to production later

Same code works for live. Create a Live app under the **Live** tab (requires a verified PayPal Business account), swap the three env values, and set `PAYPAL_SANDBOX=false`. No code changes needed.

---

## 🚀 Running with VS Code (Recommended)

The project includes pre-configured VS Code launch configurations for easy debugging.

### Available Launch Configurations

Open the project in VS Code and go to the **Run and Debug** panel (`Cmd+Shift+D` / `Ctrl+Shift+D`):

| Configuration         | Description                                        |
| --------------------- | -------------------------------------------------- |
| **Backend: FastAPI**  | Starts the FastAPI backend with debugger attached  |
| **Frontend: Next.js** | Starts the Next.js frontend with debugger attached |
| **Full Stack**        | Starts both backend and frontend simultaneously    |

### Using the Launch Configurations

1. **Open VS Code** in the project root (`/ros`)
2. **Press `Cmd+Shift+D`** (macOS) or `Ctrl+Shift+D` (Windows/Linux) to open Run and Debug
3. **Select a configuration** from the dropdown:
   - Choose **"Full Stack"** to run everything at once
   - Or run **"Backend: FastAPI"** and **"Frontend: Next.js"** separately
4. **Press `F5`** or click the green play button to start

### What Each Configuration Does

**Backend: FastAPI**

- Runs uvicorn with hot-reload enabled
- Attaches Python debugger (debugpy)
- Sets `DATABASE_URL` environment variable
- Runs on port 8000

**Frontend: Next.js**

- Runs `pnpm dev`
- Automatically opens browser when ready
- Runs on port 3000

**Full Stack**

- Runs both configurations in parallel
- Stops all when any is stopped

---

## 📁 Project Structure

```
├── .vscode/
│   └── launch.json          # VS Code debug configurations
│   ├── backend/
│   │   ├── alembic/          # Database migrations
│   │   ├── streampage/       # Main application code
│   │   │   ├── api/          # API routes
│   │   │   ├── db/           # Database models & engine
│   │   │   ├── config.py     # Configuration
│   │   │   └── main.py       # FastAPI app entry
│   │   ├── requirements.txt  # Python dependencies
│   │   └── alembic.ini       # Alembic configuration
│   └── web/
│       ├── app/              # Next.js app directory
│       │   ├── api/          # Server actions
│       │   ├── components/   # React components
│       │   └── context/      # React contexts
│       ├── components/ui/    # Shared UI components
│       ├── lib/              # Utilities
│       └── package.json      # Node dependencies
└── README.md                 # This file
```

---

## 🔄 Database Migrations

### Creating a New Migration

```bash
cd ros/backend
alembic revision --autogenerate -m "description of changes"
```

### Applying Migrations

```bash
alembic upgrade head
```

### Rolling Back Migrations

```bash
alembic downgrade -1  # Roll back one migration
alembic downgrade base  # Roll back all migrations
```

### Viewing Migration History

```bash
alembic history
```

---

## 🛠️ Quick Start Checklist

- [ ] Install prerequisites (Docker, Node.js, pnpm, Python)
- [ ] Start PostgreSQL container with Docker
- [ ] Set up backend virtual environment and install dependencies
- [ ] Run database migrations (`alembic upgrade head`)
- [ ] Install frontend dependencies (`pnpm install`)
- [ ] Start development servers using VS Code "Full Stack" configuration

---

## 🐛 Troubleshooting

### Database Connection Issues

1. Verify Docker container is running: `docker ps`
2. Check container logs: `docker logs streampage`
3. Verify database URL matches container settings

### Port Already in Use

- Backend (8000): `lsof -i :8000` to find the process
- Frontend (3000): `lsof -i :3000` to find the process
- Kill the process: `kill -9 <PID>`

### Migration Errors

If migrations fail, ensure:

1. Database container is running
2. `DATABASE_URL` is correctly set
3. Run `alembic current` to see current migration state

---

## 📚 Useful Commands Reference

| Task             | Command                                                      |
| ---------------- | ------------------------------------------------------------ |
| Start database   | `docker start streampage`                                    |
| Stop database    | `docker stop streampage`                                     |
| Start backend    | `cd ros/backend && uvicorn streampage.main:app --reload`     |
| Start frontend   | `cd ros/web && pnpm dev`                                     |
| Run migrations   | `cd ros/backend && alembic upgrade head`                     |
| Create migration | `cd ros/backend && alembic revision --autogenerate -m "msg"` |
| Install BE deps  | `cd ros/backend && pip install -r requirements.txt`          |
| Install FE deps  | `cd ros/web && pnpm install`                                 |
