"""Tests for CAPA manager verification persistence."""

from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.task import Task


def _create_capa_task(db: Session, *, outlet_id: int = 1) -> Task:
    task = Task(
        title="CAPA verify test",
        description="Failed items: Temperature log",
        outlet_id=outlet_id,
        created_by=1,
        assigned_to=1,
        source_type="corrective_action",
        source_id=99,
        priority="high",
        status="completed",
        completed_at=datetime.now(timezone.utc),
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def test_verify_capa_task_sets_verified_at(
    client: TestClient,
    auth_headers: dict[str, str],
    db: Session,
):
    task = _create_capa_task(db)
    assert task.verified_at is None

    response = client.post(
        f"/api/v1/tasks/{task.id}/verify",
        headers={**auth_headers, "X-Outlet-Id": str(task.outlet_id)},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["verified_at"] is not None

    db.refresh(task)
    assert task.verified_at is not None


def test_verify_capa_task_is_idempotent(
    client: TestClient,
    auth_headers: dict[str, str],
    db: Session,
):
    task = _create_capa_task(db)

    first = client.post(
        f"/api/v1/tasks/{task.id}/verify",
        headers={**auth_headers, "X-Outlet-Id": str(task.outlet_id)},
    )
    assert first.status_code == 200
    verified_at = first.json()["verified_at"]

    second = client.post(
        f"/api/v1/tasks/{task.id}/verify",
        headers={**auth_headers, "X-Outlet-Id": str(task.outlet_id)},
    )
    assert second.status_code == 200
    assert second.json()["verified_at"] == verified_at
