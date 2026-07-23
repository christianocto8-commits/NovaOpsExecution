"""Tests for notification preferences and history notes API."""

from fastapi.testclient import TestClient


def test_notification_preferences_roundtrip(client: TestClient, auth_headers: dict[str, str]):
    get_response = client.get("/api/v1/notifications/preferences", headers=auth_headers)
    assert get_response.status_code == 200
    assert "email_enabled" in get_response.json()

    put_response = client.put(
        "/api/v1/notifications/preferences",
        headers=auth_headers,
        json={
            "email_enabled": False,
            "push_enabled": True,
            "digest_enabled": True,
        },
    )
    assert put_response.status_code == 200
    payload = put_response.json()
    assert payload["email_enabled"] is False
    assert payload["digest_enabled"] is True

    get_again = client.get("/api/v1/notifications/preferences", headers=auth_headers)
    assert get_again.status_code == 200
    assert get_again.json()["email_enabled"] is False


def test_history_notes_roundtrip(client: TestClient, auth_headers: dict[str, str]):
    put_response = client.put(
        "/api/v1/notifications/history-notes",
        headers=auth_headers,
        json={"notes": {"task:42": "Reviewed on shift A"}},
    )
    assert put_response.status_code == 200
    assert put_response.json()["notes"]["task:42"] == "Reviewed on shift A"

    get_response = client.get("/api/v1/notifications/history-notes", headers=auth_headers)
    assert get_response.status_code == 200
    assert get_response.json()["notes"]["task:42"] == "Reviewed on shift A"
