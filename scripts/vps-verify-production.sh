#!/usr/bin/env bash
set -euo pipefail

API="http://127.0.0.1:8000/api/v1"
ENV_FILE="${NOVAOPS_ENV_FILE:-/opt/NovaOpsExecution/apps/api/.env}"

python3 <<'PY'
import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

api = "http://127.0.0.1:8000/api/v1"
env_file = Path("/opt/NovaOpsExecution/apps/api/.env")
text = env_file.read_text(encoding="utf-8")
match = re.search(r"^BOOTSTRAP_ADMIN_PASSWORD=(.*)$", text, re.M)
password = match.group(1).strip() if match else ""
if not password:
    print("Missing admin password in .env", file=sys.stderr)
    sys.exit(1)

payload = json.dumps({"identifier": "admin@novaops.com", "password": password}).encode()
req = urllib.request.Request(
    f"{api}/auth/login",
    data=payload,
    headers={"Content-Type": "application/json"},
    method="POST",
)
try:
    token = json.load(urllib.request.urlopen(req))["access_token"]
except urllib.error.HTTPError as exc:
    print("LOGIN_FAILED", exc.read().decode(), file=sys.stderr)
    sys.exit(1)

def get(path: str):
    req = urllib.request.Request(f"{api}{path}", headers={"Authorization": f"Bearer {token}"})
    return json.load(urllib.request.urlopen(req))

print("==> Compliance reports")
print(json.dumps(get("/reports/compliance"), indent=2))

print("==> Tasks")
tasks = get("/tasks")
print(len(tasks), "tasks")
if tasks:
    first = tasks[0]
    print("first:", first.get("title"), "form_template_id=", first.get("form_template_id"), "source_type=", first.get("source_type"))

print("==> Form template 28")
template = get("/form-templates/28")
print(template.get("title"), len(template.get("fields", [])), "fields")
print("VERIFY_OK")
PY
