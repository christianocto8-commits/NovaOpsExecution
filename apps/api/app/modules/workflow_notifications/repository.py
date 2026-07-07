from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.workflow_notifications.models import NotificationTemplate
from app.modules.workflow_notifications.schemas import (
    NotificationTemplateCreate,
    NotificationTemplateUpdate,
)


class NotificationTemplateRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_by_workflow(self, workflow_id: UUID) -> list[NotificationTemplate]:
        stmt = (
            select(NotificationTemplate)
            .where(NotificationTemplate.workflow_id == workflow_id)
            .order_by(NotificationTemplate.event.asc(), NotificationTemplate.created_at.desc())
        )
        return list(self.db.scalars(stmt).all())

    def get(self, template_id: UUID) -> NotificationTemplate | None:
        return self.db.get(NotificationTemplate, template_id)

    def create(self, payload: NotificationTemplateCreate) -> NotificationTemplate:
        template = NotificationTemplate(**payload.model_dump())
        self.db.add(template)
        self.db.commit()
        self.db.refresh(template)
        return template

    def update(
        self,
        template: NotificationTemplate,
        payload: NotificationTemplateUpdate,
    ) -> NotificationTemplate:
        data = payload.model_dump(exclude_unset=True)

        for key, value in data.items():
            setattr(template, key, value)

        self.db.commit()
        self.db.refresh(template)
        return template

    def delete(self, template: NotificationTemplate) -> None:
        self.db.delete(template)
        self.db.commit()
