#!/usr/bin/env bash
# Verify crew task flow on VPS (template fields + task linkage).
set -euo pipefail

cd /opt/NovaOpsExecution/apps/api
source .venv/bin/activate
export PYTHONPATH=/opt/NovaOpsExecution/apps/api

python3 <<'PY'
import json
import re
import urllib.error
import urllib.request
from pathlib import Path

api = "http://127.0.0.1:8000/api/v1"
text = Path("/opt/NovaOpsExecution/apps/api/.env").read_text(encoding="utf-8")
password = re.search(r"^BOOTSTRAP_ADMIN_PASSWORD=(.*)$", text, re.M).group(1).strip()

def login(identifier: str, password: str) -> str:
    payload = json.dumps({"identifier": identifier, "password": password}).encode()
    req = urllib.request.Request(
        f"{api}/auth/login",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    return json.load(urllib.request.urlopen(req))["access_token"]

def get(path: str, token: str, outlet_id: str | None = None):
    headers = {"Authorization": f"Bearer {token}"}
    if outlet_id:
        headers["X-Outlet-Id"] = outlet_id
    req = urllib.request.Request(f"{api}{path}", headers=headers)
    return json.load(urllib.request.urlopen(req))

token = login("admin@novaops.com", password)
tasks = get("/tasks", token)
print("TASKS", len(tasks))
assert tasks, "No tasks available for crew UAT"

task = tasks[0]
print("TASK", task["id"], task["title"], "source_type=", task.get("source_type"), "form_template_id=", task.get("form_template_id"))

template_id = task.get("form_template_id") or (task.get("source_id") if task.get("source_type") == "form_template" else None)
assert template_id, "Task has no linked form template"

template = get(f"/form-templates/{template_id}", token)
fields = template.get("fields") or []
print("TEMPLATE", template.get("title"), "fields=", len(fields))
assert len(fields) > 0, "Template has no checklist fields"

compliance = get("/reports/compliance", token)
print("COMPLIANCE", json.dumps(compliance))
assert isinstance(compliance, list) and len(compliance) >= 3, "Compliance report failed"

print("CREW_UAT_READY")
PY
