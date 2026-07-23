"""SMS test endpoint — mock mode when Twilio is not configured."""

from fastapi.testclient import TestClient


def test_sms_test_simulated_without_twilio(client: TestClient, auth_headers: dict[str, str]):
    response = client.post(
        "/api/v1/integrations/sms/test",
        headers=auth_headers,
        json={"phone_number": "+6281234567890"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["simulated"] is True
    assert "simulated" in payload["message"].lower() or "not configured" in payload["message"].lower()
    assert payload["phone_number"] == "+6281234567890"
