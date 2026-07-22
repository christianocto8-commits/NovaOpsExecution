"""Video evidence upload acceptance."""

from io import BytesIO

from fastapi.testclient import TestClient


def test_video_evidence_upload_accepts_mp4(client: TestClient, auth_headers: dict[str, str]):
    fake_video = b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 128
    files = {"file": ("evidence.mp4", BytesIO(fake_video), "video/mp4")}

    response = client.post(
        "/api/v1/evidence-uploads",
        headers=auth_headers,
        files=files,
    )

    assert response.status_code == 201, response.text
    payload = response.json()
    assert payload.get("url")


def test_video_evidence_rejects_unknown_type(client: TestClient, auth_headers: dict[str, str]):
    files = {"file": ("evidence.txt", BytesIO(b"hello"), "text/plain")}

    response = client.post(
        "/api/v1/evidence-uploads",
        headers=auth_headers,
        files=files,
    )

    assert response.status_code == 400
