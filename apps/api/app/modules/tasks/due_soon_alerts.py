from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.task import Task
from app.modules.tasks.overdue_alerts import _get_task_recipients
from app.modules.notifications.models import NotificationDelivery, NotificationEvent
from app.modules.notifications.task_notifications import notify_task_recipient, resolve_identity_user_id

DUE_SOON_HOURS = 24


def _recipient_already_notified(
    db: Session,
    *,
    task_id: int,
    event_type: str,
    recipient_legacy_user_id: int,
) -> bool:
    recipient_identity_id = resolve_identity_user_id(db, recipient_legacy_user_id)
    if not recipient_identity_id:
        return True

    return (
        db.query(NotificationDelivery.id)
        .join(NotificationEvent, NotificationEvent.id == NotificationDelivery.event_id)
        .filter(
            NotificationEvent.event_type == event_type,
            NotificationEvent.source_entity_type == "task",
            NotificationEvent.source_entity_id == str(task_id),
            NotificationDelivery.recipient_user_id == recipient_identity_id,
        )
        .first()
        is not None
    )


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
        recipients = _get_task_recipients(db, task)
        if not recipients:
            skipped += 1
            continue

        for recipient_legacy_id in recipients:
            if _recipient_already_notified(
                db,
                task_id=task.id,
                event_type="task_due_soon",
                recipient_legacy_user_id=recipient_legacy_id,
            ):
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
                recipient_legacy_user_id=recipient_legacy_id,
            )
            alerts_created += 1

    return {
        "due_soon_tasks": len(due_soon_tasks),
        "alerts_created": alerts_created,
        "skipped": skipped,
    }
