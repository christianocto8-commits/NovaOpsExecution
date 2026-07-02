from sqlalchemy.orm import Session

from app.models.task_draft import TaskDraft


class TaskDraftRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_by_outlet(self, outlet_id: int) -> list[TaskDraft]:
        return (
            self.db.query(TaskDraft)
            .filter(
                TaskDraft.outlet_id == outlet_id,
                TaskDraft.status == "draft",
            )
            .order_by(TaskDraft.updated_at.desc())
            .all()
        )

    def get_by_id(self, draft_id: int, outlet_id: int) -> TaskDraft | None:
        return (
            self.db.query(TaskDraft)
            .filter(
                TaskDraft.id == draft_id,
                TaskDraft.outlet_id == outlet_id,
                TaskDraft.status == "draft",
            )
            .first()
        )

    def create(self, draft: TaskDraft) -> TaskDraft:
        self.db.add(draft)
        self.db.flush()
        return draft

    def delete(self, draft: TaskDraft) -> None:
        self.db.delete(draft)