"""Outlet crew role access boundaries."""

import uuid

import pytest
from fastapi.testclient import TestClient

from app.core.database import SessionLocal
from app.modules.identity.models import User
from app.modules.identity.repository import OutletRepository, RoleRepository, UserRepository
from app.modules.identity.security import hash_password


@pytest.fixture(scope="module")
def outlet_auth_headers(client: TestClient) -> dict[str, str]:
    db = SessionLocal()
    try:
        roles = RoleRepository(db)
        outlets = OutletRepository(db)
        users = UserRepository(db)

        outlet_role = roles.find_by_slug("outlet")
        assert outlet_role is not None

        outlet_list = outlets.list()
        assert outlet_list, "No outlets available for crew test"
        outlet = outlet_list[0]

        email = f"crew-parity-{uuid.uuid4().hex[:8]}@novaops.test"
        password = "crew-parity-123"

        user = User(
            email=email,
            username=email.split("@", 1)[0],
            full_name="Crew Parity Test",
            password_hash=hash_password(password),
            role_id=outlet_role.id,
            outlet_id=outlet.id,
            is_active=True,
        )
        users.create(user)
        db.commit()

        outlet_id = str(outlet.id)
    finally:
        db.close()

    login_response = client.post(
        "/api/v1/auth/login",
        json={"identifier": email, "password": password},
    )
    assert login_response.status_code == 200, login_response.text
    token = login_response.json()["access_token"]

    return {
        "Authorization": f"Bearer {token}",
        "X-Outlet-Id": outlet_id,
    }


def test_outlet_user_cannot_access_integrations_status(
    client: TestClient,
    outlet_auth_headers: dict[str, str],
):
    response = client.get("/api/v1/integrations/status", headers=outlet_auth_headers)
    assert response.status_code == 403


def test_outlet_user_can_access_tasks(
    client: TestClient,
    outlet_auth_headers: dict[str, str],
):
    response = client.get("/api/v1/tasks?limit=5", headers=outlet_auth_headers)
    assert response.status_code == 200
