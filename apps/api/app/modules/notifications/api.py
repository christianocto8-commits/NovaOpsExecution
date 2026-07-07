from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.identity.dependencies import get_current_user, require_permission
from app.modules.identity.models import User
from app.modules.notifications.schemas import (
    MessageResponse,
    NotificationDeliveryRead,
    NotificationEventCreate,
    NotificationEventRead,
    NotificationTemplateCreate,
    NotificationTemplateRead,
    NotificationTemplateUpdate,
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
