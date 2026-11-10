# CareConnect on Vercel (multi-service + Postgres)

| Service | Path | Folder |
|---------|------|--------|
| Angular UI | `/` | `frontend/` |
| FastAPI | `/api/*` | `backend/` |
| Postgres | Neon via Vercel Storage | Marketplace |

Root `vercel.json` configures frontend + backend services.

## 1) Import project

1. https://vercel.com/new → select `jitendrajangra788/project-alpha`
2. **Import multi-service project**
3. Deploy once (API may fail until DB is connected — OK)

## 2) Connect Postgres (Neon) on Vercel

### Dashboard (recommended)

1. Vercel project → **Storage** → **Create Database** → **Neon Postgres** (or Marketplace → Neon)
2. Plan: **Free**
3. **Connect Project** → this project → environments: Production + Preview (+ Development)
4. Vercel injects `DATABASE_URL` / `POSTGRES_URL` automatically

### CLI (if logged in)

```bash
npx vercel login
npx vercel link
npx vercel install neon --name careconnect-db --billing-plan free -e production -e preview
npx vercel env pull .env.local --yes
```

## 3) Other required env vars

Project → Settings → Environment Variables:

| Name | Value |
|------|--------|
| `APP_ENV` | `production` |
| `SECRET_KEY` | 32+ random characters |
| `CORS_ORIGINS` | `https://YOUR-APP.vercel.app` |
| `FRONTEND_URL` | `https://YOUR-APP.vercel.app` |
| `REDIS_OPTIONAL` | `true` |
| `RAZORPAY_MOCK` | `true` |
| `TRUSTED_HOSTS` | `*` |
| `ENABLE_DOCS` | `true` |
| `API_BASE_URL` | `/api/v1` (optional; default) |

`DATABASE_URL` usually comes from Neon connection — do not invent it.

## 4) First boot: migrate + 3 demo entries

After Neon is connected, add these env vars (Production), then **Redeploy**:

| Name | Value |
|------|--------|
| `AUTO_MIGRATE` | `true` |
| `AUTO_SEED_THREE` | `true` |

On first API cold start this will:
1. Run Alembic migrations
2. Seed roles + **3 entries**: Admin, Patient, Hospital

| Login | Password |
|-------|----------|
| `admin@careconnect.local` | `Admin@12345` |
| `patient@careconnect.local` | `Demo@12345` |
| `hospital@careconnect.local` | `Demo@12345` |

After it works once, set `AUTO_SEED_THREE=false` (keep `AUTO_MIGRATE=true` if you want).

Manual local seed against Neon:

```powershell
$env:DATABASE_URL="postgres://…from Neon…"
$env:DATABASE_URL_SYNC=$env:DATABASE_URL
cd backend
python scripts/init_db.py
python scripts/seed_three_entries.py
```

## 5) Redeploy

Vercel → Deployments → Redeploy (or `git push`).

Health check: `https://YOUR-APP.vercel.app/api/v1/health`

## Notes

- Backend accepts `DATABASE_URL` **or** `POSTGRES_URL` (Neon/Vercel).
- Neon TLS (`ssl=require`) is auto-normalized for asyncpg/psycopg.
- Do not use SQLite on Vercel (ephemeral disk).
