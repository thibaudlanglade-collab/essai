# Synthèse (`te`)

Single-deployment Synthèse app: marketing / landing site **and** the actual
trial product live behind the same domain, **https://synthèse.fr**.

## What's in this repo

- `frontend/` — React + Vite SPA. Marketing pages (Home, Comprendre, Tarification, RGPD, Qui sommes-nous, Contact) **plus** the product UI (Emails, Planificateur, Assistant, Smart Extract, Mes agents IA, etc.).
- `backend/` — FastAPI server. Feature routers (planner, emails, automations, agents…) **plus** the `auth/` module that mints anonymous 14-day trial tokens.
- `Dockerfile` — multi-stage build: compiles the frontend, copies `frontend/dist` into the Python image, serves everything from uvicorn on `$PORT`.
- `railway.json` — tells Railway to use the Dockerfile.

Everything listens on one port. FastAPI serves `/api/*` and `/app/{token}` directly, and falls back to `index.html` for every other path so the React router can take over.

## How the trial flow works

1. Visitor clicks any "démo" CTA on the landing site.
2. If they already have a `synthese_trial` cookie with a `resumeUrl`, the browser jumps straight to it.
3. Otherwise they land on `/demo`. Clicking **Commencer ma démo gratuite** POSTs to `/api/auth/start-anonymous-trial` (same origin — no CORS, no second domain).
4. The backend mints an `AccessToken`, returns `{ token, access_url: "/app/<token>" }`.
5. Frontend navigates to `/app/<token>`, which the backend matches on, sets an httpOnly `session_token` cookie, and 302-redirects to `/welcome`.
6. `/welcome` is served by the SPA catch-all → React picks up from there.

## Deployment configuration (Railway)

One project, one service, one domain. The only env vars that matter for the trial flow:

| Variable | Set on | Value | Notes |
| --- | --- | --- | --- |
| `DATABASE_URL` | `te` runtime | *injected by Railway Postgres plugin* | **Required** in prod. Without it, the app falls back to SQLite, which Railway wipes on every redeploy — all trial tokens get orphaned. Attach a Postgres plugin from the canvas ("+ New" → "Database" → "Postgres") and Railway wires this var automatically. |
| `VITE_TRIAL_API_BASE` | `te` build | *leave unset* | Default is same-origin. Only set if the app ever gets split onto a separate domain. |
| `SYNTHESE_APP_URL` | `te` runtime | *leave unset* | Default is same-origin (relative `/app/{token}`). Only set if split onto a separate domain. |
| `SYNTHESE_DEV` | `te` runtime | *leave unset in prod* | Set to `1` only in local dev so the session cookie isn't marked `Secure` on http. |
| `ALLOWED_ORIGINS` | `te` runtime | *leave unset in prod* | Same-origin requests don't need CORS. Only needed if a separate frontend origin exists. |

Secrets you'll also want set: `OPENAI_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` (all required by the feature routers, not by the trial flow itself).

## Local development

```bash
# Backend
cd backend && uvicorn main:app --reload --port 8000

# Frontend (in another terminal)
cd frontend && npm install && npm run dev
```

The Vite dev server on `:5173` proxies `/api/*` and `/app/*` to the backend on `:8000`. In dev, set `SYNTHESE_DEV=1` so the session cookie is accepted over plain http.

See [`frontend/.env.example`](frontend/.env.example) for the full list of optional build-time env vars.
