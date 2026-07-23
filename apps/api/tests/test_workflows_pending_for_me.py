"""Workflow pending-for-me and notification on instance create."""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.modules.notifications.models import NotificationEvent
from app.modules.workflows.models import WorkflowApproverType, WorkflowStepType


def _create_workflow_with_approval(client: TestClient, auth_headers: dict[str, str], role_id: str):
    from uuid import uuid4

    code = f"test-approval-{uuid4().hex[:8]}"
    payload = {
        "code": code,
        "name": "Test Approval Flow",
        "description": "Test workflow",
        "module": "tasks",
        "steps": [
            {
                "code": "manager-approval",
                "name": "Manager Approval",
                "step_type": WorkflowStepType.approval.value,
                "position": 1,
            }
        ],
    }
    response = client.post("/api/v1/workflows", headers=auth_headers, json=payload)
    assert response.status_code == 201, response.text
    workflow = response.json()

    step_id = workflow["steps"][0]["id"]
    matrix_payload = {
        "workflow_id": workflow["id"],
        "step_id": step_id,
        "approver_type": WorkflowApproverType.role.value,
        "approver_role_id": role_id,
        "sequence": 1,
        "is_required": True,
    }
    matrix_response = client.post(
        "/api/v1/workflows/approval-matrix",
        headers=auth_headers,
        json=matrix_payload,
    )
    assert matrix_response.status_code == 201, matrix_response.text
    return workflow


def test_pending_for_me_and_notification_on_create(
    client: TestClient,
    auth_headers: dict[str, str],
    db: Session,
):
    me_response = client.get("/api/v1/auth/me", headers=auth_headers)
    assert me_response.status_code == 200
    admin_role_id = me_response.json()["role"]["id"]

    workflow = _create_workflow_with_approval(client, auth_headers, admin_role_id)

    create_response = client.post(
        "/api/v1/workflows/instances",
        headers=auth_headers,
        json={
            "workflow_id": workflow["id"],
            "module": "tasks",
            "entity_type": "task",
            "entity_id": "TASK-TEST-001",
            "context_json": {"source": "pytest"},
        },
    )
    assert create_response.status_code == 201, create_response.text
    instance = create_response.json()
    assert instance["status"] == "pending_approval"

    pending_response = client.get(
        "/api/v1/workflows/instances/pending-for-me",
        headers=auth_headers,
    )
    assert pending_response.status_code == 200
    pending_ids = {item["id"] for item in pending_response.json()}
    assert instance["id"] in pending_ids

    notifications = (
        db.query(NotificationEvent)
        .filter(NotificationEvent.event_type == "workflow_pending_approval")
        .all()
    )
    assert any(event.source_entity_id == instance["id"] for event in notifications)

    history_response = client.get(
        f"/api/v1/workflows/instances/{instance['id']}/history",
        headers=auth_headers,
    )
    assert history_response.status_code == 200
    assert any(item["action_type"] == "submitted" for item in history_response.json())
