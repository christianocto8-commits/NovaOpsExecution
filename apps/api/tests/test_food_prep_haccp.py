"""Food Prep labeling and HACCP log smoke tests."""

from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient


def _create_label(client: TestClient, auth_headers: dict[str, str], outlet_id: str) -> dict:
    payload = {
        "outlet_id": outlet_id,
        "item_name": "Chicken Curry Batch",
        "category": "prepared",
        "batch_code": "B-001",
        "quantity_text": "5",
        "unit": "kg",
        "prepared_notes": "Cooked at 07:00",
        "prepared_at": datetime.now(UTC).isoformat(),
        "discard_at": (datetime.now(UTC) + timedelta(hours=4)).isoformat(),
        "shelf_hours": 4,
    }
    response = client.post("/api/v1/food-prep/labels", headers=auth_headers, json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def test_food_prep_label_crud_and_summary(client: TestClient, auth_headers: dict[str, str]):
    outlets = client.get("/api/v1/identity/outlets", headers=auth_headers)
    assert outlets.status_code == 200
    outlet_list = outlets.json()
    assert outlet_list, "Need at least one outlet"
    outlet_id = outlet_list[0]["id"]

    label = _create_label(client, auth_headers, outlet_id)
    assert label["status"] == "active"
    assert label["category"] == "prepared"

    labels = client.get("/api/v1/food-prep/labels", headers=auth_headers)
    assert labels.status_code == 200
    assert any(item["id"] == label["id"] for item in labels.json())

    summary = client.get("/api/v1/food-prep/labels/summary", headers=auth_headers)
    assert summary.status_code == 200
    assert summary.json()["total"] >= 1

    discarded = client.post(
        f"/api/v1/food-prep/labels/{label['id']}/discard",
        headers=auth_headers,
    )
    assert discarded.status_code == 200
    assert discarded.json()["status"] == "discarded"


def test_haccp_log_create_and_summary(client: TestClient, auth_headers: dict[str, str]):
    outlets = client.get("/api/v1/identity/outlets", headers=auth_headers)
    out_list = outlets.json()
    assert out_list
    outlet_id = out_list[0]["id"]

    entry = client.post(
        "/api/v1/haccp/entries",
        headers=auth_headers,
        json={
            "outlet_id": outlet_id,
            "ccp_name": "cooking",
            "item_name": "Chicken center",
            "reading_value": 78.0,
            "unit": "C",
            "corrective_action": None,
        },
    )
    assert entry.status_code == 201, entry.text
    body = entry.json()
    assert body["passed"] is True
    assert body["ccp_name"] == "cooking"

    failed = client.post(
        "/api/v1/haccp/entries",
        headers=auth_headers,
        json={
            "outlet_id": outlet_id,
            "ccp_name": "cold_storage",
            "item_name": "Milk",
            "reading_value": 9.0,
            "unit": "C",
            "corrective_action": "Move to chiller immediately",
        },
    )
    assert failed.status_code == 201, failed.text
    assert failed.json()["passed"] is False

    summary = client.get("/api/v1/haccp/entries/summary", headers=auth_headers)
    assert summary.status_code == 200
    assert summary.json()["total"] >= 2
    assert summary.json()["failed"] >= 1

    entries = client.get("/api/v1/haccp/entries?ccp_name=cooking", headers=auth_headers)
    assert entries.status_code == 200
    assert all(item["ccp_name"] == "cooking" for item in entries.json())