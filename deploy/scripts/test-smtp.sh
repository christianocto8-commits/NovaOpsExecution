#!/usr/bin/env bash
set -a
source /opt/NovaOpsExecution/apps/api/.env
set +a
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
