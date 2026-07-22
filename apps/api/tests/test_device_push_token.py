"""Device push token registration for native FCM/APNs."""

from fastapi.testclient import TestClient


def test_register_device_push_token(client: TestClient, auth_headers: dict[str, str]):
    response = client.post(
        "/api/v1/notifications/push/register-device",
        headers=auth_headers,
        json={
            "token": "fcm-test-token-abc123456789",
            "platform": "android",
        },
    )

    assert response.status_code == 201, response.text
    payload = response.json()
    assert payload["token"] == "fcm-test-token-abc123456789"
    assert payload["platform"] == "android"


def test_register_device_push_token_requires_auth(client: TestClient):
    response = client.post(
        "/api/v1/notifications/push/register-device",
        json={"token": "fcm-test-token", "platform": "ios"},
    )
    assert response.status_code == 401
