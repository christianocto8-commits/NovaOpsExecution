from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import and_, or_
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


def _parse_checklist_score(session: ExecutionSession) -> dict | None:
    answers = session.answers_json if isinstance(session.answers_json, dict) else {}
    checklist = answers.get("_checklist")
    if not isinstance(checklist, dict):
        return None

    raw_score = checklist.get("score")
    try:
        score = round(float(raw_score))
    except (TypeError, ValueError):
        return None

    status = checklist.get("status")
    return {
        "score": score,
        "passed": status == "pass",
    }


def get_template_compliance_trends(
    db: Session,
    *,
    template_id: int,
    days: int = 30,
) -> list[dict]:
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=days)

    sessions = (
        db.query(ExecutionSession)
        .outerjoin(Task, ExecutionSession.task_id == Task.id)
        .filter(
            ExecutionSession.status == "completed",
            ExecutionSession.submitted_at.isnot(None),
            ExecutionSession.submitted_at >= since,
            or_(
                ExecutionSession.form_template_id == template_id,
                and_(Task.source_type == "form_template", Task.source_id == template_id),
            ),
        )
        .all()
    )

    day_buckets: dict[str, list[dict]] = {}

    for session in sessions:
        submitted_at = session.submitted_at
        if submitted_at is None:
            continue

        parsed = _parse_checklist_score(session)
        if parsed is None:
            continue

        day_key = submitted_at.astimezone(timezone.utc).strftime("%Y-%m-%d")
        day_buckets.setdefault(day_key, []).append(parsed)

    points: list[dict] = []

    for offset in range(days - 1, -1, -1):
        day_start = (now - timedelta(days=offset)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        day_key = day_start.strftime("%Y-%m-%d")
        day_label = day_start.strftime("%d %b")
        rows = day_buckets.get(day_key, [])

        if rows:
            avg_score = round(sum(row["score"] for row in rows) / len(rows))
            pass_rate = round(
                (sum(1 for row in rows if row["passed"]) / len(rows)) * 100
            )
        else:
            avg_score = 0
            pass_rate = 0

        points.append(
            {
                "date": day_label,
                "date_key": day_key,
                "score": avg_score,
                "pass_rate": pass_rate,
                "submissions": len(rows),
            }
        )

    return points
