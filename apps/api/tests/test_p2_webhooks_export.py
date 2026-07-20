from fastapi.testclient import TestClient


def test_compliance_export_requires_auth(client: TestClient):
    response = client.get("/api/v1/reports/compliance/export?format=xlsx")
    assert response.status_code == 401


def test_compliance_export_returns_xlsx(client: TestClient, auth_headers: dict[str, str]):
    response = client.get(
        "/api/v1/reports/compliance/export?format=xlsx",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert (
        response.headers["content-type"]
        == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    assert response.content[:2] == b"PK"


def test_compliance_export_returns_pdf(client: TestClient, auth_headers: dict[str, str]):
    response = client.get(
        "/api/v1/reports/compliance/export?format=pdf",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content.startswith(b"%PDF")


def test_audit_events_requires_auth(client: TestClient):
    response = client.get("/api/v1/audit/events")
    assert response.status_code == 401


def test_audit_events_returns_page(client: TestClient, auth_headers: dict[str, str]):
    response = client.get("/api/v1/audit/events?limit=10", headers=auth_headers)
    assert response.status_code == 200
    payload = response.json()
    assert "total" in payload
    assert "items" in payload
    assert isinstance(payload["items"], list)


def test_webhooks_crud_owner_only(client: TestClient, auth_headers: dict[str, str]):
    create_response = client.post(
        "/api/v1/webhooks",
        headers=auth_headers,
        json={
            "url": "https://example.com/hooks/novaops",
            "events": ["task.completed", "checklist.failed"],
            "secret": "super-secret-value",
            "active": True,
        },
    )
    assert create_response.status_code == 201, create_response.text
    payload = create_response.json()
    webhook_id = payload["id"]
    assert payload["url"].startswith("https://example.com")
    assert payload["secret"] == "super-secret-value"

    list_response = client.get("/api/v1/webhooks", headers=auth_headers)
    assert list_response.status_code == 200
    assert any(item["id"] == webhook_id for item in list_response.json())

    update_response = client.put(
        f"/api/v1/webhooks/{webhook_id}",
        headers=auth_headers,
        json={"active": False},
    )
    assert update_response.status_code == 200
    assert update_response.json()["active"] is False

    delete_response = client.delete(
        f"/api/v1/webhooks/{webhook_id}",
        headers=auth_headers,
    )
    assert delete_response.status_code == 204
