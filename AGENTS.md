# AGENTS.md

See `GEMINI.md` for general engineering guidelines and `LOCAL_DEV.md` for the (Windows/PowerShell-oriented) developer workflow.

## Cursor Cloud specific instructions

This monorepo is a single product, **NovaOps Enterprise** (multi-outlet operations execution platform), made of three apps: `apps/api` (FastAPI backend), `apps/web` (Next.js frontend), and `apps/mobile` (Capacitor shell, docs only). The documented dev CLI (`novaops.ps1`, `bootstrap.ps1`, `scripts/*.ps1`) is **Windows PowerShell-only** and hardcodes Windows paths — do not use it on this Linux VM. Start services manually as described below.

### Services and how to run them (dev mode)

| Service | Directory | Command | URL |
|---------|-----------|---------|-----|
| PostgreSQL 16 | — | native cluster on port **5433** (see below) | `localhost:5433` |
| API (FastAPI) | `apps/api` | `set -a && . ./.env && set +a && ./.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000` | http://localhost:8000 (docs at `/docs`, health at `/api/v1/health`) |
| Web (Next.js) | `apps/web` | `npm run dev` | http://localhost:3000 |

MinIO (S3), SSO, Twilio, FCM/VAPID are all optional; without them evidence uploads fall back to local disk and those features are simply disabled.

### Database

- PostgreSQL runs as a **native apt-installed cluster** (not Docker; Docker is not installed in this environment). The repo's `docker-compose.yml` uses port 5433, so the native cluster is configured to listen on **5433** to match the default `DATABASE_URL`.
- Start the cluster if it is down: `sudo pg_ctlcluster 16 main start` (check status with `sudo pg_lsclusters`). It does not auto-start on VM boot.
- Credentials/db (matching `.env.example`): user `novaops_user`, password `novaops_password`, db `novaops_db`.
- Migrations: from `apps/api`, `set -a && . ./.env && set +a && ./.venv/bin/alembic upgrade head`. On API startup, `app/main.py` auto-seeds the admin (`admin@novaops.com` / `admin123`) and Zenput-like operational templates + daily schedules, but Alembic migrations must be applied first.

### Env files

- `apps/api/.env` and `apps/web/.env.local` are gitignored and already created in this environment (copied from the `.env.example` files). Recreate them from the examples if missing.
- `apps/api/app/core/config.py` calls `load_dotenv(override=True)`, so values in `apps/api/.env` **override** shell environment variables. To change a backend setting for a run, edit `apps/api/.env` (setting a shell env var will not take effect).

### Lint / test / build

- Web lint: `cd apps/web && npm run lint`. Typecheck/build: `npm run typecheck`, `npm run build`.
- API tests: `cd apps/api && ./.venv/bin/python -m pytest -q` (needs Postgres running; loads `apps/api/.env`).
- **Gotcha:** the login endpoint is rate-limited via `LOGIN_RATE_LIMIT_PER_MINUTE` (default 10). The pytest suite has 40+ module-scoped login fixtures, so at the default limit the full run produces spurious `429 Too Many Requests` errors (individual files still pass). For a clean full-suite run, set a high `LOGIN_RATE_LIMIT_PER_MINUTE` in `apps/api/.env` (this dev environment already sets it high).
- The login API expects an `identifier` field (email or username), not `email`.

### Auth / default login

- Default admin (auto-seeded): email `admin@novaops.com`, password `admin123`, role `owner`.
