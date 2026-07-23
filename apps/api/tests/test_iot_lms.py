"""IoT ingest and LMS training module smoke tests."""

from uuid import uuid4

from fastapi.testclient import TestClient


def test_iot_ingest_with_env_api_key(client: TestClient, auth_headers: dict[str, str], monkeypatch):
    monkeypatch.setenv("IOT_INGEST_API_KEY", "test-iot-key")

    from app.core.config import get_settings

    get_settings.cache_clear()

    outlets = client.get("/api/v1/identity/outlets", headers=auth_headers)
    assert outlets.status_code == 200
    outlet_list = outlets.json()
    assert outlet_list, "Need at least one outlet"
    outlet_id = outlet_list[0]["id"]

    ingest = client.post(
        "/api/v1/iot/ingest",
        headers={"X-API-Key": "test-iot-key"},
        json={
            "outlet_id": outlet_id,
            "sensor_type": "temperature",
            "value": 5.5,
            "unit": "C",
        },
    )
    assert ingest.status_code == 201, ingest.text

    readings = client.get(
        f"/api/v1/iot/readings?outlet_id={outlet_id}&sensor_type=temperature",
        headers=auth_headers,
    )
    assert readings.status_code == 200
    assert len(readings.json()) >= 1


def test_lms_module_crud_and_my_training(client: TestClient, auth_headers: dict[str, str]):
    create = client.post(
        "/api/v1/lms/modules",
        headers=auth_headers,
        json={
            "title": f"Food Safety {uuid4().hex[:6]}",
            "description": "Basic hygiene",
            "duration_minutes": 20,
            "required_for_roles": ["owner", "admin"],
            "expires_days": 365,
        },
    )
    assert create.status_code == 201, create.text
    module = create.json()

    my_training = client.get("/api/v1/lms/my-training", headers=auth_headers)
    assert my_training.status_code == 200
    module_ids = {item["module"]["id"] for item in my_training.json()}
    assert module["id"] in module_ids

    completion = client.post(
        "/api/v1/lms/completions",
        headers=auth_headers,
        json={"module_id": module["id"]},
    )
    assert completion.status_code == 201, completion.text

    my_training_after = client.get("/api/v1/lms/my-training", headers=auth_headers)
    completed = next(
        item for item in my_training_after.json() if item["module"]["id"] == module["id"]
    )
    assert completed["completed"] is True
