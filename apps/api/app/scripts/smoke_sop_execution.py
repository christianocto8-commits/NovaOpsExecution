import json
import urllib.request

from app.core.database import SessionLocal
from app.modules.identity.models import User as IdentityUser
from app.modules.identity.security import create_access_token

BASE_URL = "http://127.0.0.1:8000/api/v1"


def request_json(url, *, method="GET", headers=None, payload=None):
    data = json.dumps(payload).encode() if payload is not None else None
    request = urllib.request.Request(
        url,
        data=data,
        headers=headers or {},
        method=method,
    )
    with urllib.request.urlopen(request, timeout=10) as response:
        return response.status, json.loads(response.read().decode())


def build_token():
    db = SessionLocal()
    try:
        user = db.query(IdentityUser).filter(IdentityUser.email == "admin@novaops.local").first()
        if not user:
            raise RuntimeError("admin@novaops.local identity user not found")

        return create_access_token(
            subject=user.id,
            extra_claims={
                "role": user.role.slug,
                "outlet_id": str(user.outlet_id) if user.outlet_id else None,
                "permissions": [permission.code for permission in user.role.permissions],
                "token_version": 1,
            },
        )
    finally:
        db.close()


def main():
    token = build_token()
    auth_headers = {
        "Authorization": f"Bearer {token}",
        "X-Outlet-Id": "1",
        "Content-Type": "application/json",
    }

    _, task = request_json(
        f"{BASE_URL}/tasks",
        method="POST",
        headers=auth_headers,
        payload={
            "title": "Daily Opening SOP Smoke Task",
            "description": "Created by NovaOps backend integration smoke check.",
            "priority": "medium",
            "due_date": None,
            "source_type": "sop_task",
            "source_id": None,
            "assigned_to": None,
        },
    )

    _, session = request_json(
        f"{BASE_URL}/execution-sessions",
        method="POST",
        headers={"Content-Type": "application/json"},
        payload={
            "task_id": task["id"],
            "source_type": "sop_task",
            "status": "completed",
            "answers_json": {
                "operator": {"name": "NovaOps QA", "position": "Lead Barista"},
                "responses": {"opening-ready": "yes"},
                "note": "Smoke execution session saved.",
            },
            "submitted_by": None,
        },
    )

    request_json(
        f"{BASE_URL}/tasks/{task['id']}/status",
        method="PATCH",
        headers=auth_headers,
        payload={"status": "in_progress"},
    )
    _, completed = request_json(
        f"{BASE_URL}/tasks/{task['id']}/status",
        method="PATCH",
        headers=auth_headers,
        payload={"status": "completed"},
    )

    print(f"created_task={task['id']}")
    print(f"execution_session={session['id']}")
    print(f"task_status={completed['status']}")


if __name__ == "__main__":
    main()