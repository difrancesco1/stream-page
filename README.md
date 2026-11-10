# Stream Page

A self-hostable, all-in-one home page for streamers and creators. Stream Page gives you a profile hub, a clip wall, League of Legends trackers, community features and a full storefront, all on one page you control and theme yourself.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Getting started](#getting-started)
- [Make it yours](#make-it-yours)
- [Configuration reference](#configuration-reference)
- [Deployment (Railway)](#deployment-railway)
- [License](#license)

---

## Features

### Profile and page

- **Profile card** with avatar, featured image and social links.
- **Custom page background** that you upload and change from the page itself.
- **In-place edit mode**: once you log in as the creator, every card becomes editable directly on the page, with no separate admin panel needed.
- **Draggable card layout**: each feature lives in its own window-style card that visitors can move around.
- **Pixel-art theme** with an animated cursor, pixel borders and an icon font, all easy to restyle.
- **Vanity redirects**: short links like `/discord`, `/youtube` or `/donate` that point wherever you want. Links can also open a specific card (for example `/duo` opens `/?card=duoTracker`).

### Media

- **Clip and media wall** where you and your community can post clips, GIFs and images. The creator can edit, remove and reorder entries.
- **Automatic transcoding** with ffmpeg: GIFs become animated WebP, and MP4 and WebM uploads become VP9 WebM for small, fast-loading files.
- **CDN delivery**: images are served through a Cloudflare-fronted Supabase bucket, and video is served from Cloudflare R2, which has no egress fees.

### Community

- **Pet picture gallery** that the community contributes to. Contributors can manage their own uploads.
- **Form builder** for applications, giveaways or feedback. It supports multiple question types, drag-to-reorder questions, file uploads and a response review view.

### League of Legends integrations (Riot API)

- **Account tracker**: an OP.GG-style view of your accounts with recent match history, account ordering and per-game hide and unhide controls.
- **Int list**: a community-maintained list of players with live summoner data that refreshes automatically every 24 hours.
- **Duo tracker**: tracks your record with duo partners across their linked accounts.
- **First tracker**: logs and displays "firsts" with editable entries.

### Shop

- **Products** with images, video, categories and inventory, managed from the page.
- **Custom card art**: customers can commission customized card artwork, and follow their place on a public waitlist.
- **Cart and checkout** through **Stripe** or **PayPal**, with domestic and international shipping and free-shipping thresholds.
- **Order tracking** for customers, plus email receipts and new-order alerts for the creator.
- **Admin dashboard** at `/shop/admin` for products, orders and custom-card requests.

### Accounts

- **JWT authentication** with access and refresh tokens.
- **Creator and contributor roles**: the creator manages everything, and registered visitors can contribute to community cards and manage their own submissions.

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui, react-hook-form and zod |
| Backend | FastAPI, SQLAlchemy 2, Alembic, Pydantic, APScheduler |
| Database | PostgreSQL (pgvector image) |
| Media | Supabase Storage, Cloudflare CDN, Cloudflare R2, ffmpeg, Pillow |
| Payments | Stripe, PayPal |
| Email | SMTP |
| Hosting | Railway (Nixpacks) |

---

The frontend is a Next.js App Router app that talks to the FastAPI backend over REST. The backend owns all data, auth, media processing, payments and email. A background scheduler inside the backend refreshes Riot data once a day.

---

## Getting started

### Prerequisites

- Python 3.11+
- Node.js 20.9+ and pnpm 10
- Docker (for the local database)
- ffmpeg (for media transcoding)

### 1. Start the database

```bash
docker run -d --name streampage \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=streampage -p 5432:5432 ankane/pgvector
```

### 2. Run the backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env` (see the [configuration reference](#configuration-reference) for every option):

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/streampage
FRONTEND_URL=http://localhost:3000
SECRET_KEY=replace-with-a-long-random-string

CREATOR_USERNAME=yourname
CREATOR_DEFAULT_PASSWORD=change-me
SITE_NAME="Your Name"
SITE_URL=http://localhost:3000
```

Apply migrations and start the API:

```bash
alembic upgrade head
uvicorn streampage.main:app --reload --port 8000
```

The API runs at `http://localhost:8000`, and interactive docs are at `http://localhost:8000/docs`.

### 3. Run the frontend

```bash
cd web
pnpm install
```

Create `web/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

```bash
pnpm dev
```

Open `http://localhost:3000`.

### 4. Log in as the creator

On first startup the backend creates the creator account from `CREATOR_USERNAME` and `CREATOR_DEFAULT_PASSWORD`. Log in with those credentials to turn on edit mode.

> **Change the default password immediately**, and never deploy with `CREATOR_DEFAULT_PASSWORD` or `SECRET_KEY` left at an example value.

---

## Make it yours

Stream Page is built to be rebranded. All creator-specific settings live in two places.

### Backend (`backend/.env`)

| Variable | Purpose |
| --- | --- |
| `CREATOR_USERNAME` | The account that owns the page and has full admin rights |
| `CREATOR_DEFAULT_PASSWORD` | Password for the creator account seeded on first startup |
| `SITE_NAME` | Display name used in emails and page metadata |
| `SITE_URL` | Public URL of your site, used in email links |
| `SUPPORT_CONTACT` | How customers reach you, shown in order emails (for example `@yourname on Discord`) |

### Frontend (`web/lib/site-config.ts`)

```ts
export const siteConfig = {
  name: "Your Name",
  creatorUsername: "yourname",
  links: [
    { source: "/discord", destination: "https://discord.gg/your-invite" },
    { source: "/youtube", destination: "https://www.youtube.com/@yourname" },
    { source: "/twitter", destination: "https://x.com/yourname" },
    { source: "/donate", destination: "https://example.com/tip" },
  ],
  cards: {
    media: true,
    catPictures: true,
    opgg: true,
    intList: true,
    duoTracker: true,
    firstTracker: true,
    shop: true,
  },
};
```

- **Links** become vanity redirects on your domain (`yoursite.com/discord`).
- **Cards** turn features on or off. If you don't play League of Legends, disable the Riot cards and skip `RIOT_API_KEY`.

### Theme and assets

Replace the files in `web/public` to restyle the page:

| File | Used for |
| --- | --- |
| `background.gif` | Default page background (you can also upload one from edit mode) |
| `profile.gif`, `idle.gif`, `loading.gif` | Profile and loading animations |
| `fonts/` | Pixel icon font |
| `art/` | Shop and card artwork |

Global styles live in `web/app/globals.css` and `web/app/styles`.

---

## Configuration reference

### Backend

**Core**

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string. `postgres://` URLs are normalized automatically. |
| `DATABASE_PUBLIC_URL` | No | Used instead of `DATABASE_URL` when that points at a Railway-internal host you can't reach |
| `FRONTEND_URL` | Yes | Frontend origin, allowed by CORS |
| `SECRET_KEY` | Yes | Secret for signing JWTs |
| `ALGORITHM` | No | JWT algorithm (default `HS256`) |

**Riot API**

| Variable | Required | Description |
| --- | --- | --- |
| `RIOT_API_KEY` | For League cards | Powers the account tracker, int list and duo tracker |

**Storage and media**

| Variable | Required | Description |
| --- | --- | --- |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Yes | Supabase service role key |
| `SUPABASE_BUCKET` | No | Storage bucket name |
| `MEDIA_CDN_URL` | No | CDN host in front of the Supabase bucket. When unset, Supabase URLs are served directly. |
| `R2_ACCOUNT_ID` | No | Cloudflare account ID for R2 |
| `R2_ACCESS_KEY_ID` | No | R2 access key |
| `R2_SECRET_ACCESS_KEY` | No | R2 secret key |
| `R2_BUCKET` | No | R2 bucket for video |
| `R2_PUBLIC_BASE_URL` | No | Public URL of the R2 bucket. When the R2 settings are unset, video is stored in Supabase. |

**Payments**

| Variable | Required | Description |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | For Stripe checkout | Stripe secret key |
| `STRIPE_TEST_MODE` | No | `true` to run checkout in test mode |
| `PAYPAL_CLIENT_ID` | For PayPal checkout | PayPal REST client ID |
| `PAYPAL_CLIENT_SECRET` | For PayPal checkout | PayPal REST client secret |
| `PAYPAL_SANDBOX` | No | `true` (default) to use the PayPal sandbox |
| `PAYPAL_TEST_MODE` | No | `true` to simulate PayPal payments |

**Email**

| Variable | Required | Description |
| --- | --- | --- |
| `SMTP_HOST` | For email | SMTP server host |
| `SMTP_PORT` | No | SMTP port (default `587`) |
| `SMTP_USER` | For email | SMTP username |
| `SMTP_PASSWORD` | For email | SMTP password |
| `SMTP_FROM_EMAIL` | For email | Sender address for receipts and notifications |
| `SHOP_ADMIN_EMAIL` | No | Where new-order alerts go. Defaults to the creator account's email. |

**Creator**: `CREATOR_USERNAME`, `CREATOR_DEFAULT_PASSWORD`, `SITE_NAME`, `SITE_URL` and `SUPPORT_CONTACT`, described in [Make it yours](#make-it-yours).

### Frontend

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Yes | Backend URL (default `http://localhost:8000`) |
| `NEXT_PUBLIC_SITE_URL` | Yes | Public URL of the site |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | For Stripe checkout | Stripe publishable key |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | For PayPal checkout | PayPal client ID |
| `NEXT_PUBLIC_PAYPAL_TEST_MODE` | No | `true` to simulate PayPal payments |

---

## Deployment (Railway)

Stream Page deploys as two Railway services plus a PostgreSQL database.

1. **Create a project** and add the **PostgreSQL** plugin.
2. **Backend service**: set the root directory to `backend`. [`backend/railway.toml`](backend/railway.toml) builds with Nixpacks, and [`backend/nixpacks.toml`](backend/nixpacks.toml) installs ffmpeg. On every deploy the service runs `alembic upgrade head` and then starts uvicorn. Railway checks health at `/api/health`.
3. **Frontend service**: set the root directory to `web`. [`web/railway.toml`](web/railway.toml) runs `pnpm install && pnpm build` on Node 20 and then `pnpm start`.
4. **Set environment variables** on each service from the [configuration reference](#configuration-reference). Reference the Postgres plugin's `DATABASE_URL` from the backend, and set `FRONTEND_URL` and `NEXT_PUBLIC_API_URL` to each other's public URLs.
5. **Add custom domains** in Railway. Any `*.up.railway.app` origin is accepted by CORS automatically, and your custom frontend domain is allowed through `FRONTEND_URL`.

### Media maintenance scripts

Run these from `backend/` with the venv active. Both support `--dry-run`.

- `python scripts/rewrite_media_urls.py` rewrites stored image URLs from the Supabase origin to your CDN host. It is idempotent and can be reversed with `--from` and `--to`.
- `python scripts/migrate_videos_to_r2.py` copies existing videos from Supabase to R2 and updates their URLs. The source files stay in place until you remove them.

---

## Development

### Database migrations

```bash
cd backend
alembic revision --autogenerate -m "describe your change"
alembic upgrade head
```

### Linting

```bash
cd web
pnpm lint
```

### Conventions

- **Backend**: async FastAPI routes, Pydantic models for every request and response, and one sub-package per domain under `streampage/api/` (each with its own router and `models.py`).
- **Frontend**: Tailwind for styling, shadcn/ui components where possible, and kebab-case file names (`example-component.tsx`).
- **API contracts**: when you change an endpoint's shape, update the backend route and its client in `web/app/api/` together.
- **Media**: uploads go through `services/storage.py` (and `services/r2_storage.py` for video), never the local filesystem.

### Adding a new card

1. **Backend**: create `backend/streampage/api/<feature>/` with a router and Pydantic models, add any tables to `db/models.py`, generate a migration, and register the router in `streampage/main.py`.
2. **API client**: add `web/app/api/<feature>/` with typed fetch functions that use `API_URL` from `web/lib/api.ts`.
3. **UI**: add `web/app/components/<feature>/` with the card, container and footer components, following the existing cards.
4. **Toggle**: add the card to `cards` in `web/lib/site-config.ts` so other creators can turn it on or off.

---

## License

Stream Page is released under the [MIT License](LICENSE).
