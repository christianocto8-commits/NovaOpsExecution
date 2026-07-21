from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session, joinedload

from app.models.activity_event import ActivityEvent
from app.models.outlet import Outlet
from app.models.task import Task
from app.models.task_comment import TaskComment
from app.models.user import User
from app.services.audit_trail import _actor_label, _ensure_utc, list_audit_events


ACTIVITY_ACTIONS = {
    "task_completed",
    "checklist_submitted",
    "checklist_failed",
    "capa_created",
    "capa_resolved",
    "form_submitted",
    "announcement_published",
    "task_overdue",
}


def _detail_url(action: str, resource_type: str | None, resource_id: str | None) -> str | None:
    if not resource_type or not resource_id:
        return None

    if resource_type == "task":
        return f"/dashboard/tasks?taskId={resource_id}"
    if resource_type == "form_submission":
        return f"/dashboard/history?submissionId={resource_id}"
    if resource_type == "execution_session":
        return f"/dashboard/history?sessionId={resource_id}"
    if resource_type == "announcement":
        return f"/dashboard/announcements?id={resource_id}"
    if action == "task_overdue":
        return f"/dashboard/tasks?taskId={resource_id}"
    return None


def _normalize_audit_event(raw: dict) -> dict | None:
    category = raw.get("category")
    action = raw.get("action", "")
    metadata = raw.get("metadata") or {}

    normalized_action: str | None = None

    if category == "task_comment":
        if action == "completed":
            normalized_action = "task_completed"
        elif action == "created" and metadata.get("source_type") == "corrective_action":
            normalized_action = "capa_created"
        elif action == "status_changed" and metadata.get("source_type") == "corrective_action":
            if metadata.get("new_status") == "completed":
                normalized_action = "capa_resolved"
    elif category == "form_submission":
        normalized_action = "form_submitted"
    elif category == "execution_session":
        checklist_status = metadata.get("checklist_status")
        if checklist_status == "pass":
            normalized_action = "checklist_submitted"
        elif checklist_status in {"fail", "partial"}:
            normalized_action = "checklist_failed"
        else:
            normalized_action = "checklist_submitted"

    if not normalized_action:
        return None

    resource_type = raw.get("resource_type")
    resource_id = raw.get("resource_id")

    return {
        "id": raw["id"],
        "action": normalized_action,
        "summary": raw["summary"],
        "actor_name": raw["actor_name"],
        "actor_id": raw.get("actor_id"),
        "outlet_id": raw.get("outlet_id"),
        "outlet_name": raw.get("outlet_name"),
        "resource_type": resource_type,
        "resource_id": resource_id,
        "occurred_at": raw["occurred_at"],
        "metadata": metadata,
        "detail_url": _detail_url(normalized_action, resource_type, resource_id),
    }


def _collect_capa_events(
    db: Session,
    *,
    outlet_id: int | None,
    outlet_ids: list[int] | None,
    all_outlets: bool,
    since: datetime,
) -> list[dict]:
    query = (
        db.query(Task)
        .options(joinedload(Task.outlet))
        .filter(Task.source_type == "corrective_action")
        .filter(Task.created_at >= since)
        .order_by(Task.created_at.desc())
    )

    if outlet_id is not None:
        query = query.filter(Task.outlet_id == outlet_id)
    elif not all_outlets:
        if outlet_ids is not None:
            if not outlet_ids:
                return []
            query = query.filter(Task.outlet_id.in_(outlet_ids))
        else:
            return []

    tasks = query.order_by(Task.created_at.desc()).all()
    creator_ids = {task.created_by for task in tasks if task.created_by}
    creators = {
        user.id: user for user in db.query(User).filter(User.id.in_(creator_ids)).all()
    } if creator_ids else {}

    events: list[dict] = []
    for task in tasks:
        outlet = task.outlet
        actor_name = _actor_label(creators.get(task.created_by), task.created_by)

        events.append(
            {
                "id": f"capa-created-{task.id}",
                "category": "task_comment",
                "action": "created",
                "summary": f"CAPA dibuat: {task.title}",
                "actor_name": actor_name,
                "actor_id": task.created_by,
                "outlet_id": task.outlet_id,
                "outlet_name": outlet.name if outlet else None,
                "resource_type": "task",
                "resource_id": str(task.id),
                "occurred_at": _ensure_utc(task.created_at),
                "metadata": {
                    "source_type": "corrective_action",
                    "parent_task_id": task.source_id,
                    "task_title": task.title,
                },
            }
        )

        if task.status == "completed" and task.completed_at and task.completed_at >= since:
            events.append(
                {
                    "id": f"capa-resolved-{task.id}",
                    "category": "task_comment",
                    "action": "status_changed",
                    "summary": f"CAPA diselesaikan: {task.title}",
                    "actor_name": actor_name,
                    "actor_id": task.created_by,
                    "outlet_id": task.outlet_id,
                    "outlet_name": outlet.name if outlet else None,
                    "resource_type": "task",
                    "resource_id": str(task.id),
                    "occurred_at": _ensure_utc(task.completed_at),
                    "metadata": {
                        "source_type": "corrective_action",
                        "new_status": "completed",
                        "task_title": task.title,
                    },
                }
            )

    return events


def _collect_overdue_events(
    db: Session,
    *,
    outlet_id: int | None,
    outlet_ids: list[int] | None,
    all_outlets: bool,
) -> list[dict]:
    now = datetime.now(timezone.utc)
    query = (
        db.query(Task)
        .options(joinedload(Task.outlet))
        .filter(Task.status.in_(["open", "in_progress"]))
        .filter(Task.due_date.isnot(None))
        .filter(Task.due_date < now)
    )

    if outlet_id is not None:
        query = query.filter(Task.outlet_id == outlet_id)
    elif not all_outlets:
        if outlet_ids is not None:
            if not outlet_ids:
                return []
            query = query.filter(Task.outlet_id.in_(outlet_ids))
        else:
            return []

    tasks = query.order_by(Task.due_date.desc()).limit(50).all()

    events: list[dict] = []
    for task in tasks:
        outlet = task.outlet
        events.append(
            {
                "id": f"task-overdue-{task.id}",
                "action": "task_overdue",
                "summary": f"Task terlambat: {task.title}",
                "actor_name": "System",
                "actor_id": None,
                "outlet_id": task.outlet_id,
                "outlet_name": outlet.name if outlet else None,
                "resource_type": "task",
                "resource_id": str(task.id),
                "occurred_at": _ensure_utc(task.due_date),
                "metadata": {
                    "task_title": task.title,
                    "due_date": task.due_date.isoformat() if task.due_date else None,
                },
                "detail_url": f"/dashboard/tasks?taskId={task.id}",
            }
        )

    return events


def _collect_persisted_events(
    db: Session,
    *,
    outlet_id: int | None,
    outlet_ids: list[int] | None,
    all_outlets: bool,
    since: datetime,
) -> list[dict]:
    query = (
        db.query(ActivityEvent)
        .filter(ActivityEvent.occurred_at >= since)
        .order_by(ActivityEvent.occurred_at.desc())
    )

    if outlet_id is not None:
        query = query.filter(ActivityEvent.outlet_id == outlet_id)
    elif not all_outlets:
        if outlet_ids is not None:
            if not outlet_ids:
                return []
            query = query.filter(ActivityEvent.outlet_id.in_(outlet_ids))
        else:
            return []

    outlet_map: dict[int, Outlet] = {}
    rows = query.all()
    outlet_ids_found = {row.outlet_id for row in rows if row.outlet_id}
    if outlet_ids_found:
        outlet_map = {
            outlet.id: outlet
            for outlet in db.query(Outlet).filter(Outlet.id.in_(outlet_ids_found)).all()
        }

    events: list[dict] = []
    for row in rows:
        outlet = outlet_map.get(row.outlet_id) if row.outlet_id else None
        events.append(
            {
                "id": f"activity-event-{row.id}",
                "action": row.action,
                "summary": row.summary,
                "actor_name": row.actor_name or "System",
                "actor_id": row.actor_id,
                "outlet_id": row.outlet_id,
                "outlet_name": outlet.name if outlet else None,
                "resource_type": row.resource_type,
                "resource_id": row.resource_id,
                "occurred_at": _ensure_utc(row.occurred_at),
                "metadata": row.metadata_json or {},
                "detail_url": _detail_url(row.action, row.resource_type, row.resource_id),
            }
        )

    return events


def list_activity_feed(
    db: Session,
    *,
    outlet_id: int | None = None,
    outlet_ids: list[int] | None = None,
    all_outlets: bool = False,
    days: int = 30,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[dict], int]:
    since = datetime.now(timezone.utc) - timedelta(days=max(1, days))

    raw_events, _ = list_audit_events(
        db,
        outlet_id=outlet_id,
        outlet_ids=outlet_ids,
        all_outlets=all_outlets,
        days=days,
        limit=500,
        offset=0,
    )

    capa_events = _collect_capa_events(
        db,
        outlet_id=outlet_id,
        outlet_ids=outlet_ids,
        all_outlets=all_outlets,
        since=since,
    )

    seen_ids: set[str] = set()
    normalized: list[dict] = []

    for raw in raw_events + capa_events:
        if raw["id"] in seen_ids:
            continue
        seen_ids.add(raw["id"])

        item = _normalize_audit_event(raw)
        if item:
            normalized.append(item)

    for item in _collect_persisted_events(
        db,
        outlet_id=outlet_id,
        outlet_ids=outlet_ids,
        all_outlets=all_outlets,
        since=since,
    ):
        if item["id"] not in seen_ids:
            seen_ids.add(item["id"])
            normalized.append(item)

    for item in _collect_overdue_events(
        db,
        outlet_id=outlet_id,
        outlet_ids=outlet_ids,
        all_outlets=all_outlets,
    ):
        if item["id"] not in seen_ids:
            seen_ids.add(item["id"])
            normalized.append(item)

    normalized = [event for event in normalized if event.get("occurred_at") is not None]
    normalized.sort(key=lambda event: event["occurred_at"], reverse=True)
    total = len(normalized)
    paginated = normalized[offset : offset + limit]
    return paginated, total
