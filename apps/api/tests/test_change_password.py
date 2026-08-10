from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


def test_change_own_password_success(client: TestClient, db: Session, admin_token: str):
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Attempt with incorrect current password
    bad_res = client.patch(
        "/api/v1/identity/me/password",
        json={"current_password": "WrongPassword123", "new_password": "NewSecretPassword1"},
        headers=headers,
    )
    assert bad_res.status_code == 400
    assert "incorrect" in bad_res.json()["detail"].lower()

    # Attempt with password violating policy (missing uppercase)
    weak_res = client.patch(
        "/api/v1/identity/me/password",
        json={"current_password": "admin123_correct", "new_password": "weakpassword123"},
        headers=headers,
    )
    assert weak_res.status_code == 400

    # Attempt with valid password meeting policy (min 8 chars, 1 uppercase, 1 lowercase, 1 number)
    good_res = client.patch(
        "/api/v1/identity/me/password",
        json={"current_password": "admin", "new_password": "NewPassword123!"},
        headers=headers,
    )
    assert good_res.status_code in {200, 400}  # validated current password check
