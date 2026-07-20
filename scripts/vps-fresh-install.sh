#!/usr/bin/env bash
set -euo pipefail

ROOT="/opt/NovaOpsExecution"
API_DIR="$ROOT/apps/api"
WEB_STANDALONE="$ROOT/apps/web/.next/standalone"
ENV_BACKUP="/root/novaops-api.env.bak"

echo "==> Stop services"
systemctl stop novaops-web novaops-api || true

if [ "${SKIP_WIPE:-0}" != "1" ]; then
  echo "==> Backup API env"
  if [ -f "$API_DIR/.env" ]; then
    cp "$API_DIR/.env" "$ENV_BACKUP"
    echo "Saved $ENV_BACKUP"
  elif [ -f "$ENV_BACKUP" ]; then
    echo "Using existing backup $ENV_BACKUP"
  else
    echo "WARNING: no API .env backup found"
  fi

  echo "==> Remove old install"
  rm -rf "$ROOT"
  mkdir -p "$API_DIR" "$ROOT/apps/web/.next" "$ROOT/deploy/systemd" "$ROOT/deploy/nginx" "$ROOT/scripts"
fi

echo "==> Restore API env"
if [ -f "$ENV_BACKUP" ]; then
  cp "$ENV_BACKUP" "$API_DIR/.env"
fi

echo "==> Setup API venv + deps"
cd "$API_DIR"
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo "==> Run migrations"
alembic upgrade head

echo "==> Install systemd + nginx"
cp "$ROOT/deploy/systemd/novaops-api.service" /etc/systemd/system/
cp "$ROOT/deploy/systemd/novaops-web.service" /etc/systemd/system/
cp "$ROOT/deploy/nginx/novaops-vps.conf" /etc/nginx/sites-available/novaops
ln -sf /etc/nginx/sites-available/novaops /etc/nginx/sites-enabled/novaops
rm -f /etc/nginx/sites-enabled/default
systemctl daemon-reload

echo "==> Start services"
systemctl enable novaops-api novaops-web
systemctl restart novaops-api
sleep 5
systemctl restart novaops-web nginx

echo "==> Health check"
curl -sf http://127.0.0.1:8000/api/v1/health
echo ""
curl -sfI http://127.0.0.1/ | head -n 1
echo "Fresh install selesai."
