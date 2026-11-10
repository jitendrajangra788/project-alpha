# CareConnect deployment guide

## Environments

| Env | Purpose |
|-----|---------|
| `development` | Local SQLite/Postgres, mock Razorpay, OpenAPI docs on |
| `production` | Docker Compose prod stack, Redis required, docs off by default |

## Production stack

```bash
cp .env.example .env
# Edit: SECRET_KEY (32+ chars, not the sample), POSTGRES_PASSWORD, CORS_ORIGINS, Razorpay keys

docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec api alembic upgrade head
docker compose -f docker-compose.prod.yml exec api python -m app.seed
```

- Web: `http://localhost` (or `WEB_PORT`)
- API via nginx: `http://localhost/api/v1/health`
- Live probe: `/api/v1/live`
- Ready probe: `/api/v1/ready`
- Metrics: `/api/v1/metrics`

## Required production env

- `APP_ENV=production`
- `SECRET_KEY` — unique, ≥32 chars, not a known default
- `POSTGRES_PASSWORD`
- `CORS_ORIGINS` — explicit frontend origins (no `*`)
- `REDIS_OPTIONAL=false`
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET`
- `RAZORPAY_MOCK=false` for live payments

Optional: `ENABLE_DOCS=true` to expose `/docs` behind your edge auth.

## Backups

```bash
# Dump
./scripts/backup_postgres.sh

# Restore
./scripts/restore_postgres.sh backups/careconnect_YYYYMMDDTHHMMSSZ.sql.gz
```

Schedule daily via cron:

```cron
0 2 * * * /path/to/HCMS/scripts/backup_postgres.sh >> /var/log/careconnect-backup.log 2>&1
```

Keep dumps off-box (S3/object storage). Script retains the newest 14 local dumps.

## Monitoring

- Liveness: `GET /api/v1/live`
- Readiness: `GET /api/v1/ready` (DB required; Redis required when not optional)
- Prometheus text: `GET /api/v1/metrics`
- JSON summary: `GET /api/v1/metrics/json`
- Correlate logs with `X-Request-ID` response header

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs backend pytest and frontend production build on push/PR.

## Rollback

1. Redeploy previous image tags / git SHA
2. If a migration is unsafe to reverse, restore DB from the pre-deploy backup first
3. Confirm `/api/v1/ready` returns `ready`
