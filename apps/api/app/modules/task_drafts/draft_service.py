from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.task import Task
from app.models.task_comment import TaskComment
from app.models.task_draft import TaskDraft
from app.modules.task_drafts.draft_repository import TaskDraftRepository
from app.modules.task_drafts.draft_schemas import TaskDraftCreate, TaskDraftUpdate


class TaskDraftService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = TaskDraftRepository(db)

    def list_drafts(self, outlet_id: int) -> list[TaskDraft]:
        return self.repo.list_by_outlet(outlet_id)

    def get_draft(self, draft_id: int, outlet_id: int) -> TaskDraft:
        draft = self.repo.get_by_id(draft_id, outlet_id)

        if not draft:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Draft not found",
            )

        return draft

    def create_draft(
        self,
        payload: TaskDraftCreate,
        outlet_id: int,
        actor_id: int,
    ) -> TaskDraft:
        draft = TaskDraft(
            title=payload.title,
            description=payload.description,
            outlet_id=outlet_id,
            created_by=actor_id,
            assigned_to=payload.assigned_to,
            priority=payload.priority,
            due_date=payload.due_date,
            source_type=payload.source_type,
            source_id=payload.source_id,
            status="draft",
        )

        draft = self.repo.create(draft)

        self.db.commit()
        self.db.refresh(draft)

        return draft

    def update_draft(
        self,
        draft_id: int,
        outlet_id: int,
        payload: TaskDraftUpdate,
    ) -> TaskDraft:
        draft = self.get_draft(draft_id, outlet_id)
        update_data = payload.model_dump(exclude_unset=True)

        for key, value in update_data.items():
            setattr(draft, key, value)

        self.db.commit()
        self.db.refresh(draft)

        return draft

    def delete_draft(self, draft_id: int, outlet_id: int) -> None:
        draft = self.get_draft(draft_id, outlet_id)
        self.repo.delete(draft)
        self.db.commit()

    def publish_draft(
        self,
        draft_id: int,
        outlet_id: int,
        actor_id: int,
    ) -> Task:
        draft = self.get_draft(draft_id, outlet_id)

        task = Task(
            title=draft.title,
            description=draft.description,
            outlet_id=draft.outlet_id,
            assigned_to=draft.assigned_to,
            created_by=actor_id,
            source_type=draft.source_type,
            source_id=draft.source_id,
            priority=draft.priority,
            status="open",
            due_date=draft.due_date,
        )

        self.db.add(task)
        self.db.flush()

        self.db.add(
            TaskComment(
                task_id=task.id,
                user_id=actor_id,
                comment="Task published from draft",
                event_type="published_from_draft",
                new_value=draft.title,
            )
        )

        self.repo.delete(draft)

        self.db.commit()
        self.db.refresh(task)

        return task