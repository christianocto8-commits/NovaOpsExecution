from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.models.task import Task
from app.models.user import User
from app.modules.identity.models import User as IdentityUser
from app.modules.notifications.models import NotificationChannel
from app.modules.notifications.push_service import PushNotificationService
from app.modules.notifications.schemas import NotificationEventCreate
from app.modules.notifications.service import NotificationService


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
