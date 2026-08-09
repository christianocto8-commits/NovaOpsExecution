from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.task import Task
from app.models.task_comment import TaskComment
from app.modules.identity.models import Outlet as IdentityOutlet
from app.modules.identity.models import Role, User as IdentityUser
from app.modules.identity.permissions import ADMIN_ROLE, AREA_MANAGER_ROLE, OWNER_ROLE
from app.modules.notifications.models import NotificationDelivery, NotificationEvent
from app.modules.notifications.task_notifications import notify_task_recipient, resolve_identity_user_id
from app.services.webhook_dispatcher import dispatch_webhook_event
from app.services.workspace_settings import get_workspace_settings

OVERDUE_ESCALATION_MINUTES = (15, 30, 60)


def _resolve_identity_outlet(db: Session, legacy_outlet_id: int) -> IdentityOutlet | None:
    from app.models.outlet import Outlet

    legacy_outlet = db.query(Outlet).filter(Outlet.id == legacy_outlet_id).first()
    if not legacy_outlet:
        return None

    return db.query(IdentityOutlet).filter(IdentityOutlet.code == legacy_outlet.code.strip().upper()).first()


def _area_manager_has_outlet_access(user: IdentityUser, identity_outlet: IdentityOutlet | None) -> bool:
    if not identity_outlet:
        return True
    if user.outlet_id == identity_outlet.id:
        return True
    return any(outlet.id == identity_outlet.id for outlet in user.assigned_outlets)


def _legacy_id_for_identity_user(db: Session, identity_user: IdentityUser) -> int | None:
    from app.models.user import User

    legacy = db.query(User).filter(User.email == identity_user.email).first()
    return legacy.id if legacy else None


def _get_task_recipients(db: Session, task: Task) -> list[int]:
    recipients: list[int] = []
    seen: set[int] = set()

    if task.assigned_to:
        recipients.append(task.assigned_to)
        seen.add(task.assigned_to)

    identity_outlet = _resolve_identity_outlet(db, task.outlet_id)
    supervisor_roles = db.scalars(
        select(Role).where(Role.slug.in_([OWNER_ROLE, ADMIN_ROLE, AREA_MANAGER_ROLE]))
    ).all()
    if not supervisor_roles:
        return recipients

    supervisors = db.scalars(
        select(IdentityUser).where(
            IdentityUser.role_id.in_([role.id for role in supervisor_roles]),
            IdentityUser.is_active.is_(True),
        )
    ).all()

    for supervisor in supervisors:
        role_slug = supervisor.role.slug if supervisor.role else ""
        if role_slug == AREA_MANAGER_ROLE and not _area_manager_has_outlet_access(supervisor, identity_outlet):
            continue
        legacy_id = _legacy_id_for_identity_user(db, supervisor)
        if legacy_id and legacy_id not in seen:
            recipients.append(legacy_id)
            seen.add(legacy_id)

    return recipients


def _recipient_already_notified(
    db: Session,
    *,
    task_id: int,
    event_type: str,
    recipient_legacy_user_id: int,
) -> bool:
    # In-app / push / email notifications are identity-based: they require the
    # recipient to be mapped to an IdentityUser. A legacy-only recipient (no
    # IdentityUser mapping) is therefore never directly reachable here, so we
    # treat them as already-notified to avoid dispatching duplicate/no-op
    # notifications every scheduler tick. Overdue escalation is still surfaced
    # to external systems via the "task.overdue_escalation" webhook.
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


def _process_escalation_rules(
    db: Session,
    *,
    task: Task,
    now: datetime,
    due_date: datetime,
) -> int:
    minutes_overdue = int((now - due_date).total_seconds() // 60)
    recipients = _get_task_recipients(db, task)
    alerts_created = 0

    for level in OVERDUE_ESCALATION_MINUTES:
        if minutes_overdue < level:
            continue

        event_type = f"task_overdue_escalation_{level}m"

        # Webhook signal so external notifiers are reached even when task
        # recipients are not yet mapped to an IdentityUser (legacy-only).
        try:
            dispatch_webhook_event(
                db,
                event_type="task.overdue_escalation",
                outlet_id=task.outlet_id,
                payload={
                    "task_id": task.id,
                    "task_title": task.title,
                    "outlet_id": task.outlet_id,
                    "due_date": task.due_date.isoformat() if task.due_date else None,
                    "status": task.status,
                    "minutes_overdue": minutes_overdue,
                    "escalation_level_minutes": level,
                },
            )
        except Exception:
            pass

        for recipient_legacy_id in recipients:
            if _recipient_already_notified(
                db,
                task_id=task.id,
                event_type=event_type,
                recipient_legacy_user_id=recipient_legacy_id,
            ):
                continue

            notify_task_recipient(
                db,
                task=task,
                event_type=event_type,
                subject=f"Escalation {level}m overdue: {task.title}",
                body=(
                    f'Task "{task.title}" sudah overdue {minutes_overdue} menit. '
                    "Mohon tindak lanjut atau buat corrective action bila perlu."
                ),
                recipient_legacy_user_id=recipient_legacy_id,
            )
            alerts_created += 1

    return alerts_created


def process_overdue_task_alerts(db: Session) -> dict[str, int]:
    settings = get_workspace_settings(db)
    if not settings.overdue_alerts:
        return {"overdue_tasks": 0, "alerts_created": 0, "skipped": 0, "expired_tasks": 0}

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
    expired_tasks = 0

    for task in overdue_tasks:
        due_date = task.due_date
        if due_date and due_date.tzinfo is None:
            due_date = due_date.replace(tzinfo=timezone.utc)

        if due_date:
            alerts_created += _process_escalation_rules(
                db,
                task=task,
                now=now,
                due_date=due_date,
            )

        if due_date and due_date + timedelta(minutes=60) <= now:
            if task.expired_at is None:
                previous_status = task.status
                if previous_status not in {"completed", "cancelled"}:
                    task.expired_at = now
                    db.add(
                        TaskComment(
                            task_id=task.id,
                            user_id=task.created_by,
                            comment="Task expired 60 minutes after overdue and moved to overdue report.",
                            event_type="overdue_expired",
                            previous_value=previous_status,
                            new_value=previous_status,
                        )
                    )

                try:
                    dispatch_webhook_event(
                        db,
                        event_type="task.overdue",
                        outlet_id=task.outlet_id,
                        payload={
                            "task_id": task.id,
                            "task_title": task.title,
                            "outlet_id": task.outlet_id,
                            "due_date": task.due_date.isoformat() if task.due_date else None,
                            "status": task.status,
                            "expired_after_minutes": 60,
                        },
                    )
                except Exception:
                    pass

            expired_tasks += 1
            continue

        recipients = _get_task_recipients(db, task)
        if not recipients:
            skipped += 1
            continue

        for recipient_legacy_id in recipients:
            if _recipient_already_notified(
                db,
                task_id=task.id,
                event_type="task_overdue",
                recipient_legacy_user_id=recipient_legacy_id,
            ):
                skipped += 1
                continue

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

        try:
            dispatch_webhook_event(
                db,
                event_type="task.overdue",
                outlet_id=task.outlet_id,
                payload={
                    "task_id": task.id,
                    "task_title": task.title,
                    "outlet_id": task.outlet_id,
                    "due_date": task.due_date.isoformat() if task.due_date else None,
                    "status": task.status,
                },
            )
        except Exception:
            pass

    db.commit()

    return {
        "overdue_tasks": len(overdue_tasks),
        "alerts_created": alerts_created,
        "skipped": skipped,
        "expired_tasks": expired_tasks,
    }
