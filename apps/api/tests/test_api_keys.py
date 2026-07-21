import pytest


def test_health_public_without_key(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert "auth" not in payload


def test_create_and_use_api_key(client, auth_headers):
    create_response = client.post(
        "/api/v1/api-keys",
        headers=auth_headers,
        json={
            "name": "Integration test key",
            "scopes": ["read:health", "read:form-templates", "read:reports"],
        },
    )
    assert create_response.status_code == 201, create_response.text

    created = create_response.json()
    raw_key = created["raw_key"]
    assert raw_key.startswith("nova_")

    health_response = client.get("/api/v1/health", headers={"X-API-Key": raw_key})
    assert health_response.status_code == 200
    assert health_response.json()["auth"] == "api_key"

    templates_response = client.get("/api/v1/form-templates", headers={"X-API-Key": raw_key})
    assert templates_response.status_code == 200
    assert isinstance(templates_response.json(), list)

    reports_response = client.get("/api/v1/reports/summary", headers={"X-API-Key": raw_key})
    assert reports_response.status_code == 200

    list_response = client.get("/api/v1/api-keys", headers=auth_headers)
    assert list_response.status_code == 200
    assert any(item["id"] == created["id"] for item in list_response.json())

    revoke_response = client.delete(
        f"/api/v1/api-keys/{created['id']}",
        headers=auth_headers,
    )
    assert revoke_response.status_code == 204

    blocked_response = client.get("/api/v1/form-templates", headers={"X-API-Key": raw_key})
    assert blocked_response.status_code == 401


def test_api_key_requires_admin(client, auth_headers):
    response = client.get("/api/v1/api-keys", headers=auth_headers)
    assert response.status_code == 200


def test_form_templates_rejects_invalid_api_key(client):
    response = client.get("/api/v1/form-templates", headers={"X-API-Key": "nova_invalid"})
    assert response.status_code == 401
