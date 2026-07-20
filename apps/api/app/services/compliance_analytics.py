from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.execution_session import ExecutionSession
from app.models.task import Task


def get_top_failed_checklist_items(
    db: Session,
    *,
    limit: int = 10,
    days: int = 30,
    outlet_id: int | None = None,
    outlet_ids: list[int] | None = None,
    all_outlets: bool = False,
) -> list[dict]:
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=days)

    query = (
        db.query(ExecutionSession)
        .join(Task, ExecutionSession.task_id == Task.id)
        .filter(
            ExecutionSession.status == "completed",
            ExecutionSession.submitted_at >= since,
        )
    )

    if outlet_id is not None:
        query = query.filter(Task.outlet_id == outlet_id)
    elif outlet_ids is not None:
        if not outlet_ids:
            query = query.filter(Task.id == -1)
        else:
            query = query.filter(Task.outlet_id.in_(outlet_ids))
    elif not all_outlets:
        query = query.filter(Task.id == -1)

    sessions = query.all()
    counts: dict[str, dict] = {}

    for session in sessions:
        answers = session.answers_json if isinstance(session.answers_json, dict) else {}
        checklist = answers.get("_checklist")
        if not isinstance(checklist, dict):
            continue

        failed_items = checklist.get("failed_items") or []
        if not isinstance(failed_items, list):
            continue

        for item in failed_items:
            if not isinstance(item, dict):
                continue

            label = str(item.get("label") or "Unknown").strip()
            key = label.lower()

            if key not in counts:
                counts[key] = {
                    "label": label,
                    "field_id": item.get("field_id"),
                    "failure_count": 0,
                    "sample_reason": str(item.get("reason") or "Failed"),
                }

            counts[key]["failure_count"] += 1

    ranked = sorted(counts.values(), key=lambda row: row["failure_count"], reverse=True)
    return ranked[:limit]
