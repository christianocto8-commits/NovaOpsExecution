import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.bootstrap.ensure_online_admin import ensure_online_admin
from app.core.database import SessionLocal
from app.core.http_security import login_rate_limiter, otp_rate_limiter
from app.main import app


@pytest.fixture(scope="session", autouse=True)
def bootstrap_admin() -> None:
    ensure_online_admin()


@pytest.fixture(autouse=True)
def reset_rate_limiters() -> None:
    login_rate_limiter.clear()
    otp_rate_limiter.clear()


@pytest.fixture(scope="module")
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def db() -> Session:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(scope="module")
def admin_token(client: TestClient) -> str:
    response = client.post(
        "/api/v1/auth/login",
        json={
            "identifier": os.environ.get("BOOTSTRAP_ADMIN_EMAIL", "admin@novaops.com"),
            "password": os.environ.get("BOOTSTRAP_ADMIN_PASSWORD", "admin123"),
        },
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    return payload["access_token"]


@pytest.fixture(scope="module")
def auth_headers(admin_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {admin_token}"}
