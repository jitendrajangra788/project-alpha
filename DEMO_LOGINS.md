# CareConnect demo logins

Login: http://localhost:4200/login  
Identifier = **email or mobile**

| Role | Email | Mobile | Password |
|------|-------|--------|----------|
| Super Admin | `admin@careconnect.local` | `9999999999` | `Admin@12345` |
| Patient | `patient@careconnect.local` | `9800000001` | `Demo@12345` |
| Patient 2 | `patient2@careconnect.local` | `9800000002` | `Demo@12345` |
| Doctor | `doctor@careconnect.local` | `9810000001` | `Demo@12345` |
| Doctor 2 | `doctor2@careconnect.local` | `9810000002` | `Demo@12345` |
| Hospital owner | `hospital@careconnect.local` | `9820000001` | `Demo@12345` |
| Clinic owner | `clinic@careconnect.local` | `9820000002` | `Demo@12345` |
| Lab owner | `lab@careconnect.local` | `9820000003` | `Demo@12345` |
| Home-care owner | `homecare@careconnect.local` | `9820000004` | `Demo@12345` |
| Nursing-home owner | `nursing@careconnect.local` | `9820000005` | `Demo@12345` |

Re-seed anytime:

```bash
cd backend
$env:DATABASE_URL="sqlite+aiosqlite:///./careconnect.db"
$env:DATABASE_URL_SYNC="sqlite:///./careconnect.db"
python -m app.seed_marketplace
python -m app.seed_demo_users
```
