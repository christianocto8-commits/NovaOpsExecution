from io import BytesIO
from fastapi.testclient import TestClient


def test_evidence_upload_image_and_fetch(client: TestClient, auth_headers: dict[str, str]):
    fake_png = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
        b"\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    files = {"file": ("test_photo.png", BytesIO(fake_png), "image/png")}
    data = {"latitude": "-6.2088", "longitude": "106.8456", "accuracy_m": "10.5"}

    response = client.post(
        "/api/v1/evidence-uploads",
        headers=auth_headers,
        files=files,
        data=data,
    )

    assert response.status_code == 201, response.text
    payload = response.json()
    assert payload.get("url")
    assert payload["latitude"] == -6.2088
    assert payload["longitude"] == 106.8456
    assert payload["accuracy_m"] == 10.5

    # Test fetching the uploaded evidence file without auth headers (direct <img> tag usage)
    get_res = client.get(payload["url"])
    assert get_res.status_code == 200
    assert get_res.content == fake_png


def test_evidence_upload_empty_coords_handled(client: TestClient, auth_headers: dict[str, str]):
    fake_jpg = b"\xff\xd8\xff\xe0\x00\x10JFIF" + b"\x00" * 32
    files = {"file": ("test_photo.jpg", BytesIO(fake_jpg), "image/jpeg")}
    data = {"latitude": "", "longitude": "null", "accuracy_m": "undefined"}

    response = client.post(
        "/api/v1/evidence-uploads",
        headers=auth_headers,
        files=files,
        data=data,
    )

    assert response.status_code == 201, response.text
    payload = response.json()
    assert payload["latitude"] is None
    assert payload["longitude"] is None
    assert payload["accuracy_m"] is None
