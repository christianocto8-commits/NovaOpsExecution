from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.modules.identity.dependencies import get_current_user, require_permission
from app.modules.identity.models import User
from app.modules.notifications.push_repository import PushSubscriptionRepository
from app.modules.notifications.device_push_repository import DevicePushTokenRepository
from app.modules.notifications.push_service import PushNotificationService
from app.modules.notifications.schemas import (
    MessageResponse,
    NotificationDeliveryRead,
    NotificationEventCreate,
    NotificationEventRead,
    NotificationTemplateCreate,
    NotificationTemplateRead,
    NotificationTemplateUpdate,
    PushSubscriptionCreate,
    PushSubscriptionRead,
    PushSubscriptionUnsubscribe,
    PushTestResponse,
    DevicePushTokenRegister,
    DevicePushTokenRead,
    HistoryNotesRead,
    HistoryNotesUpdate,
    NotificationPreferencesRead,
    NotificationPreferencesUpdate,
    UnreadCountResponse,
    MarkNotificationsRead,
)
from app.modules.notifications.service import NotificationService, NotificationTemplateService
from app.services.user_settings_store import get_user_settings, save_user_settings

router = APIRouter(prefix="/notifications", tags=["Notifications"])

NOTIFICATION_PREFS_NAMESPACE = "notification_prefs"
HISTORY_NOTES_NAMESPACE = "history_notes"
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


def _read_notification_preferences_payload(stored: dict) -> NotificationPreferencesRead:
    return NotificationPreferencesRead(
        email_enabled=bool(stored.get("email_enabled", True)),
        push_enabled=bool(stored.get("push_enabled", True)),
        digest_enabled=bool(stored.get("digest_enabled", False)),
        sms_enabled=bool(stored.get("sms_enabled", False)),
        task_incoming_enabled=bool(stored.get("task_incoming_enabled", True)),
        task_upcoming_enabled=bool(stored.get("task_upcoming_enabled", True)),
        task_overdue_enabled=bool(stored.get("task_overdue_enabled", True)),
        task_completed_enabled=bool(stored.get("task_completed_enabled", True)),
        checklist_failed_enabled=bool(stored.get("checklist_failed_enabled", True)),
        quiet_hours_enabled=bool(stored.get("quiet_hours_enabled", False)),
        quiet_hours_start=str(stored.get("quiet_hours_start") or "22:00"),
        quiet_hours_end=str(stored.get("quiet_hours_end") or "07:00"),
    )


@router.get(
    "/templates",
    response_model=list[NotificationTemplateRead],
    dependencies=[Depends(require_permission("workflow.read"))],
)
def list_notification_templates(db: Session = Depends(get_db)):
    return NotificationTemplateService(db).list_templates()


@router.post(
    "/templates",
    response_model=NotificationTemplateRead,
    status_code=status.HTTP_201_CREATED,
)
def create_notification_template(
    payload: NotificationTemplateCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("workflow.edit")),
):
    return NotificationTemplateService(db).create_template(payload)


@router.put(
    "/templates/{template_id}",
    response_model=NotificationTemplateRead,
)
def update_notification_template(
    template_id: UUID,
    payload: NotificationTemplateUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("workflow.edit")),
):
    return NotificationTemplateService(db).update_template(template_id, payload)


@router.delete(
    "/templates/{template_id}",
    response_model=MessageResponse,
)
def delete_notification_template(
    template_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("workflow.edit")),
):
    NotificationTemplateService(db).delete_template(template_id)
    return {"message": "Notification template deleted"}


@router.post(
    "/events",
    response_model=NotificationEventRead,
    status_code=status.HTTP_201_CREATED,
)
def create_notification_event(
    payload: NotificationEventCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("workflow.edit")),
):
    return NotificationService(db).create_event(payload, created_by_id=user.id)


@router.get(
    "/me",
    response_model=list[NotificationDeliveryRead],
)
def list_my_notifications(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return NotificationService(db).list_user_delivery_reads(user.id)


@router.get("/me/unread-count", response_model=UnreadCountResponse)
def get_my_unread_notification_count(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    count = NotificationService(db).get_unread_count(user.id)
    return UnreadCountResponse(unread_count=count)


@router.post("/me/mark-read", response_model=MessageResponse)
def mark_my_notifications_read(
    payload: MarkNotificationsRead = MarkNotificationsRead(),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    delivery_ids = payload.delivery_ids or None
    marked = NotificationService(db).mark_all_read(user.id, delivery_ids)
    return {"message": f"Marked {marked} notification(s) as read"}


@router.get("/preferences", response_model=NotificationPreferencesRead)
def get_notification_preferences(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stored = get_user_settings(db, user.id, NOTIFICATION_PREFS_NAMESPACE, DEFAULT_NOTIFICATION_PREFS)
    return _read_notification_preferences_payload(stored)


@router.put("/preferences", response_model=NotificationPreferencesRead)
def update_notification_preferences(
    payload: NotificationPreferencesUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    current = get_user_settings(db, user.id, NOTIFICATION_PREFS_NAMESPACE, DEFAULT_NOTIFICATION_PREFS)
    update_data = payload.model_dump(exclude_unset=True)
    next_prefs = {**current, **update_data}
    saved = save_user_settings(db, user.id, NOTIFICATION_PREFS_NAMESPACE, next_prefs)
    return _read_notification_preferences_payload(saved)


@router.get("/history-notes", response_model=HistoryNotesRead)
def get_history_notes(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stored = get_user_settings(db, user.id, HISTORY_NOTES_NAMESPACE, {"notes": {}})
    notes = stored.get("notes") if isinstance(stored.get("notes"), dict) else {}
    return HistoryNotesRead(notes={str(key): str(value) for key, value in notes.items()})


@router.put("/history-notes", response_model=HistoryNotesRead)
def update_history_notes(
    payload: HistoryNotesUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    saved = save_user_settings(
        db,
        user.id,
        HISTORY_NOTES_NAMESPACE,
        {"notes": payload.notes},
    )
    notes = saved.get("notes") if isinstance(saved.get("notes"), dict) else {}
    return HistoryNotesRead(notes={str(key): str(value) for key, value in notes.items()})


@router.post(
    "/process",
    dependencies=[Depends(require_permission("workflow.edit"))],
)
def process_pending_notifications(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("workflow.edit")),
):
    return NotificationService(db).process_pending()


def _parse_outlet_uuid(raw_outlet_id: str | None) -> UUID | None:
    if not raw_outlet_id:
        return None

    try:
        return UUID(raw_outlet_id)
    except (TypeError, ValueError):
        return None


@router.post(
    "/push/subscribe",
    response_model=PushSubscriptionRead,
    status_code=status.HTTP_201_CREATED,
)
def subscribe_push_notifications(
    payload: PushSubscriptionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    x_outlet_id: str | None = Header(default=None, alias="X-Outlet-Id"),
):
    outlet_id = payload.outlet_id or _parse_outlet_uuid(x_outlet_id)

    return PushSubscriptionRepository(db).upsert(
        user_id=user.id,
        endpoint=payload.endpoint.strip(),
        p256dh=payload.keys.p256dh.strip(),
        auth=payload.keys.auth.strip(),
        outlet_id=outlet_id,
    )


@router.delete(
    "/push/unsubscribe",
    response_model=MessageResponse,
)
def unsubscribe_push_notifications(
    payload: PushSubscriptionUnsubscribe,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    removed = PushSubscriptionRepository(db).delete_by_endpoint(
        payload.endpoint.strip(),
        user.id,
    )

    if not removed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Push subscription not found",
        )

    return {"message": "Push subscription removed"}


@router.post(
    "/push/register-device",
    response_model=DevicePushTokenRead,
    status_code=status.HTTP_201_CREATED,
)
def register_device_push_token(
    payload: DevicePushTokenRegister,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    x_outlet_id: str | None = Header(default=None, alias="X-Outlet-Id"),
):
    outlet_id = payload.outlet_id or _parse_outlet_uuid(x_outlet_id)

    return DevicePushTokenRepository(db).upsert(
        user_id=user.id,
        token=payload.token.strip(),
        platform=payload.platform.strip().lower(),
        outlet_id=outlet_id,
        user_agent=request.headers.get("user-agent"),
    )


@router.delete(
    "/push/register-device",
    response_model=MessageResponse,
)
def unregister_device_push_token(
    payload: DevicePushTokenRegister,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    removed = DevicePushTokenRepository(db).delete_by_token(payload.token.strip(), user.id)

    if not removed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device push token not found",
        )

    return {"message": "Device push token removed"}


@router.post(
    "/push/test",
    response_model=PushTestResponse,
)
def test_push_notification(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    settings = get_settings()

    if settings.environment not in {"local", "development", "dev"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Push test endpoint is only available in local development",
        )

    push_service = PushNotificationService(db)

    if not push_service.is_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="VAPID keys are not configured on the API server",
        )

    result = push_service.send_to_user(
        user.id,
        title="NovaOps — Tes Notifikasi",
        body="Push notification berhasil dikirim dari server local.",
        url="/dashboard/tasks",
        data={"event_type": "push_test"},
    )

    return {
        "message": "Push test dispatched",
        "result": result,
    }
