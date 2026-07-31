import pytest

from app.core.http_security import login_rate_limiter
from app.models.task import Task


def test_health_is_public(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"


def test_https_request_receives_hsts(client):
    response = client.get(
        "/api/v1/health",
        headers={"X-Forwarded-Proto": "https"},
    )
    assert response.status_code == 200
    assert "max-age=31536000" in response.headers["strict-transport-security"]


def test_login_rate_limit_returns_retry_after(client):
    original_limit = login_rate_limiter.limit
    login_rate_limiter.clear()
    login_rate_limiter.limit = 2
    try:
        for _ in range(2):
            response = client.post(
                "/api/v1/auth/login",
                json={"identifier": "missing@example.com", "password": "Invalid123"},
                headers={"X-Forwarded-For": "198.51.100.77"},
            )
            assert response.status_code == 401

        limited = client.post(
            "/api/v1/auth/login",
            json={"identifier": "missing@example.com", "password": "Invalid123"},
            headers={"X-Forwarded-For": "198.51.100.77"},
        )
        assert limited.status_code == 429
        assert int(limited.headers["retry-after"]) >= 1
    finally:
        login_rate_limiter.limit = original_limit
        login_rate_limiter.clear()


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
        (
            "/api/v1/workflow-notifications/templates"
            "?workflow_id=00000000-0000-0000-0000-000000000000"
        ),
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

def test_submit_execution_requires_photo_when_enabled(client, auth_headers, db):
    client.put(
        "/api/v1/settings",
        headers=auth_headers,
        json={"photo_required_by_default": True},
    )

    task = Task(
        title="Photo policy security test",
        outlet_id=1,
        created_by=1,
        priority="medium",
        status="open",
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    response = client.post(
        f"/api/v1/tasks/{task.id}/submit-execution",
        headers={**auth_headers, "X-Outlet-Id": "1"},
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
        json={"photo_required_by_default": False},
    )
