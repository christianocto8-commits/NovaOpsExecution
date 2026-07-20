import pytest


def test_health_is_public(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_login_returns_token(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"identifier": "admin@novaops.com", "password": "admin123"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["access_token"]
    assert payload["token_type"] == "bearer"


def test_protected_routes_require_auth(client):
    protected_gets = [
        "/api/v1/settings",
        "/api/v1/execution-sessions",
        "/api/v1/form-templates",
        "/api/v1/runtime-templates",
        "/api/v1/builder-documents",
    ]

    for path in protected_gets:
        response = client.get(path)
        assert response.status_code == 401, path


def test_settings_readable_with_auth(client, auth_headers):
    response = client.get("/api/v1/settings", headers=auth_headers)
    assert response.status_code == 200
    payload = response.json()
    assert "max_upload_mb" in payload
    assert payload["max_upload_mb"] >= 1


def test_settings_update_with_admin(client, auth_headers):
    response = client.put(
        "/api/v1/settings",
        headers=auth_headers,
        json={"max_upload_mb": 8},
    )
    assert response.status_code == 200
    assert response.json()["max_upload_mb"] == 8

    reset = client.put(
        "/api/v1/settings",
        headers=auth_headers,
        json={"max_upload_mb": 10},
    )
    assert reset.status_code == 200
    assert reset.json()["max_upload_mb"] == 10


def test_evidence_upload_requires_auth(client):
    response = client.post(
        "/api/v1/evidence-uploads",
        files={"file": ("evidence.png", b"fake-image", "image/png")},
    )
    assert response.status_code == 401


def test_evidence_upload_rejects_oversized_file(client, auth_headers):
    client.put(
        "/api/v1/settings",
        headers=auth_headers,
        json={"max_upload_mb": 1},
    )

    oversized = b"x" * (1024 * 1024 + 1)
    response = client.post(
        "/api/v1/evidence-uploads",
        headers=auth_headers,
        files={"file": ("large.png", oversized, "image/png")},
    )
    assert response.status_code == 400
    assert "1 MB" in response.json()["detail"]

def test_submit_execution_requires_photo_when_enabled(client, auth_headers):
    client.put(
        "/api/v1/settings",
        headers=auth_headers,
        json={"photo_required_by_default": True},
    )

    tasks_response = client.get("/api/v1/tasks", headers=auth_headers)
    assert tasks_response.status_code == 200
    tasks = tasks_response.json()

    if not tasks:
        pytest.skip("No tasks available for submit execution test")

    task_id = tasks[0]["id"]
    response = client.post(
        f"/api/v1/tasks/{task_id}/submit-execution",
        headers=auth_headers,
        json={
            "answers_json": {
                "operator": {"name": "Tester", "position": "Crew"},
                "note": "No photo",
                "evidence": "",
                "responses": {},
                "submittedAt": "2026-07-20T10:00:00Z",
            }
        },
    )
    assert response.status_code == 400
    assert "foto" in response.json()["detail"].lower()

    client.put(
        "/api/v1/settings",
        headers=auth_headers,
        json={"photo_required_by_default": True},
    )
