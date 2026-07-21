import pytest


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
