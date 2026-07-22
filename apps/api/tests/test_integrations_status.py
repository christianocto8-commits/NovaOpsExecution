"""Integration readiness status endpoint."""

from fastapi.testclient import TestClient


def test_integrations_status_owner(client: TestClient, auth_headers: dict[str, str]):
    response = client.get("/api/v1/integrations/status", headers=auth_headers)
    assert response.status_code == 200

    payload = response.json()
    assert "google_oauth" in payload
    assert "oidc_sso" in payload
    assert "saml_sso" in payload
    assert "iot_sensors" in payload
    assert "lms_training" in payload
    assert "live_ready" in payload["oidc_sso"]
    assert "setup_steps" in payload["saml_sso"]
    assert "sms_twilio" in payload
    assert "web_push_vapid" in payload
    assert "webhooks" in payload
    assert "video_evidence" in payload
    assert payload["video_evidence"]["enabled"] is True


def test_integrations_status_requires_auth(client: TestClient):
    response = client.get("/api/v1/integrations/status")
    assert response.status_code == 401
