"""Offline execution recovery — server-side flow after sync."""

from fastapi.testclient import TestClient


def test_execution_draft_then_submit_recovery(client: TestClient, auth_headers: dict[str, str]):
    tasks_response = client.get("/api/v1/tasks", headers=auth_headers, params={"limit": 1})
    assert tasks_response.status_code == 200
    tasks = tasks_response.json()

    if not tasks:
        return

    task = tasks[0]
    task_id = task["id"]

    draft_payload = {
        "task_id": task_id,
        "source_type": "sop_task",
        "status": "draft",
        "answers_json": {"field_demo": "offline-draft-value"},
    }

    create_response = client.post(
        "/api/v1/execution-sessions",
        headers=auth_headers,
        json=draft_payload,
    )
    assert create_response.status_code in {200, 201}, create_response.text
    session = create_response.json()
    session_id = session["id"]

    submit_response = client.patch(
        f"/api/v1/execution-sessions/{session_id}",
        headers=auth_headers,
        json={
            "status": "completed",
            "answers_json": {"field_demo": "offline-synced-value"},
        },
    )
    assert submit_response.status_code == 200, submit_response.text
    submitted = submit_response.json()
    assert submitted["status"] == "completed"
    assert submitted["answers_json"]["field_demo"] == "offline-synced-value"
