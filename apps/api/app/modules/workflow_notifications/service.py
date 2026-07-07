from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.workflow_notifications.repository import NotificationTemplateRepository
from app.modules.workflow_notifications.schemas import (
    NotificationTemplateCreate,
    NotificationTemplateUpdate,
)


class NotificationTemplateService:
    def __init__(self, db: Session):
        self.repository = NotificationTemplateRepository(db)

    def list_by_workflow(self, workflow_id: UUID):
        return self.repository.list_by_workflow(workflow_id)

    def create(self, payload: NotificationTemplateCreate):
        return self.repository.create(payload)

    def update(self, template_id: UUID, payload: NotificationTemplateUpdate):
        template = self.repository.get(template_id)

        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification template not found",
            )

        return self.repository.update(template, payload)

    def delete(self, template_id: UUID) -> None:
        template = self.repository.get(template_id)

        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification template not found",
            )

        self.repository.delete(template)
