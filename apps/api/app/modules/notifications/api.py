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
)
from app.modules.notifications.service import NotificationService, NotificationTemplateService

router = APIRouter(prefix="/notifications", tags=["Notifications"])


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
    return NotificationService(db).list_user_deliveries(user.id)


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
