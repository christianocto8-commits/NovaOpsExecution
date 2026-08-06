from __future__ import annotations

from datetime import datetime, time, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.outlet import Outlet as LegacyOutlet
from app.models.task import Task
from app.models.task_schedule import TaskSchedule
from app.models.user import User
from app.modules.identity.models import Outlet as IdentityOutlet
from app.modules.identity.models import Role, User as IdentityUser
from app.modules.notifications.models import NotificationDelivery, NotificationEvent
from app.modules.identity.permissions import ADMIN_ROLE, AREA_MANAGER_ROLE, OUTLET_ROLE, OWNER_ROLE
from app.modules.notifications.models import NotificationChannel
from app.modules.notifications.push_service import PushNotificationService
from app.modules.notifications.schemas import NotificationEventCreate
from app.modules.notifications.service import NotificationService
from app.services.email_service import EmailService
from app.services.sms_service import send_sms
from app.services.user_settings_store import get_user_settings
from app.services.workspace_settings import get_workspace_settings


NOTIFICATION_PREFS_NAMESPACE = "notification_prefs"
DEFAULT_NOTIFICATION_PREFS = {
    "email_enabled": True,
    "push_enabled": True,
    "digest_enabled": False,
    "sms_enabled": False,
    "task_incoming_enabled": True,
    "task_upcoming_enabled": True,
    "task_overdue_enabled": True,
    "task_completed_enabled": True,
    "checklist_failed_enabled": True,
    "quiet_hours_enabled": False,
    "quiet_hours_start": "22:00",
    "quiet_hours_end": "07:00",
}
EVENT_PREF_KEYS = {
    "task_incoming": "task_incoming_enabled",
    "task_scheduled_incoming": "task_incoming_enabled",
    "task_schedule_upcoming": "task_upcoming_enabled",
    "task_overdue": "task_overdue_enabled",
    "task_due_soon": "task_upcoming_enabled",
    "task_completed": "task_completed_enabled",
    "task_review_approved": "task_completed_enabled",
    "task_review_rejected": "task_completed_enabled",
    "checklist_failed": "checklist_failed_enabled",
}


def resolve_identity_user_id(db: Session, legacy_user_id: int | None) -> UUID | None:
    if not legacy_user_id:
        return None

    legacy_user = db.query(User).filter(User.id == legacy_user_id).first()
    if not legacy_user or not legacy_user.email:
        return None

    identity_user = (
        db.query(IdentityUser).filter(IdentityUser.email == legacy_user.email).first()
    )
    return identity_user.id if identity_user else None


def _notification_preferences(db: Session, identity_user_id: UUID) -> dict:
    return get_user_settings(
        db,
        identity_user_id,
        NOTIFICATION_PREFS_NAMESPACE,
        DEFAULT_NOTIFICATION_PREFS,
    )


def _event_allowed(db: Session, identity_user_id: UUID, event_type: str) -> bool:
    pref_key = EVENT_PREF_KEYS.get(event_type)
    if not pref_key:
        return True

    return bool(_notification_preferences(db, identity_user_id).get(pref_key, True))


def _parse_quiet_time(value: object, fallback: str) -> time:
    try:
        hour, minute = [int(part) for part in str(value or fallback).split(":")[:2]]
        return time(hour=hour, minute=minute)
    except (TypeError, ValueError):
        fallback_hour, fallback_minute = [int(part) for part in fallback.split(":")]
        return time(hour=fallback_hour, minute=fallback_minute)


def _is_quiet_hours(db: Session, identity_user_id: UUID) -> bool:
    prefs = _notification_preferences(db, identity_user_id)
    if not prefs.get("quiet_hours_enabled", False):
        return False

    current = datetime.now(timezone.utc).time()
    start = _parse_quiet_time(prefs.get("quiet_hours_start"), "22:00")
    end = _parse_quiet_time(prefs.get("quiet_hours_end"), "07:00")

    if start <= end:
        return start <= current < end

    return current >= start or current < end


def _channel_allowed(
    db: Session,
    identity_user_id: UUID,
    channel: str,
    *,
    honor_quiet_hours: bool = True,
) -> bool:
    prefs = _notification_preferences(db, identity_user_id)
    if channel == "push" and not prefs.get("push_enabled", True):
        return False
    if channel == "email" and not prefs.get("email_enabled", True):
        return False
    if channel == "sms" and not prefs.get("sms_enabled", False):
        return False
    if honor_quiet_hours and channel in {"push", "email", "sms"}:
        return not _is_quiet_hours(db, identity_user_id)
    return True


def _send_email_if_enabled(
    db: Session,
    *,
    identity_user_id: UUID,
    subject: str,
    body: str,
) -> None:
    settings = get_workspace_settings(db)
    if not settings.email_notifications:
        return
    if not _channel_allowed(db, identity_user_id, "email"):
        return

    identity_user = db.get(IdentityUser, identity_user_id)
    if not identity_user or not identity_user.email:
        return

    EmailService().send(identity_user.email, subject, body)


def _send_sms_if_enabled(
    db: Session,
    *,
    identity_user_id: UUID,
    body: str,
) -> None:
    settings = get_workspace_settings(db)
    if not settings.sms_notifications:
        return
    if not _channel_allowed(db, identity_user_id, "sms"):
        return

    identity_user = db.get(IdentityUser, identity_user_id)
    if not identity_user or not identity_user.phone_number:
        return

    send_sms(to_number=identity_user.phone_number, body=body)


def notify_task_recipient(
    db: Session,
    *,
    task: Task,
    event_type: str,
    subject: str,
    body: str,
    recipient_legacy_user_id: int | None = None,
) -> None:
    legacy_user_id = recipient_legacy_user_id or task.assigned_to
    identity_user_id = resolve_identity_user_id(db, legacy_user_id)

    if not identity_user_id:
        return
    if not _event_allowed(db, identity_user_id, event_type):
        return

    payload = {
        "task_id": task.id,
        "task_title": task.title,
        "outlet_id": task.outlet_id,
        "event_type": event_type,
    }

    NotificationService(db).create_event(
        NotificationEventCreate(
            event_type=event_type,
            source_module="tasks",
            source_entity_type="task",
            source_entity_id=str(task.id),
            recipient_user_id=identity_user_id,
            channel=NotificationChannel.in_app,
            subject=subject,
            body=body,
            payload_json=payload,
        )
    )

    if _channel_allowed(db, identity_user_id, "push"):
        PushNotificationService(db).send_to_user(
            identity_user_id,
            title=subject,
            body=body,
            url=f"/dashboard/tasks?taskId={task.id}",
            data=payload,
        )

    _send_email_if_enabled(
        db,
        identity_user_id=identity_user_id,
        subject=subject,
        body=body,
    )

    _send_sms_if_enabled(
        db,
        identity_user_id=identity_user_id,
        body=f"{subject}. {body}",
    )


def notify_task_reviewed(
    db: Session,
    *,
    task: Task,
    approved: bool,
    note: str | None = None,
) -> None:
    legacy_user_id = task.assigned_to
    identity_user_id = resolve_identity_user_id(db, legacy_user_id)

    if not identity_user_id:
        return

    event_type = "task_review_approved" if approved else "task_review_rejected"
    if not _event_allowed(db, identity_user_id, event_type):
        return

    identity_outlet = _resolve_identity_outlet(db, task.outlet_id)
    outlet_label = identity_outlet.name if identity_outlet else f"Outlet {task.outlet_id}"

    if approved:
        subject = f"Task disetujui: {task.title}"
        body = f'Task "{task.title}" di {outlet_label} telah disetujui.'
    else:
        subject = f"Task perlu diperbaiki: {task.title}"
        body = (
            f'Task "{task.title}" di {outlet_label} ditolak review.'
            + (f" Alasan: {note}" if note else " Silakan perbaiki dan submit ulang.")
        )

    payload = {
        "task_id": task.id,
        "task_title": task.title,
        "outlet_id": task.outlet_id,
        "event_type": event_type,
    }

    NotificationService(db).create_event(
        NotificationEventCreate(
            event_type=event_type,
            source_module="tasks",
            source_entity_type="task",
            source_entity_id=str(task.id),
            recipient_user_id=identity_user_id,
            channel=NotificationChannel.in_app,
            subject=subject,
            body=body,
            payload_json=payload,
        )
    )

    if _channel_allowed(db, identity_user_id, "push"):
        PushNotificationService(db).send_to_user(
            identity_user_id,
            title=subject,
            body=body,
            url=f"/dashboard/tasks?taskId={task.id}",
            data=payload,
        )

    _send_email_if_enabled(
        db,
        identity_user_id=identity_user_id,
        subject=subject,
        body=body,
    )


def _send_task_notification(
    db: Session,
    *,
    task: Task,
    identity_user_id: UUID,
    event_type: str,
    subject: str,
    body: str,
) -> None:
    if not _event_allowed(db, identity_user_id, event_type):
        return

    payload = {
        "task_id": task.id,
        "task_title": task.title,
        "outlet_id": task.outlet_id,
        "event_type": event_type,
    }

    NotificationService(db).create_event(
        NotificationEventCreate(
            event_type=event_type,
            source_module="tasks",
            source_entity_type="task",
            source_entity_id=str(task.id),
            recipient_user_id=identity_user_id,
            channel=NotificationChannel.in_app,
            subject=subject,
            body=body,
            payload_json=payload,
        )
    )

    if _channel_allowed(db, identity_user_id, "push"):
        PushNotificationService(db).send_to_user(
            identity_user_id,
            title=subject,
            body=body,
            url=f"/dashboard/tasks?taskId={task.id}",
            data=payload,
        )


def _task_incoming_recipients(
    db: Session,
    *,
    task: Task,
    excluded_user_ids: set[UUID] | None = None,
) -> list[IdentityUser]:
    return _recipients_for_legacy_outlet(
        db,
        legacy_outlet_id=task.outlet_id,
        excluded_user_ids=excluded_user_ids,
    )


def _recipients_for_legacy_outlet(
    db: Session,
    *,
    legacy_outlet_id: int,
    excluded_user_ids: set[UUID] | None = None,
) -> list[IdentityUser]:
    identity_outlet = _resolve_identity_outlet(db, legacy_outlet_id)
    if not identity_outlet:
        return []

    roles = db.scalars(
        select(Role).where(Role.slug.in_([OUTLET_ROLE, AREA_MANAGER_ROLE]))
    ).all()
    role_ids_by_slug = {role.slug: role.id for role in roles}
    if not role_ids_by_slug:
        return []

    recipients: list[IdentityUser] = []
    seen_user_ids = set(excluded_user_ids or set())

    outlet_role_id = role_ids_by_slug.get(OUTLET_ROLE)
    if outlet_role_id:
        outlet_users = db.scalars(
            select(IdentityUser).where(
                IdentityUser.is_active.is_(True),
                IdentityUser.role_id == outlet_role_id,
                IdentityUser.outlet_id == identity_outlet.id,
            )
        ).all()
        for user in outlet_users:
            if user.id in seen_user_ids:
                continue
            recipients.append(user)
            seen_user_ids.add(user.id)

    area_role_id = role_ids_by_slug.get(AREA_MANAGER_ROLE)
    if area_role_id:
        area_managers = db.scalars(
            select(IdentityUser).where(
                IdentityUser.is_active.is_(True),
                IdentityUser.role_id == area_role_id,
            )
        ).all()
        for user in area_managers:
            if user.id in seen_user_ids:
                continue
            if not _area_manager_has_outlet_access(user, identity_outlet):
                continue
            recipients.append(user)
            seen_user_ids.add(user.id)

    return recipients


def notify_task_incoming_recipients(
    db: Session,
    *,
    task: Task,
    event_type: str = "task_incoming",
    excluded_identity_user_ids: set[UUID] | None = None,
) -> None:
    identity_outlet = _resolve_identity_outlet(db, task.outlet_id)
    outlet_label = identity_outlet.name if identity_outlet else f"Outlet {task.outlet_id}"
    subject = f"Task baru masuk: {task.title}"
    body = f'Task "{task.title}" baru dibuat untuk {outlet_label}.'

    for recipient in _task_incoming_recipients(
        db,
        task=task,
        excluded_user_ids=excluded_identity_user_ids,
    ):
        _send_task_notification(
            db,
            task=task,
            identity_user_id=recipient.id,
            event_type=event_type,
            subject=subject,
            body=body,
        )


def _schedule_upcoming_already_sent(
    db: Session,
    *,
    source_entity_id: str,
    recipient_user_id: UUID,
) -> bool:
    return (
        db.query(NotificationDelivery.id)
        .join(NotificationEvent, NotificationEvent.id == NotificationDelivery.event_id)
        .filter(
            NotificationEvent.event_type == "task_schedule_upcoming",
            NotificationEvent.source_module == "task_schedules",
            NotificationEvent.source_entity_id == source_entity_id,
            NotificationDelivery.recipient_user_id == recipient_user_id,
        )
        .first()
        is not None
    )


def notify_task_schedule_upcoming_recipients(
    db: Session,
    *,
    schedule: TaskSchedule,
    outlet_id: int,
    outlet_ref: str,
    publish_at,
    shift: str | None = None,
) -> int:
    identity_outlet = _resolve_identity_outlet(db, outlet_id)
    outlet_label = identity_outlet.name if identity_outlet else f"Outlet {outlet_id}"
    shift_label = f" {shift}" if shift else ""
    publish_label = publish_at.strftime("%d %b %Y %H:%M UTC")
    source_entity_id = (
        f"schedule:{schedule.id}:outlet:{outlet_ref}:"
        f"shift:{shift or 'none'}:{publish_at.strftime('%Y%m%d%H%M')}"
    )
    subject = f"Task akan publish: {schedule.title}"
    body = (
        f'Task "{schedule.title}" untuk {outlet_label}{shift_label} '
        f"akan muncul pada {publish_label}. Task belum bisa dikerjakan sebelum jam publish."
    )
    sent = 0

    for recipient in _recipients_for_legacy_outlet(db, legacy_outlet_id=outlet_id):
        if not _event_allowed(db, recipient.id, "task_schedule_upcoming"):
            continue

        if _schedule_upcoming_already_sent(
            db,
            source_entity_id=source_entity_id,
            recipient_user_id=recipient.id,
        ):
            continue

        payload = {
            "schedule_id": schedule.id,
            "schedule_title": schedule.title,
            "outlet_id": outlet_id,
            "outlet_ref": outlet_ref,
            "shift": shift,
            "publish_at": publish_at.isoformat(),
            "event_type": "task_schedule_upcoming",
        }

        NotificationService(db).create_event(
            NotificationEventCreate(
                event_type="task_schedule_upcoming",
                source_module="task_schedules",
                source_entity_type="task_schedule",
                source_entity_id=source_entity_id,
                recipient_user_id=recipient.id,
                channel=NotificationChannel.in_app,
                subject=subject,
                body=body,
                payload_json=payload,
            )
        )

        if _channel_allowed(db, recipient.id, "push"):
            PushNotificationService(db).send_to_user(
                recipient.id,
                title=subject,
                body=body,
                url="/dashboard/tasks",
                data=payload,
            )
        sent += 1

    return sent


def _resolve_identity_outlet(db: Session, legacy_outlet_id: int) -> IdentityOutlet | None:
    legacy_outlet = (
        db.query(LegacyOutlet).filter(LegacyOutlet.id == legacy_outlet_id).first()
    )
    if not legacy_outlet:
        return None

    code = legacy_outlet.code.strip().upper()
    return db.query(IdentityOutlet).filter(IdentityOutlet.code == code).first()


def _area_manager_has_outlet_access(
    user: IdentityUser, identity_outlet: IdentityOutlet | None
) -> bool:
    if not identity_outlet:
        return True

    if user.outlet_id == identity_outlet.id:
        return True

    return any(outlet.id == identity_outlet.id for outlet in user.assigned_outlets)


def notify_task_completed_supervisors(
    db: Session,
    *,
    task: Task,
    completed_by_identity_id: UUID | None = None,
) -> None:
    identity_outlet = _resolve_identity_outlet(db, task.outlet_id)
    outlet_label = identity_outlet.name if identity_outlet else f"Outlet {task.outlet_id}"

    supervisor_roles = db.scalars(
        select(Role).where(Role.slug.in_([OWNER_ROLE, ADMIN_ROLE, AREA_MANAGER_ROLE]))
    ).all()
    if not supervisor_roles:
        return

    role_ids = [role.id for role in supervisor_roles]
    supervisors = db.scalars(
        select(IdentityUser).where(
            IdentityUser.is_active.is_(True),
            IdentityUser.role_id.in_(role_ids),
        )
    ).all()

    subject = f"Task selesai: {task.title}"
    body = (
        f'Task "{task.title}" di {outlet_label} telah diselesaikan oleh outlet '
        "dan evidence sudah terunggah."
    )

    for supervisor in supervisors:
        if completed_by_identity_id and supervisor.id == completed_by_identity_id:
            continue
        if not _event_allowed(db, supervisor.id, "task_completed"):
            continue

        role_slug = supervisor.role.slug if supervisor.role else ""
        if role_slug == AREA_MANAGER_ROLE and not _area_manager_has_outlet_access(
            supervisor, identity_outlet
        ):
            continue

        payload = {
            "task_id": task.id,
            "task_title": task.title,
            "outlet_id": task.outlet_id,
            "event_type": "task_completed",
        }

        NotificationService(db).create_event(
            NotificationEventCreate(
                event_type="task_completed",
                source_module="tasks",
                source_entity_type="task",
                source_entity_id=str(task.id),
                recipient_user_id=supervisor.id,
                channel=NotificationChannel.in_app,
                subject=subject,
                body=body,
                payload_json=payload,
            )
        )

        if _channel_allowed(db, supervisor.id, "push"):
            PushNotificationService(db).send_to_user(
                supervisor.id,
                title=subject,
                body=body,
                url=f"/dashboard/tasks?taskId={task.id}",
                data=payload,
            )

        _send_email_if_enabled(
            db,
            identity_user_id=supervisor.id,
            subject=subject,
            body=body,
        )


def notify_checklist_failure_supervisors(
    db: Session,
    *,
    task: Task,
    checklist: dict,
    submitted_by_identity_id: UUID | None = None,
) -> None:
    if checklist.get("status") == "pass":
        return

    identity_outlet = _resolve_identity_outlet(db, task.outlet_id)
    outlet_label = identity_outlet.name if identity_outlet else f"Outlet {task.outlet_id}"

    supervisor_roles = db.scalars(
        select(Role).where(Role.slug.in_([OWNER_ROLE, ADMIN_ROLE, AREA_MANAGER_ROLE]))
    ).all()
    if not supervisor_roles:
        return

    role_ids = [role.id for role in supervisor_roles]
    supervisors = db.scalars(
        select(IdentityUser).where(
            IdentityUser.is_active.is_(True),
            IdentityUser.role_id.in_(role_ids),
        )
    ).all()

    failed_count = checklist.get("failed_count", 0)
    score = checklist.get("score", 0)
    subject = f"Checklist gagal: {task.title}"
    body = (
        f'Checklist task "{task.title}" di {outlet_label} '
        f"mendapat skor {score}% dengan {failed_count} item gagal."
    )

    for supervisor in supervisors:
        if submitted_by_identity_id and supervisor.id == submitted_by_identity_id:
            continue
        if not _event_allowed(db, supervisor.id, "checklist_failed"):
            continue

        role_slug = supervisor.role.slug if supervisor.role else ""
        if role_slug == AREA_MANAGER_ROLE and not _area_manager_has_outlet_access(
            supervisor, identity_outlet
        ):
            continue

        payload = {
            "task_id": task.id,
            "task_title": task.title,
            "outlet_id": task.outlet_id,
            "event_type": "checklist_failed",
            "checklist_score": score,
            "checklist_status": checklist.get("status"),
        }

        NotificationService(db).create_event(
            NotificationEventCreate(
                event_type="checklist_failed",
                source_module="tasks",
                source_entity_type="task",
                source_entity_id=str(task.id),
                recipient_user_id=supervisor.id,
                channel=NotificationChannel.in_app,
                subject=subject,
                body=body,
                payload_json=payload,
            )
        )

        if _channel_allowed(db, supervisor.id, "push"):
            PushNotificationService(db).send_to_user(
                supervisor.id,
                title=subject,
                body=body,
                url=f"/dashboard/tasks?taskId={task.id}",
                data=payload,
            )

        _send_email_if_enabled(
            db,
            identity_user_id=supervisor.id,
            subject=subject,
            body=body,
        )
