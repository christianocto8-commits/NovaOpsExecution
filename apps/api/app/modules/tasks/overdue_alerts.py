from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.task import Task
from app.modules.identity.models import Role, User as IdentityUser
from app.modules.notifications.models import NotificationEvent
from app.modules.notifications.task_notifications import notify_task_recipient


def _get_task_recipients(db: Session, task: Task) -> list[int]:
    if task.assigned_to:
        return [task.assigned_to]

    admin_role = db.scalar(select(Role).where(Role.slug == "owner"))
    if not admin_role:
        return []

    admin_users = db.scalars(
        select(IdentityUser).where(
            IdentityUser.role_id == admin_role.id,
            IdentityUser.is_active.is_(True),
        )
    ).all()

    from app.models.user import User

    legacy_ids: list[int] = []
    for admin in admin_users:
        legacy = db.query(User).filter(User.email == admin.email).first()
        if legacy:
            legacy_ids.append(legacy.id)

    return legacy_ids


def process_overdue_task_alerts(db: Session) -> dict[str, int]:
    now = datetime.now(timezone.utc)
    overdue_tasks = (
        db.query(Task)
        .filter(
            Task.due_date.isnot(None),
            Task.due_date < now,
            Task.status.notin_(["completed", "cancelled"]),
        )
        .order_by(Task.id.asc())
        .all()
    )

    alerts_created = 0
    skipped = 0

    for task in overdue_tasks:
        already_notified = db.scalar(
            select(NotificationEvent.id).where(
                NotificationEvent.event_type == "task_overdue",
                NotificationEvent.source_entity_type == "task",
                NotificationEvent.source_entity_id == str(task.id),
            )
        )
        if already_notified:
            skipped += 1
            continue

        recipients = _get_task_recipients(db, task)
        if not recipients:
            skipped += 1
            continue

        for recipient_legacy_id in recipients:
            notify_task_recipient(
                db,
                task=task,
                event_type="task_overdue",
                subject=f"Task terlambat: {task.title}",
                body=(
                    f'Task "{task.title}" sudah melewati batas waktu. '
                    f"Batas: {task.due_date.isoformat() if task.due_date else '-'}."
                ),
                recipient_legacy_user_id=recipient_legacy_id,
            )
            alerts_created += 1

    return {
        "overdue_tasks": len(overdue_tasks),
        "alerts_created": alerts_created,
        "skipped": skipped,
    }
