from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.task import Task
from app.modules.notifications.models import NotificationEvent
from app.modules.notifications.task_notifications import notify_task_recipient

DUE_SOON_HOURS = 24


def process_due_soon_task_alerts(db: Session) -> dict[str, int]:
    now = datetime.now(timezone.utc)
    due_threshold = now + timedelta(hours=DUE_SOON_HOURS)

    due_soon_tasks = (
        db.query(Task)
        .filter(
            Task.due_date.isnot(None),
            Task.due_date > now,
            Task.due_date <= due_threshold,
            Task.status.notin_(["completed", "cancelled"]),
        )
        .order_by(Task.id.asc())
        .all()
    )

    alerts_created = 0
    skipped = 0

    for task in due_soon_tasks:
        already_notified = db.scalar(
            select(NotificationEvent.id).where(
                NotificationEvent.event_type == "task_due_soon",
                NotificationEvent.source_entity_type == "task",
                NotificationEvent.source_entity_id == str(task.id),
            )
        )
        if already_notified:
            skipped += 1
            continue

        if not task.assigned_to:
            skipped += 1
            continue

        notify_task_recipient(
            db,
            task=task,
            event_type="task_due_soon",
            subject=f"Task segera jatuh tempo: {task.title}",
            body=(
                f'Task "{task.title}" jatuh tempo dalam 24 jam. '
                f"Batas: {task.due_date.isoformat() if task.due_date else '-'}."
            ),
            recipient_legacy_user_id=task.assigned_to,
        )
        alerts_created += 1

    return {
        "due_soon_tasks": len(due_soon_tasks),
        "alerts_created": alerts_created,
        "skipped": skipped,
    }
