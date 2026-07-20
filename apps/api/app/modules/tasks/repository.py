from sqlalchemy.orm import Session, joinedload

from app.models.task import Task
from app.models.task_assignment import TaskAssignment
from app.models.task_comment import TaskComment
from app.models.user import User


class TaskRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_by_outlet(self, outlet_id: int, source_type: str | None = None) -> list[Task]:
        query = (
            self.db.query(Task)
            .options(joinedload(Task.schedule), joinedload(Task.outlet))
            .filter(Task.outlet_id == outlet_id)
        )
        if source_type:
            query = query.filter(Task.source_type == source_type)
        return query.order_by(Task.created_at.desc()).all()

    def list_by_outlets(
        self, outlet_ids: list[int], source_type: str | None = None
    ) -> list[Task]:
        if not outlet_ids:
            return []

        query = (
            self.db.query(Task)
            .options(joinedload(Task.schedule), joinedload(Task.outlet))
            .filter(Task.outlet_id.in_(outlet_ids))
        )
        if source_type:
            query = query.filter(Task.source_type == source_type)
        return query.order_by(Task.created_at.desc()).all()

    def list_all(self, source_type: str | None = None) -> list[Task]:
        query = self.db.query(Task).options(joinedload(Task.schedule), joinedload(Task.outlet))
        if source_type:
            query = query.filter(Task.source_type == source_type)
        return query.order_by(Task.created_at.desc()).all()

    def get_any_by_id(self, task_id: int) -> Task | None:
        return self.db.query(Task).filter(Task.id == task_id).first()

    def get_by_id(self, task_id: int, outlet_id: int) -> Task | None:
        return (
            self.db.query(Task)
            .options(
                joinedload(Task.comments),
                joinedload(Task.assignments).joinedload(TaskAssignment.user),
            )
            .filter(Task.id == task_id, Task.outlet_id == outlet_id)
            .first()
        )

    def create(self, task: Task) -> Task:
        self.db.add(task)
        self.db.flush()
        return task

    def delete(self, task: Task) -> None:
        self.db.delete(task)

    def create_comment(self, comment: TaskComment) -> TaskComment:
        self.db.add(comment)
        self.db.flush()
        return comment

    def list_outlet_members(self, outlet_id: int) -> list[User]:
        return (
            self.db.query(User)
            .filter(User.outlet_id == outlet_id, User.is_active.is_(True))
            .order_by(User.name.asc())
            .all()
        )

    def get_outlet_member(self, outlet_id: int, user_id: int) -> User | None:
        return (
            self.db.query(User)
            .filter(
                User.id == user_id,
                User.outlet_id == outlet_id,
                User.is_active.is_(True),
            )
            .first()
        )

    def list_assignments(self, task_id: int) -> list[TaskAssignment]:
        return (
            self.db.query(TaskAssignment)
            .options(joinedload(TaskAssignment.user))
            .filter(TaskAssignment.task_id == task_id)
            .order_by(TaskAssignment.created_at.desc())
            .all()
        )

    def get_assignment(self, task_id: int, assignment_id: int) -> TaskAssignment | None:
        return (
            self.db.query(TaskAssignment)
            .filter(
                TaskAssignment.id == assignment_id,
                TaskAssignment.task_id == task_id,
            )
            .first()
        )

    def get_assignment_by_user(self, task_id: int, user_id: int) -> TaskAssignment | None:
        return (
            self.db.query(TaskAssignment)
            .filter(
                TaskAssignment.task_id == task_id,
                TaskAssignment.user_id == user_id,
            )
            .first()
        )

    def create_assignment(self, assignment: TaskAssignment) -> TaskAssignment:
        self.db.add(assignment)
        self.db.flush()
        return assignment

    def delete_assignment(self, assignment: TaskAssignment) -> None:
        self.db.delete(assignment)
