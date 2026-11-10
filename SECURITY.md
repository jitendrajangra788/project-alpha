# CareConnect security checklist

## Authentication & access

- [x] JWT access + refresh tokens; refresh revocation on logout
- [x] RBAC roles enforced on admin/clinical routes
- [x] Organization tenant isolation for private org data
- [x] Patient clinical data gated by consent
- [x] Video room join tokens are short-lived
- [x] Payment success verified server-side (Razorpay signature / mock rules)

## Production hardening (Phase 7)

- [x] Weak/default `SECRET_KEY` rejected when `APP_ENV=production`
- [x] OpenAPI docs disabled in production by default
- [x] Security response headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, HSTS in prod)
- [x] Rate limiting on API (stricter on auth/payments)
- [x] Trusted hosts configurable via `TRUSTED_HOSTS`
- [x] Redis required in production compose (`REDIS_OPTIONAL=false`)
- [x] Non-root container user for API image
- [x] Request ID propagation (`X-Request-ID`)

## Operational must-dos before go-live

- [ ] Rotate `SECRET_KEY`, DB password, Razorpay keys
- [ ] Terminate TLS at load balancer / reverse proxy
- [ ] Restrict admin network access (VPN / IP allowlist)
- [ ] Enable object-storage for uploads (replace local disk)
- [ ] Confirm webhook endpoint is HTTPS-only and signature-checked
- [ ] Review audit logs retention and PHI access procedures
- [ ] Run penetration test / vulnerability scan
- [ ] Document incident response contacts

## Data handling

- Never commit `.env` or key material
- Verified badges only when org status is `VERIFIED`
- Mock OTP / mock payments are clearly labeled and for non-production use
