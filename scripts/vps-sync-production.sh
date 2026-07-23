#!/usr/bin/env bash
# Post-deploy VPS sync: nginx, systemd timers, hardening, backup smoke test, verification.
set -euo pipefail

ROOT="${NOVAOPS_ROOT:-/opt/NovaOpsExecution}"
ENV_FILE="${NOVAOPS_ENV_FILE:-$ROOT/apps/api/.env}"

echo "==> NovaOps VPS production sync"
echo "Root: $ROOT"

echo "==> Nginx config (keep-alive + API routing)"
if [[ -f "$ROOT/deploy/nginx/novaops-vps-ssl.conf" ]]; then
  cp "$ROOT/deploy/nginx/novaops-vps-ssl.conf" /etc/nginx/sites-available/novaops
  ln -sf /etc/nginx/sites-available/novaops /etc/nginx/sites-enabled/novaops
  nginx -t
  systemctl reload nginx
  echo "Nginx reloaded"
else
  echo "WARN: missing $ROOT/deploy/nginx/novaops-vps-ssl.conf" >&2
fi

echo "==> Systemd units (scheduler + backup)"
chmod +x "$ROOT/deploy/scripts/novaops-scheduler-run.sh" 2>/dev/null || true
chmod +x "$ROOT/scripts/backup-novaops-vps.sh" 2>/dev/null || true
chmod +x "$ROOT/scripts/vps-harden-production.sh" 2>/dev/null || true

cp "$ROOT/deploy/systemd/novaops-scheduler.service" /etc/systemd/system/
cp "$ROOT/deploy/systemd/novaops-scheduler.timer" /etc/systemd/system/
cp "$ROOT/deploy/systemd/novaops-backup.service" /etc/systemd/system/
cp "$ROOT/deploy/systemd/novaops-backup.timer" /etc/systemd/system/

systemctl daemon-reload
systemctl enable novaops-scheduler.timer novaops-backup.timer
systemctl start novaops-scheduler.timer novaops-backup.timer
echo "Scheduler timer: $(systemctl is-active novaops-scheduler.timer)"
echo "Backup timer: $(systemctl is-active novaops-backup.timer)"

echo "==> Production hardening (rotate admin password, disable bootstrap)"
if [[ -f "$ROOT/scripts/vps-harden-production.sh" ]]; then
  if grep -qE '^BOOTSTRAP_ADMIN_ENABLED=(true|1|yes)' "$ENV_FILE" 2>/dev/null; then
    bash "$ROOT/scripts/vps-harden-production.sh"
  else
    echo "Bootstrap already disabled — skipping password rotation"
    systemctl restart novaops-api novaops-web
  fi
else
  echo "WARN: hardening script missing" >&2
fi

echo "==> Backup smoke test"
if [[ -x "$ROOT/scripts/backup-novaops-vps.sh" ]]; then
  NOVAOPS_ENV_FILE="$ENV_FILE" bash "$ROOT/scripts/backup-novaops-vps.sh"
else
  echo "WARN: backup script missing" >&2
fi

echo "==> Scheduler smoke test"
if [[ -x "$ROOT/deploy/scripts/novaops-scheduler-run.sh" ]]; then
  NOVAOPS_ENV_FILE="$ENV_FILE" bash "$ROOT/deploy/scripts/novaops-scheduler-run.sh"
else
  echo "WARN: scheduler script missing" >&2
fi

echo "==> Health verification"
curl -sf http://127.0.0.1:8000/api/v1/health
echo ""
curl -sf http://127.0.0.1/api/v1/health
echo ""
curl -sf https://nova-ops.cloud/api/v1/health
echo ""
curl -sf https://nova-ops.cloud/api/keep-alive
echo ""

echo "==> Task template integrity"
sudo -u postgres psql -d novaops_db -t -A -c \
  "SELECT count(*) FROM task_schedules WHERE form_template_id IS NULL AND is_active = true;" | {
  read -r missing
  if [[ "${missing:-0}" != "0" ]]; then
    echo "WARN: $missing active schedule(s) without form_template_id" >&2
  else
    echo "All active schedules have form templates"
  fi
}

echo ""
echo "VPS production sync complete."
echo "Admin credentials (if rotated): /root/novaops-production-credentials.txt"
