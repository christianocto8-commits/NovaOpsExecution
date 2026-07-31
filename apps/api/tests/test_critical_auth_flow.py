import os


def test_authorization_context_with_token(client, auth_headers):
    response = client.get("/api/v1/authorization/context", headers=auth_headers)
    assert response.status_code == 200

    payload = response.json()
    assert payload["user"]["email"]
    assert payload["role"]["slug"]
    assert isinstance(payload["permissions"], list)
    assert "outlet_access" in payload


def test_authorization_context_requires_auth(client):
    response = client.get("/api/v1/authorization/context")
    assert response.status_code == 401


def test_form_templates_list_authenticated(client, auth_headers):
    response = client.get("/api/v1/form-templates", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_form_templates_list_requires_auth(client):
    response = client.get("/api/v1/form-templates")
    assert response.status_code == 401


def test_google_login_redirect_when_unconfigured(client):
    response = client.get("/api/v1/auth/google/login", follow_redirects=False)
    assert response.status_code == 503


def test_login_devices_list_and_revoke(client):
    identifier = os.environ.get("BOOTSTRAP_ADMIN_EMAIL", "admin@novaops.com")
    password = os.environ.get("BOOTSTRAP_ADMIN_PASSWORD", "admin123")

    first_login = client.post(
        "/api/v1/auth/login",
        json={"identifier": identifier, "password": password},
        headers={"user-agent": "Mozilla/5.0 Windows Chrome/120"},
    )
    assert first_login.status_code == 200, first_login.text
    first_token = first_login.json()["access_token"]

    second_login = client.post(
        "/api/v1/auth/login",
        json={"identifier": identifier, "password": password},
        headers={"user-agent": "Mozilla/5.0 Android Chrome/120"},
    )
    assert second_login.status_code == 200, second_login.text
    token = second_login.json()["access_token"]

    devices_response = client.get(
        "/api/v1/auth/devices",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert devices_response.status_code == 200, devices_response.text
    devices = devices_response.json()
    assert len(devices) >= 2
    assert any(device["is_current"] for device in devices)

    other_device = next(device for device in devices if not device["is_current"])
    revoke_response = client.delete(
        f"/api/v1/auth/devices/{other_device['id']}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert revoke_response.status_code == 204, revoke_response.text

    revoked_session_response = client.get(
        "/api/v1/reports/trends",
        headers={"Authorization": f"Bearer {first_token}"},
    )
    assert revoked_session_response.status_code == 401, revoked_session_response.text

    devices_after_revoke = client.get(
        "/api/v1/auth/devices",
        headers={"Authorization": f"Bearer {token}"},
    ).json()
    assert all(device["id"] != other_device["id"] for device in devices_after_revoke)

    audit_response = client.get(
        "/api/v1/audit/events?category=security&limit=20",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert audit_response.status_code == 200, audit_response.text
    assert any(
        item["action"] == "device_revoked"
        for item in audit_response.json()["items"]
    )


def test_admin_login_devices_list_all_and_revoke(client):
    identifier = os.environ.get("BOOTSTRAP_ADMIN_EMAIL", "admin@novaops.com")
    password = os.environ.get("BOOTSTRAP_ADMIN_PASSWORD", "admin123")

    admin_login = client.post(
        "/api/v1/auth/login",
        json={"identifier": identifier, "password": password},
        headers={"user-agent": "Mozilla/5.0 Windows Chrome/120"},
    )
    assert admin_login.status_code == 200, admin_login.text
    token = admin_login.json()["access_token"]

    other_login = client.post(
        "/api/v1/auth/login",
        json={"identifier": identifier, "password": password},
        headers={"user-agent": "Mozilla/5.0 Android Chrome/120"},
    )
    assert other_login.status_code == 200, other_login.text

    devices_response = client.get(
        "/api/v1/auth/devices/all",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert devices_response.status_code == 200, devices_response.text
    devices = devices_response.json()
    assert any(device["user_email"] == identifier for device in devices)

    other_device = next(device for device in devices if not device["is_current"])
    revoke_response = client.delete(
        f"/api/v1/auth/devices/all/{other_device['id']}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert revoke_response.status_code == 204, revoke_response.text
