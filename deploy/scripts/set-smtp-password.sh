#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="/opt/NovaOpsExecution/apps/api/.env"
PASSWORD="${1:?password required}"

python3 <<PY
import re
path = "$ENV_FILE"
password = """$PASSWORD"""
text = open(path).read()
text = re.sub(r"^SMTP_PASSWORD=.*", f"SMTP_PASSWORD={password}", text, flags=re.M)
open(path, "w").write(text)
PY

systemctl restart novaops-api
sleep 3

cd /opt/NovaOpsExecution/apps/api
.venv/bin/python <<'PY'
from app.services.email_service import EmailService

service = EmailService()
print("configured:", service.is_configured())
print(
    "sent:",
    service.send(
        "development.kov@gmail.com",
        "NovaOps SMTP Test",
        "Email SMTP NovaOps berhasil dikonfigurasi.",
    ),
)
PY
