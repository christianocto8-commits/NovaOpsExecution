from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.workflow_notifications.schemas import (
    NotificationTemplateCreate,
    NotificationTemplateRead,
    NotificationTemplateUpdate,
)
from app.modules.workflow_notifications.service import NotificationTemplateService

router = APIRouter(prefix="/workflow-notifications", tags=["workflow-notifications"])


@router.get(
    "/templates",
    response_model=list[NotificationTemplateRead],
)
def list_notification_templates(
    workflow_id: UUID,
    db: Session = Depends(get_db),
):
    service = NotificationTemplateService(db)
    return service.list_by_workflow(workflow_id)


@router.post(
    "/templates",
    response_model=NotificationTemplateRead,
    status_code=status.HTTP_201_CREATED,
)
def create_notification_template(
    payload: NotificationTemplateCreate,
    db: Session = Depends(get_db),
):
    service = NotificationTemplateService(db)
    return service.create(payload)


@router.put(
    "/templates/{template_id}",
    response_model=NotificationTemplateRead,
)
def update_notification_template(
    template_id: UUID,
    payload: NotificationTemplateUpdate,
    db: Session = Depends(get_db),
):
    service = NotificationTemplateService(db)
    return service.update(template_id, payload)


@router.delete(
    "/templates/{template_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_notification_template(
    template_id: UUID,
    db: Session = Depends(get_db),
):
    service = NotificationTemplateService(db)
    service.delete(template_id)
