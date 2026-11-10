# CareConnect → Vercel (frontend) + Render (API)

Poora HCMS **sirf Vercel pe nahi** chal sakta (FastAPI + Postgres chahiye).  
Is setup me:

| Part | Host |
|------|------|
| Angular UI | **Vercel** |
| FastAPI + Postgres | **Render** (free blueprint) |

## 1) Backend pehle (Render)

1. [render.com](https://render.com) pe login
2. **New → Blueprint** → yeh GitHub repo select karo (`render.yaml` auto pick hoga)
3. Service env me set karo (Vercel URL milne ke baad update karna):
   - `CORS_ORIGINS` = `https://YOUR-APP.vercel.app`
   - `FRONTEND_URL` = `https://YOUR-APP.vercel.app`
4. Deploy ke baad API URL note karo, jaise:  
   `https://careconnect-api.onrender.com`
5. Check: `https://careconnect-api.onrender.com/api/v1/health`

## 2) Frontend (Vercel)

1. [vercel.com](https://vercel.com) → **Add New Project** → same GitHub repo
2. **Root Directory**: repo root chhodo (root `vercel.json` already set hai)
3. Framework: Other / no framework (vercel.json controls build)
4. Environment Variable add karo:

| Name | Value |
|------|--------|
| `API_BASE_URL` | `https://careconnect-api.onrender.com/api/v1` |

5. Deploy

Build automatically:
- `npm install --prefix frontend`
- `npm run build:vercel` (injects API URL + production Angular build)
- serves `frontend/dist/frontend/browser`

## 3) CORS sync

Vercel URL milne ke baad Render pe `CORS_ORIGINS` / `FRONTEND_URL` update karke API **redeploy** karo.

## Local test of Vercel build

```bash
cd frontend
$env:API_BASE_URL="http://localhost:8000/api/v1"
npm run build:vercel
```

Output: `frontend/dist/frontend/browser`

## Notes

- Free Render web service sleep ho sakta hai; pehla request slow ho sakta hai.
- WebRTC / uploads ke liye production me paid plan + persistent disk better hai.
- Seed admin (default): `admin@careconnect.local` / `Admin@12345` — pehle change karo.
