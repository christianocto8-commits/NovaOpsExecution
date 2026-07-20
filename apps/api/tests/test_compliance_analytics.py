from sqlalchemy.orm import Session

from app.models.execution_session import ExecutionSession
from app.models.task import Task
from app.services.compliance_analytics import get_top_failed_checklist_items


def test_get_top_failed_checklist_items_aggregates_by_label(db: Session):
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
                                "label": "Temperature log",
                                "value": "12",
                                "reason": "Out of range",
                            },
                            {
                                "field_id": 11,
                                "label": "Sanitizer level",
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

    assert labels["Temperature log"] == 2
    assert labels["Sanitizer level"] == 2
