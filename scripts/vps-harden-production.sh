#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${NOVAOPS_ENV_FILE:-/opt/NovaOpsExecution/apps/api/.env}"
API_DIR="/opt/NovaOpsExecution/apps/api"
ROOT="/opt/NovaOpsExecution"
CREDS_FILE="/root/novaops-production-credentials.txt"
DOMAIN="${NOVAOPS_DOMAIN:-nova-ops.cloud}"
EXPECTED_IP="${NOVAOPS_VPS_IP:-103.247.10.145}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE" >&2
  exit 1
fi

NEW_ADMIN_PASS="$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)"
NEW_SCHEDULER_SECRET="$(openssl rand -hex 32)"

cp "$ENV_FILE" "${ENV_FILE}.bak.$(date +%Y%m%d%H%M%S)"

export NEW_ADMIN_PASS NEW_SCHEDULER_SECRET

python3 <<'PY'
import re
from pathlib import Path

env_file = Path("/opt/NovaOpsExecution/apps/api/.env")
new_admin = __import__("os").environ["NEW_ADMIN_PASS"]
new_scheduler = __import__("os").environ["NEW_SCHEDULER_SECRET"]

text = env_file.read_text(encoding="utf-8")

def set_key(text: str, key: str, value: str) -> str:
    line = f"{key}={value}"
    pattern = rf"^{re.escape(key)}=.*$"
    if re.search(pattern, text, flags=re.M):
        return re.sub(pattern, line, text, flags=re.M)
    return text.rstrip() + "\n" + line + "\n"

text = set_key(text, "TASK_SCHEDULER_SECRET", new_scheduler)
text = set_key(text, "BOOTSTRAP_ADMIN_PASSWORD", new_admin)
text = set_key(text, "BOOTSTRAP_ADMIN_ENABLED", "false")

for key, default in [
    ("SMTP_HOST", ""),
    ("SMTP_PORT", "587"),
    ("SMTP_USER", ""),
    ("SMTP_PASSWORD", ""),
    ("SMTP_FROM", "novaops@nova-ops.cloud"),
]:
    if not re.search(rf"^{re.escape(key)}=", text, flags=re.M):
        text = set_key(text, key, default)

env_file.write_text(text, encoding="utf-8")
print("Updated .env secrets and SMTP placeholders")
PY

cd "$API_DIR"
source .venv/bin/activate

python3 <<'PY'
import os

os.chdir("/opt/NovaOpsExecution/apps/api")

from app.core.database import SessionLocal
from app.modules.identity.models import User
from app.modules.identity.security import hash_password

new_pass = os.environ["NEW_ADMIN_PASS"]
db = SessionLocal()
try:
    user = db.query(User).filter(User.email == "admin@novaops.com").first()
    if not user:
        raise SystemExit("Admin user admin@novaops.com not found")
    user.password_hash = hash_password(new_pass)
    db.commit()
    print("Admin password rotated in database")
finally:
    db.close()
PY

resolve_domain() {
  python3 - <<PY
import socket
try:
    print(socket.gethostbyname("${DOMAIN}"))
except Exception:
    print("")
PY
}

DOMAIN_IP="$(resolve_domain)"
if [[ -n "$DOMAIN_IP" && "$DOMAIN_IP" == "$EXPECTED_IP" ]]; then
  echo "DNS OK (${DOMAIN} -> ${DOMAIN_IP}). Attempting SSL..."
  if [[ -x "${ROOT}/scripts/vps-setup-ssl.sh" ]]; then
    NOVAOPS_DOMAIN="$DOMAIN" bash "${ROOT}/scripts/vps-setup-ssl.sh" || echo "SSL setup failed; retry after DNS fully propagates."
  else
    echo "Missing ${ROOT}/scripts/vps-setup-ssl.sh — upload scripts/ and deploy/nginx/ first."
  fi
else
  echo "Skipping SSL: ${DOMAIN} resolves to '${DOMAIN_IP:-<none>}' (expected ${EXPECTED_IP})."
  echo "Configure Rumahweb DNS A records, wait for propagation, then run:"
  echo "  NOVAOPS_DOMAIN=${DOMAIN} bash ${ROOT}/scripts/vps-setup-ssl.sh"
fi

systemctl restart novaops-api novaops-web
systemctl reload nginx || true
systemctl try-restart novaops-scheduler.timer 2>/dev/null || true

cat >"$CREDS_FILE" <<EOF
NovaOps production credentials ($(date -Iseconds))

Admin login: admin@novaops.com
Admin password: ${NEW_ADMIN_PASS}
TASK_SCHEDULER_SECRET: ${NEW_SCHEDULER_SECRET}

SMTP (fill in ${ENV_FILE} to enable email):
  SMTP_HOST=
  SMTP_PORT=587
  SMTP_USER=
  SMTP_PASSWORD=
  SMTP_FROM=novaops@nova-ops.cloud

SSL: https://${DOMAIN} (after DNS + certbot)
EOF
chmod 600 "$CREDS_FILE"

echo ""
echo "Hardening complete."
echo "Credentials: ${CREDS_FILE}"
curl -sf http://127.0.0.1:8000/api/v1/health >/dev/null && echo "API health: OK"
