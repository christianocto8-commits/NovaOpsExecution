#!/usr/bin/env bash
# NovaOps VPS all-in-one: PostgreSQL local + API + Next.js (no Neon)
set -euo pipefail

ROOT="/opt/NovaOpsExecution"
API_DIR="$ROOT/apps/api"
DB_NAME="novaops_db"
DB_USER="novaops_user"
DB_PASS="${NOVAOPS_DB_PASSWORD:-novaops_vps_db_2026}"

echo "==> Install system packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq git curl nginx postgresql postgresql-contrib \
  python3 python3-venv python3-pip ca-certificates gnupg

if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -qq nodejs
fi

echo "==> PostgreSQL database"
systemctl enable postgresql
systemctl start postgresql

sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';"

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"

sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"
sudo -u postgres psql -d "${DB_NAME}" -c "GRANT ALL ON SCHEMA public TO ${DB_USER};"
sudo -u postgres psql -d "${DB_NAME}" -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${DB_USER};"

echo "==> API venv + migrations"
cd "$API_DIR"
python3 -m venv .venv
source .venv/bin/activate
pip install -q --upgrade pip
pip install -q -r requirements.txt
alembic upgrade head

echo "==> Systemd + nginx"
cp "$ROOT/deploy/systemd/novaops-api.service" /etc/systemd/system/
cp "$ROOT/deploy/systemd/novaops-web.service" /etc/systemd/system/
cp "$ROOT/deploy/nginx/novaops-vps.conf" /etc/nginx/sites-available/novaops
ln -sf /etc/nginx/sites-available/novaops /etc/nginx/sites-enabled/novaops
rm -f /etc/nginx/sites-enabled/default

systemctl daemon-reload
systemctl enable novaops-api novaops-web postgresql nginx
systemctl restart postgresql novaops-api
sleep 8
systemctl restart novaops-web nginx

echo "==> Health"
curl -sf http://127.0.0.1:8000/api/v1/health
echo ""
curl -sfI http://127.0.0.1/ | head -n 1
echo "All-in-one setup selesai (no Neon). DB=127.0.0.1:5432/${DB_NAME}"
