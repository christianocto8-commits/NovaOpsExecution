#!/bin/sh
set -eu

echo "[start] Running database migrations (90s timeout)..."
if timeout 90 alembic upgrade head; then
  echo "[start] Migrations complete."
else
  echo "[start] Migration failed or timed out. Check DATABASE_URL and Neon connectivity." >&2
  exit 1
fi

echo "[start] Starting API on port ${PORT:-8000}..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
