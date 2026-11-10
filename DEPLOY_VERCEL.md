# CareConnect on Vercel (multi-service)

Vercel ab **frontend + backend** ek hi project me Services se deploy karta hai.

| Service | Path | Folder |
|---------|------|--------|
| Angular UI | `/` | `frontend/` |
| FastAPI | `/api/*` | `backend/` |

Root `vercel.json` already configures this.

## Import steps (Vercel UI)

1. Open https://vercel.com/new
2. Select `jitendrajangra788/project-alpha`
3. Click **Import multi-service project** (after `vercel.json` is on `main`)
4. Deploy

Agar purana warning dikhe (“needs a vercel.json”), page refresh / re-import karo — `main` pe latest commit hona chahiye.

## Environment variables (Project → Settings → Environment Variables)

Backend ke liye **required**:

| Name | Example |
|------|---------|
| `APP_ENV` | `production` |
| `SECRET_KEY` | 32+ random chars |
| `DATABASE_URL` | Neon/Supabase Postgres URL (`postgres://…` OK) |
| `CORS_ORIGINS` | `https://YOUR-APP.vercel.app` |
| `FRONTEND_URL` | `https://YOUR-APP.vercel.app` |
| `REDIS_OPTIONAL` | `true` |
| `RAZORPAY_MOCK` | `true` |
| `TRUSTED_HOSTS` | `*` |
| `ENABLE_DOCS` | `true` (optional) |

Frontend (optional — same-origin default already works):

| Name | Value |
|------|--------|
| `API_BASE_URL` | `/api/v1` |

> Postgres free host: [Neon](https://neon.tech) or [Supabase](https://supabase.com).  
> Vercel pe SQLite mat use karo (ephemeral disk).

After first deploy, run migrations once (local against production DB or a one-off job):

```bash
cd backend
$env:DATABASE_URL="postgresql+asyncpg://..."
$env:DATABASE_URL_SYNC="postgresql+psycopg://..."
alembic upgrade head
python -m app.seed
```

## Local check

```bash
# From repo root
npx vercel dev
```

## Notes

- API health: `https://YOUR-APP.vercel.app/api/v1/health`
- Video/WebRTC & large uploads have serverless limits; for heavy production prefer Render/Fly for API.
- Free Neon + Vercel is enough to open the full UI + login flows.
