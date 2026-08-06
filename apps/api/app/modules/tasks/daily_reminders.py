from __future__ import annotations

from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy.orm import Session

from app.models.task import Task
from app.modules.tasks.overdue_alerts import _get_task_recipients
from app.modules.notifications.models import NotificationDelivery, NotificationEvent
from app.modules.notifications.task_notifications import notify_task_recipient, resolve_identity_user_id
from app.services.workspace_settings import get_workspace_settings


def _workspace_timezone(db: Session) -> ZoneInfo:
    settings = get_workspace_settings(db)
    try:
        return ZoneInfo(settings.timezone or "Asia/Jakarta")
    except ZoneInfoNotFoundError:
        return ZoneInfo("Asia/Jakarta")


def _daily_reminder_sent_for_date(
    db: Session,
    *,
    day_key: str,
    recipient_legacy_user_id: int,
) -> bool:
    recipient_identity_id = resolve_identity_user_id(db, recipient_legacy_user_id)
    if not recipient_identity_id:
        return True

    return (
        db.query(NotificationDelivery.id)
        .join(NotificationEvent, NotificationEvent.id == NotificationDelivery.event_id)
        .filter(
            NotificationEvent.event_type == "task_daily_reminder",
            NotificationEvent.source_entity_type == "daily_reminder",
            NotificationEvent.source_entity_id == day_key,
            NotificationDelivery.recipient_user_id == recipient_identity_id,
        )
        .first()
        is not None
    )


def process_daily_task_reminders(db: Session) -> dict[str, int]:
    """Send a once-per-day summary reminder of today's open tasks to each
    assignee/supervisor, at the configured daily_reminder_window hour."""
    settings = get_workspace_settings(db)
    window = (settings.daily_reminder_window or "06:00").strip()
    try:
        reminder_hour, _reminder_minute = [int(part) for part in window.split(":")]
    except (TypeError, ValueError):
        reminder_hour = 6

    tz = _workspace_timezone(db)
    local_now = datetime.now(tz)

    if local_now.hour != reminder_hour:
        return {"skipped": 1, "alerts_created": 0}

    local_midnight = local_now.replace(hour=0, minute=0, second=0, microsecond=0)
    day_key = local_midnight.date().isoformat()
    start_utc = local_midnight.astimezone(timezone.utc)
    end_utc = (local_midnight + timedelta(days=1)).astimezone(timezone.utc)

    today_tasks = (
        db.query(Task)
        .filter(
            Task.due_date.isnot(None),
            Task.due_date >= start_utc,
            Task.due_date < end_utc,
            Task.status.notin_(["completed", "cancelled"]),
        )
        .order_by(Task.id.asc())
        .all()
    )

    by_recipient: dict[int, list[Task]] = {}
    for task in today_tasks:
        for recipient_legacy_id in _get_task_recipients(db, task):
            by_recipient.setdefault(recipient_legacy_id, []).append(task)

    alerts_created = 0
    skipped = 0

    for recipient_legacy_id, tasks in by_recipient.items():
        if _daily_reminder_sent_for_date(db, day_key=day_key, recipient_legacy_user_id=recipient_legacy_id):
            skipped += 1
            continue

        open_count = len(tasks)
        subject = f"Reminder: {open_count} task untuk hari ini"
        body = (
            f"Anda memiliki {open_count} task yang harus diselesaikan hari ini:\n"
            + "\n".join(f"- {task.title}" for task in tasks[:10])
            + (f"\n...dan {open_count - 10} lainnya." if open_count > 10 else "")
        )

        notify_task_recipient(
            db,
            task=tasks[0],
            event_type="task_daily_reminder",
            subject=subject,
            body=body,
            recipient_legacy_user_id=recipient_legacy_id,
        )
        alerts_created += 1

    db.commit()

    return {
        "checked": len(today_tasks),
        "recipients": len(by_recipient),
        "alerts_created": alerts_created,
        "skipped": skipped,
    }


def _sla_escalation_sent(db: Session, *, task_id: int, recipient_legacy_user_id: int) -> bool:
    recipient_identity_id = resolve_identity_user_id(db, recipient_legacy_user_id)
    if not recipient_identity_id:
        return True

    return (
        db.query(NotificationDelivery.id)
        .join(NotificationEvent, NotificationEvent.id == NotificationDelivery.event_id)
        .filter(
            NotificationEvent.event_type == "task_sla_escalation",
            NotificationEvent.source_entity_type == "task",
            NotificationEvent.source_entity_id == str(task_id),
            NotificationDelivery.recipient_user_id == recipient_identity_id,
        )
        .first()
        is not None
    )


def process_critical_task_sla_escalations(db: Session) -> dict[str, int]:
    """Escalate high/urgent tasks that have been sitting unworked longer than the
    configured escalation_after_hours, gated by the critical_escalation setting."""
    settings = get_workspace_settings(db)
    if not settings.critical_escalation:
        return {"skipped": 1, "escalated": 0}

    threshold_hours = max(1, int(settings.escalation_after_hours or 4))
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(hours=threshold_hours)

    stalled_tasks = (
        db.query(Task)
        .filter(
            Task.priority.in_(["high", "urgent"]),
            Task.status == "open",
            Task.created_at.isnot(None),
            Task.created_at <= cutoff,
        )
        .order_by(Task.id.asc())
        .all()
    )

    escalated = 0
    skipped = 0

    for task in stalled_tasks:
        recipients = _get_task_recipients(db, task)
        if not recipients:
            skipped += 1
            continue

        for recipient_legacy_id in recipients:
            if _sla_escalation_sent(db, task_id=task.id, recipient_legacy_user_id=recipient_legacy_id):
                skipped += 1
                continue

            notify_task_recipient(
                db,
                task=task,
                event_type="task_sla_escalation",
                subject=f"Escalasi SLA: {task.title} belum dikerjakan",
                body=(
                    f'Task "{task.title}" (prioritas tinggi) belum dikerjakan '
                    f"selama lebih dari {threshold_hours} jam. Mohon tindak lanjut."
                ),
                recipient_legacy_user_id=recipient_legacy_id,
            )
            escalated += 1

    db.commit()

    return {
        "stalled_tasks": len(stalled_tasks),
        "escalated": escalated,
        "skipped": skipped,
    }