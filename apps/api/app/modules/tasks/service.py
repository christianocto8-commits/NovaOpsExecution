from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.task import Task
from app.models.task_assignment import TaskAssignment
from app.models.task_comment import TaskComment
from app.models.user import User
from app.modules.notifications.task_notifications import (
    notify_task_completed_supervisors,
    notify_task_recipient,
)
from app.modules.tasks.repository import TaskRepository
from app.modules.tasks.schemas import (
    TaskAssignmentCreate,
    TaskCommentCreate,
    TaskCreate,
    TaskReviewUpdate,
    TaskStatusUpdate,
    TaskUpdate,
)


ALLOWED_STATUS_TRANSITIONS: dict[str, set[str]] = {
    "open": {"in_progress", "blocked", "cancelled"},
    "in_progress": {"blocked", "completed", "cancelled"},
    "blocked": {"open", "in_progress", "cancelled"},
    "completed": set(),
    "cancelled": set(),
}


class TaskService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = TaskRepository(db)

    def list_tasks(
        self,
        outlet_id: int | None = None,
        outlet_ids: list[int] | None = None,
        all_outlets: bool = False,
    ) -> list[Task]:
        if all_outlets:
            return self.repo.list_all()

        if outlet_ids is not None:
            return self.repo.list_by_outlets(outlet_ids)

        if outlet_id is None:
            return []

        return self.repo.list_by_outlet(outlet_id)

    def list_outlet_members(self, outlet_id: int) -> list[User]:
        return self.repo.list_outlet_members(outlet_id)

    def get_task(self, task_id: int, outlet_id: int) -> Task:
        task = self.repo.get_by_id(task_id, outlet_id)
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found",
            )
        return task

    def create_task(self, payload: TaskCreate, outlet_id: int, actor_id: int) -> Task:
        if payload.assigned_to:
            assignee = self.repo.get_outlet_member(outlet_id, payload.assigned_to)
            if not assignee:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Assigned user is not an active member of this outlet",
                )

        task = Task(
            title=payload.title,
            description=payload.description,
            outlet_id=outlet_id,
            assigned_to=payload.assigned_to,
            created_by=actor_id,
            source_type=payload.source_type,
            source_id=payload.source_id,
            priority=payload.priority,
            status="open",
            due_date=payload.due_date,
        )

        task = self.repo.create(task)

        self.repo.create_comment(
            TaskComment(
                task_id=task.id,
                user_id=actor_id,
                comment="Task created",
                event_type="created",
                new_value=task.title,
            )
        )

        if payload.assigned_to:
            self.repo.create_assignment(
                TaskAssignment(
                    task_id=task.id,
                    user_id=payload.assigned_to,
                    assigned_by=actor_id,
                    role="assignee",
                )
            )

            self.repo.create_comment(
                TaskComment(
                    task_id=task.id,
                    user_id=actor_id,
                    comment="Task assigned",
                    event_type="assigned",
                    new_value=str(payload.assigned_to),
                )
            )

        self.db.commit()
        self.db.refresh(task)

        if payload.assigned_to:
            notify_task_recipient(
                self.db,
                task=task,
                event_type="task_assigned",
                subject=f"Task baru ditugaskan: {task.title}",
                body=f'Anda ditugaskan untuk menyelesaikan task "{task.title}".',
                recipient_legacy_user_id=payload.assigned_to,
            )

        return task

    def update_task(
        self,
        task_id: int,
        outlet_id: int,
        actor_id: int,
        payload: TaskUpdate,
    ) -> Task:
        task = self.get_task(task_id, outlet_id)

        previous_assignee = task.assigned_to
        update_data = payload.model_dump(exclude_unset=True)

        if "assigned_to" in update_data and update_data["assigned_to"]:
            assignee = self.repo.get_outlet_member(outlet_id, update_data["assigned_to"])
            if not assignee:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Assigned user is not an active member of this outlet",
                )

        for key, value in update_data.items():
            setattr(task, key, value)

        self.repo.create_comment(
            TaskComment(
                task_id=task.id,
                user_id=actor_id,
                comment="Task updated",
                event_type="updated",
            )
        )

        if "assigned_to" in update_data and previous_assignee != task.assigned_to:
            if task.assigned_to:
                existing = self.repo.get_assignment_by_user(task.id, task.assigned_to)
                if not existing:
                    self.repo.create_assignment(
                        TaskAssignment(
                            task_id=task.id,
                            user_id=task.assigned_to,
                            assigned_by=actor_id,
                            role="assignee",
                        )
                    )

            self.repo.create_comment(
                TaskComment(
                    task_id=task.id,
                    user_id=actor_id,
                    comment="Task assignment changed",
                    event_type="assignment_changed",
                    previous_value=str(previous_assignee) if previous_assignee else None,
                    new_value=str(task.assigned_to) if task.assigned_to else None,
                )
            )

        self.db.commit()
        self.db.refresh(task)

        if "assigned_to" in update_data and previous_assignee != task.assigned_to and task.assigned_to:
            notify_task_recipient(
                self.db,
                task=task,
                event_type="task_assigned",
                subject=f"Task ditugaskan: {task.title}",
                body=f'Anda ditugaskan untuk menyelesaikan task "{task.title}".',
                recipient_legacy_user_id=task.assigned_to,
            )

        return task

    def update_status(
        self,
        task_id: int,
        outlet_id: int,
        actor_id: int,
        payload: TaskStatusUpdate,
        *,
        actor_identity_id: UUID | None = None,
    ) -> Task:
        task = self.get_task(task_id, outlet_id)

        if task.status == payload.status:
            return task

        allowed_next_statuses = ALLOWED_STATUS_TRANSITIONS.get(task.status, set())
        if payload.status not in allowed_next_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status transition from {task.status} to {payload.status}",
            )

        previous_status = task.status
        task.status = payload.status

        if payload.status == "completed":
            task.completed_at = datetime.now(timezone.utc)

        self.repo.create_comment(
            TaskComment(
                task_id=task.id,
                user_id=actor_id,
                comment="Task status changed",
                event_type="status_changed",
                previous_value=previous_status,
                new_value=payload.status,
            )
        )

        self.db.commit()
        self.db.refresh(task)

        if payload.status == "completed":
            notify_task_completed_supervisors(
                self.db,
                task=task,
                completed_by_identity_id=actor_identity_id,
            )

        return task

    def review_task(
        self,
        task_id: int,
        outlet_id: int,
        actor_id: int,
        payload: TaskReviewUpdate,
    ) -> Task:
        task = self.get_task(task_id, outlet_id)

        if task.status not in {"in_progress", "completed", "blocked"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Task is not ready for review",
            )

        approved = payload.review == "approved"
        previous_status = task.status

        if approved:
            task.status = "completed"
            task.approved_by = actor_id
            task.approved_at = datetime.now(timezone.utc)
            if task.completed_at is None:
                task.completed_at = task.approved_at
        else:
            task.status = "in_progress"
            task.approved_by = None
            task.approved_at = None

        self.repo.create_comment(
            TaskComment(
                task_id=task.id,
                user_id=actor_id,
                comment=payload.note or ("Evidence approved" if approved else "Evidence rejected"),
                event_type="review_approved" if approved else "review_rejected",
                previous_value=previous_status,
                new_value=task.status,
            )
        )

        self.db.commit()
        self.db.refresh(task)
        return task

    def add_comment(
        self,
        task_id: int,
        outlet_id: int,
        actor_id: int,
        payload: TaskCommentCreate,
    ) -> TaskComment:
        task = self.get_task(task_id, outlet_id)

        comment = TaskComment(
            task_id=task.id,
            user_id=actor_id,
            comment=payload.comment,
            evidence_url=payload.evidence_url,
            event_type="comment",
        )

        comment = self.repo.create_comment(comment)

        self.db.commit()
        self.db.refresh(comment)
        return comment

    def list_assignments(self, task_id: int, outlet_id: int) -> list[TaskAssignment]:
        task = self.get_task(task_id, outlet_id)
        return self.repo.list_assignments(task.id)

    def assign_user(
        self,
        task_id: int,
        outlet_id: int,
        actor_id: int,
        payload: TaskAssignmentCreate,
    ) -> TaskAssignment:
        task = self.get_task(task_id, outlet_id)

        user = self.repo.get_outlet_member(outlet_id, payload.user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is not an active member of this outlet",
            )

        existing = self.repo.get_assignment_by_user(task.id, payload.user_id)
        if existing:
            return existing

        assignment = self.repo.create_assignment(
            TaskAssignment(
                task_id=task.id,
                user_id=payload.user_id,
                assigned_by=actor_id,
                role=payload.role,
            )
        )

        if not task.assigned_to:
            task.assigned_to = payload.user_id

        self.repo.create_comment(
            TaskComment(
                task_id=task.id,
                user_id=actor_id,
                comment="User assigned to task",
                event_type="assigned",
                new_value=str(payload.user_id),
            )
        )

        self.db.commit()
        self.db.refresh(assignment)

        notify_task_recipient(
            self.db,
            task=task,
            event_type="task_assigned",
            subject=f"Task ditugaskan: {task.title}",
            body=f'Anda ditugaskan untuk menyelesaikan task "{task.title}".',
            recipient_legacy_user_id=payload.user_id,
        )

        return assignment

    def remove_assignment(
        self,
        task_id: int,
        outlet_id: int,
        actor_id: int,
        assignment_id: int,
    ) -> None:
        task = self.get_task(task_id, outlet_id)

        assignment = self.repo.get_assignment(task.id, assignment_id)
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assignment not found",
            )

        removed_user_id = assignment.user_id

        self.repo.delete_assignment(assignment)

        if task.assigned_to == removed_user_id:
            task.assigned_to = None

        self.repo.create_comment(
            TaskComment(
                task_id=task.id,
                user_id=actor_id,
                comment="User removed from task assignment",
                event_type="assignment_removed",
                previous_value=str(removed_user_id),
            )
        )

        self.db.commit()

    def delete_task(self, task_id: int, outlet_id: int) -> None:
        from app.models.execution_session import ExecutionSession

        task = self.get_task(task_id, outlet_id)
        self.db.query(ExecutionSession).filter(ExecutionSession.task_id == task_id).delete()
        self.repo.delete(task)
        self.db.commit()
