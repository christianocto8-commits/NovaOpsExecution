from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.outlet import Outlet as LegacyOutlet
from app.models.task import Task
from app.models.user import User
from app.modules.identity.models import Outlet as IdentityOutlet
from app.modules.identity.models import Role, User as IdentityUser
from app.modules.identity.permissions import ADMIN_ROLE, AREA_MANAGER_ROLE, OUTLET_ROLE, OWNER_ROLE
from app.modules.notifications.models import NotificationChannel
from app.modules.notifications.push_service import PushNotificationService
from app.modules.notifications.schemas import NotificationEventCreate
from app.modules.notifications.service import NotificationService
from app.services.email_service import EmailService
from app.services.sms_service import send_sms
from app.services.workspace_settings import get_workspace_settings


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


def _send_task_notification(
    db: Session,
    *,
    task: Task,
    identity_user_id: UUID,
    event_type: str,
    subject: str,
    body: str,
) -> None:
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
    identity_outlet = _resolve_identity_outlet(db, task.outlet_id)
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
