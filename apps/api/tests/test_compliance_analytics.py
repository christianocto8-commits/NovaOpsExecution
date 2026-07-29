from sqlalchemy.orm import Session

from app.models.execution_session import ExecutionSession
from app.models.task import Task
from app.services.compliance_analytics import get_top_failed_checklist_items


def test_get_top_failed_checklist_items_aggregates_by_label(db: Session):
    stale_task_ids = [
        task_id
        for (task_id,) in db.query(Task.id)
        .filter(Task.title == "Failed item trend task")
        .all()
    ]
    if stale_task_ids:
        db.query(ExecutionSession).filter(
            ExecutionSession.task_id.in_(stale_task_ids)
        ).delete(synchronize_session=False)
        db.query(Task).filter(Task.id.in_(stale_task_ids)).delete(
            synchronize_session=False
        )
        db.commit()

    suffix = uuid4().hex[:8]
    temperature_label = f"Temperature log {suffix}"
    sanitizer_label = f"Sanitizer level {suffix}"
    task = Task(
        title="Failed item trend task",
        description="Used for failed item analytics test",
        outlet_id=1,
        assigned_to=1,
        created_by=1,
        priority="medium",
        status="completed",
    )
    db.add(task)
    db.flush()

    for score in (65, 70):
        db.add(
            ExecutionSession(
                task_id=task.id,
                source_type="sop_task",
                status="completed",
                answers_json={
                    "_checklist": {
                        "score": score,
                        "status": "fail",
                        "failed_items": [
                            {
                                "field_id": 10,
                                "label": temperature_label,
                                "value": "12",
                                "reason": "Out of range",
                            },
                            {
                                "field_id": 11,
                                "label": sanitizer_label,
                                "value": "Low",
                                "reason": "Below minimum",
                            },
                        ],
                    }
                },
                submitted_by=1,
            )
        )

    db.commit()

    rows = get_top_failed_checklist_items(db, limit=5, days=30, all_outlets=True)
    labels = {row["label"]: row["failure_count"] for row in rows}

    assert labels[temperature_label] == 2
    assert labels[sanitizer_label] == 2
from uuid import uuid4
