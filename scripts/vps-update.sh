#!/usr/bin/env bash
set -euo pipefail

ROOT="/opt/NovaOpsExecution"
API_DIR="$ROOT/apps/api"
WEB_DIR="$ROOT/apps/web"

echo "==> Pull latest code"
cd "$ROOT"
git fetch origin main
git reset --hard origin/main

echo "==> Update API"
cd "$API_DIR"
if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
systemctl restart novaops-api

echo "==> Build web (standalone)"
cd "$WEB_DIR"
export NEXT_PUBLIC_USE_RELATIVE_API=true
npm ci
npm run build
cp -rf public .next/standalone/public
mkdir -p .next/standalone/.next
cp -rf .next/static .next/standalone/.next/static

echo "==> Restart web"
systemctl restart novaops-web
systemctl restart nginx || true

echo "==> Health check"
curl -sf http://127.0.0.1/api/v1/health
echo ""
curl -sfI http://127.0.0.1/ | head -n 1
echo "Deploy selesai."
