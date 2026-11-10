# CareConnect

Multi-vendor healthcare marketplace and telemedicine platform.

**Phase 1 (Foundation)** is implemented: authentication, RBAC, organization registration, admin verification, and configurable branding.

Default brand: **CareConnect** (change from Admin → Platform Settings).

## Stack

| Layer | Technology |
|------|------------|
| Frontend | Angular 19, Angular Material, SCSS, standalone components |
| Backend | FastAPI, SQLAlchemy 2, Alembic, Pydantic, JWT |
| Database | PostgreSQL + PostGIS (Docker). SQLite fallback for local smoke tests |
| Cache | Redis (optional in-memory OTP store when Redis is down) |

## Quick start

### 1. Preferred: Docker Postgres + Redis

```bash
docker compose up -d
cp .env.example .env
```

### 2. Backend

```bash
cd backend
python -m venv .venv

# Windows PowerShell
.\.venv\Scripts\Activate.ps1

pip install -r requirements.txt
```

**With Docker/Postgres running:**

```bash
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload --port 8000
```

**Without Docker (local fallback used on this machine):**

```bash
python scripts/bootstrap_local.py
# then start API with SQLite:
$env:DATABASE_URL="sqlite+aiosqlite:///./careconnect.db"
$env:DATABASE_URL_SYNC="sqlite:///./careconnect.db"
uvicorn app.main:app --reload --port 8000
```

- API docs: http://localhost:8000/docs
- Health: http://localhost:8000/api/v1/health

**Seed admin**

- Email: `admin@careconnect.local`
- Password: `Admin@12345`

### 3. Frontend

```bash
cd frontend
npm install
npm start
```

App: http://localhost:4200

### 4. Tests

```bash
cd backend
pytest -q
```

## Phase 1 + Phase 2 features delivered

### Phase 1 — Foundation
- Patient and doctor registration / login
- JWT access + refresh tokens with logout revocation
- 16 seeded roles including SUPER_ADMIN, PATIENT, DOCTOR, org owners, clinical staff
- Organization registration (hospital, clinic, nursing home, home care, lab, diagnostic centre)
- Document upload for verification
- Admin dashboard, users list, verification queue (approve / reject / request docs / under review)
- Platform brand settings API + admin UI
- Organization tenant isolation (member-only private org access)
- Verified badge flag only when status is `VERIFIED`

### Phase 2 — Marketplace
- Categories + specialties
- Unified listings for doctors and organizations
- Public search with filters (city, PIN, type, verified, home visit, online consult, sample collection, fee)
- Marketplace home sections (doctors, hospitals, labs, home care, featured)
- Listing detail pages
- Auto-sync listings when orgs/doctors register or get verified
- Demo seed data clearly unlabeled as verified (`python -m app.seed_marketplace`)

## Deploy (Vercel multi-service)

See **[DEPLOY_VERCEL.md](DEPLOY_VERCEL.md)** — Angular (`/`) + FastAPI (`/api`) in one Vercel project via `services` in `vercel.json`.

Quick: Import multi-service project on Vercel, set `DATABASE_URL` + `SECRET_KEY` + `CORS_ORIGINS`, deploy.

## Project layout

```text
HCMS/
  docker-compose.yml
  vercel.json
  render.yaml
  DEPLOY_VERCEL.md
  .env.example
  README.md
  backend/
    app/                 # FastAPI application
    alembic/             # migrations
    tests/               # auth, RBAC, org isolation
    scripts/bootstrap_local.py
  frontend/
    src/app/
      core/              # auth, guards, interceptors, services
      layouts/           # public, admin, provider
      features/          # home, auth, admin, provider
```

## API map (Phase 1)

- `POST /api/v1/auth/register/patient|doctor`
- `POST /api/v1/auth/login|refresh|logout`
- `POST /api/v1/auth/otp/request|verify` (mock/dev OTP channel)
- `GET|PATCH /api/v1/users/me`
- `POST|GET|PATCH /api/v1/organizations...`
- `POST /api/v1/organizations/{id}/documents`
- `POST /api/v1/organizations/{id}/verification` (admin)
- `GET /api/v1/admin/dashboard|users|roles|verifications`
- `GET|PATCH /api/v1/platform-settings`
- `GET /api/v1/health`

### Phase 3 — Bookings
- Shared booking engine for doctor/org/lab/home-care listings
- Auto-generated availability slots
- Create / cancel / reschedule / provider confirm-reject-complete
- Double-booking prevention
- In-app + mock notification records
- Patient **My Bookings** and provider **Bookings** UI

### Phase 4 — Healthcare operations
- Patient dashboard + medical timeline
- Consent grant/revoke for doctor/org access
- Doctor prescriptions (finalized, versioned medicines)
- Lab test catalogue hooks + report workflow: DRAFT → PENDING_APPROVAL → PUBLISHED
- Patients can only view published lab reports
- Role dashboards: `/patient`, `/doctor`, `/lab`

### Phase 5 — Telemedicine
- Video sessions linked to online bookings
- Short-lived room join tokens (no permanent credentials)
- WebRTC signaling websocket + STUN ICE servers
- Doctor/patient join UI with mute/camera/end controls
- End consultation saves notes/diagnosis to clinical record
- Unauthorized participants blocked

### Phase 6 — Payments
- Razorpay gateway with **mock adapter** when keys are empty (`RAZORPAY_MOCK=true`)
- Booking payments with backend signature verification (never trust frontend alone)
- Idempotent order creation + verify
- Platform commission split (default 10%)
- Invoices, refunds, ledger transactions
- Provider subscription plans (Basic / Growth / Featured)
- Featured listing activation on paid subscription
- Admin commissions + payout settlement UI
- Provider billing/earnings UI; patient Pay now on My Bookings
- Webhook endpoint: `POST /api/v1/payments/webhook`

### Phase 7 — Production readiness
- Security headers, request IDs, rate limiting (auth/payments stricter)
- Production config guards (weak `SECRET_KEY` / open CORS rejected)
- OpenAPI docs off by default in production
- Liveness `/live`, readiness `/ready`, Prometheus `/metrics`
- Docker prod stack: `docker-compose.prod.yml` (db + redis + api + nginx web)
- Postgres backup/restore scripts under `scripts/`
- GitHub Actions CI (pytest + Angular production build)
- Ops docs: [DEPLOYMENT.md](DEPLOYMENT.md), [SECURITY.md](SECURITY.md)

## Ops docs

- Deploy: [DEPLOYMENT.md](DEPLOYMENT.md)
- Security checklist: [SECURITY.md](SECURITY.md)
