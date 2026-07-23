from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.execution_session import ExecutionSession
from app.models.task import Task
from app.models.task_assignment import TaskAssignment
from app.models.task_comment import TaskComment
from app.models.user import User
from app.modules.identity.models import User as IdentityUser
from app.modules.lms.service import LmsService
from app.modules.notifications.task_notifications import (
    notify_checklist_failure_supervisors,
    notify_task_incoming_recipients,
    notify_task_completed_supervisors,
    notify_task_recipient,
    resolve_identity_user_id,
)
from app.services.activity_events import record_activity_event
from app.modules.tasks.repository import TaskRepository
from app.modules.tasks.schemas import (
    TaskAssignmentCreate,
    TaskCommentCreate,
    TaskCreate,
    TaskExecutionSubmit,
    TaskReviewUpdate,
    TaskStatusUpdate,
    TaskUpdate,
)
from app.repositories.outlet_repository import OutletRepository
from app.services.geofence import is_within_geofence
from app.services.checklist_scoring import score_checklist
from app.services.iot_checklist_bridge import (
    build_iot_failed_items,
    merge_iot_failures_into_checklist,
)
from app.services.execution_validation import validate_task_execution_answers
from app.services.field_visibility import (
    enrich_responses_for_task_execution,
    validate_conditional_required_fields,
)
from app.services.webhook_dispatcher import dispatch_webhook_event
from app.services.workflow_triggers import (
    maybe_trigger_checklist_fail_workflow,
    maybe_trigger_task_completed_workflow,
)
from app.services.workspace_settings import get_workspace_settings


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
        source_type: str | None = None,
    ) -> list[Task]:
        if all_outlets:
            return self.repo.list_all(source_type=source_type)

        if outlet_ids is not None:
            return self.repo.list_by_outlets(outlet_ids, source_type=source_type)

        if outlet_id is None:
            return []

        return self.repo.list_by_outlet(outlet_id, source_type=source_type)

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

        try:
            dispatch_webhook_event(
                self.db,
                event_type="task.created",
                outlet_id=task.outlet_id,
                payload={
                    "task_id": task.id,
                    "title": task.title,
                    "outlet_id": task.outlet_id,
                    "assigned_to": task.assigned_to,
                    "priority": task.priority,
                    "source_type": task.source_type,
                },
            )
        except Exception:
            pass

        if payload.assigned_to:
            assigned_identity_user_id = resolve_identity_user_id(self.db, payload.assigned_to)
            try:
                dispatch_webhook_event(
                    self.db,
                    event_type="task.assigned",
                    outlet_id=task.outlet_id,
                    payload={
                        "task_id": task.id,
                        "title": task.title,
                        "outlet_id": task.outlet_id,
                        "assigned_to": task.assigned_to,
                        "assigned_by": actor_id,
                        "source_type": task.source_type,
                    },
                )
            except Exception:
                pass

            notify_task_recipient(
                self.db,
                task=task,
                event_type="task_assigned",
                subject=f"Task baru ditugaskan: {task.title}",
                body=f'Anda ditugaskan untuk menyelesaikan task "{task.title}".',
                recipient_legacy_user_id=payload.assigned_to,
            )
        else:
            assigned_identity_user_id = None

        notify_task_incoming_recipients(
            self.db,
            task=task,
            excluded_identity_user_ids=(
                {assigned_identity_user_id} if assigned_identity_user_id else None
            ),
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
            assigned_identity_user_id = resolve_identity_user_id(self.db, task.assigned_to)
            try:
                dispatch_webhook_event(
                    self.db,
                    event_type="task.assigned",
                    outlet_id=task.outlet_id,
                    payload={
                        "task_id": task.id,
                        "title": task.title,
                        "outlet_id": task.outlet_id,
                        "assigned_to": task.assigned_to,
                        "previous_assignee": previous_assignee,
                        "assigned_by": actor_id,
                        "source_type": task.source_type,
                    },
                )
            except Exception:
                pass

            notify_task_recipient(
                self.db,
                task=task,
                event_type="task_assigned",
                subject=f"Task ditugaskan: {task.title}",
                body=f'Anda ditugaskan untuk menyelesaikan task "{task.title}".',
                recipient_legacy_user_id=task.assigned_to,
            )

            notify_task_incoming_recipients(
                self.db,
                task=task,
                event_type="task_assignment_updated",
                excluded_identity_user_ids=(
                    {assigned_identity_user_id} if assigned_identity_user_id else None
                ),
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
            actor = self.db.get(User, actor_id)
            actor_name = actor.name if actor and actor.name else f"User {actor_id}"
            capa_action = (
                "capa_resolved"
                if task.source_type == "corrective_action"
                else "task_completed"
            )
            record_activity_event(
                self.db,
                action=capa_action,
                summary=(
                    f"CAPA diselesaikan: {task.title}"
                    if capa_action == "capa_resolved"
                    else f"Task selesai: {task.title}"
                ),
                outlet_id=task.outlet_id,
                actor_id=actor_id,
                actor_name=actor_name,
                resource_type="task",
                resource_id=str(task.id),
            )
            notify_task_completed_supervisors(
                self.db,
                task=task,
                completed_by_identity_id=actor_identity_id,
            )
            try:
                dispatch_webhook_event(
                    self.db,
                    event_type="task.completed",
                    outlet_id=task.outlet_id,
                    payload={
                        "task_id": task.id,
                        "task_title": task.title,
                        "outlet_id": task.outlet_id,
                        "status": task.status,
                        "completed_at": task.completed_at.isoformat() if task.completed_at else None,
                    },
                )
                maybe_trigger_task_completed_workflow(
                    self.db,
                    task=task,
                    completed_by_identity_id=actor_identity_id,
                )
            except Exception:
                pass

        return task

    def submit_execution(
        self,
        task_id: int,
        outlet_id: int,
        actor_id: int,
        payload: TaskExecutionSubmit,
        *,
        actor_identity_id: UUID | None = None,
    ) -> tuple[Task, dict]:
        task = self.get_task(task_id, outlet_id)

        if task.status in {"completed", "cancelled"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Task is already closed",
            )

        workspace_settings = get_workspace_settings(self.db)

        if workspace_settings.lms_training_gate_enabled and actor_identity_id:
            identity_user = self.db.get(IdentityUser, actor_identity_id)
            if identity_user and LmsService(self.db).has_incomplete_required_training(identity_user):
                titles = LmsService(self.db).incomplete_required_module_titles(identity_user)
                detail = "Complete required training before submitting tasks."
                if titles:
                    detail = f"{detail} Missing: {', '.join(titles[:3])}"
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=detail,
                )

        if workspace_settings.geofence_enabled:
            outlet = OutletRepository(self.db).get_outlet_by_id(task.outlet_id)
            allowed, message = is_within_geofence(
                submitter_lat=payload.latitude,
                submitter_lon=payload.longitude,
                outlet_lat=getattr(outlet, "latitude", None) if outlet else None,
                outlet_lon=getattr(outlet, "longitude", None) if outlet else None,
                radius_meters=workspace_settings.geofence_radius_meters,
            )
            if not allowed:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=message or "Outside outlet geofence.",
                )

        form_template_id = payload.form_template_id or task.form_template_id
        if form_template_id is None and task.source_type == "form_template":
            form_template_id = task.source_id

        validate_task_execution_answers(
            self.db,
            payload.answers_json,
            form_template_id=form_template_id,
        )

        responses = payload.answers_json.get("responses") or {}
        if form_template_id and isinstance(responses, dict):
            responses = enrich_responses_for_task_execution(
                self.db,
                form_template_id=form_template_id,
                responses=responses,
                answers_json=payload.answers_json,
            )
            validate_conditional_required_fields(
                self.db,
                form_template_id=form_template_id,
                responses=responses,
            )

        checklist_result = score_checklist(
            self.db,
            form_template_id=form_template_id,
            answers_json=payload.answers_json,
        )
        iot_failures = build_iot_failed_items(
            self.db,
            legacy_outlet_id=outlet_id,
            settings=workspace_settings,
        )
        checklist_result = merge_iot_failures_into_checklist(
            checklist_result,
            iot_failures,
            pass_threshold=workspace_settings.pass_threshold,
        )
        answers_with_checklist = {
            **payload.answers_json,
            "_checklist": checklist_result,
        }
        if payload.latitude is not None and payload.longitude is not None:
            answers_with_checklist["_submit_location"] = {
                "latitude": payload.latitude,
                "longitude": payload.longitude,
                "accuracy_m": payload.accuracy_m,
            }

        self.db.query(ExecutionSession).filter(
            ExecutionSession.task_id == task.id,
            ExecutionSession.status == "draft",
        ).delete(synchronize_session=False)

        execution_session = ExecutionSession(
            task_id=task.id,
            form_template_id=form_template_id,
            source_type="sop_task",
            status="completed",
            answers_json=answers_with_checklist,
            submitted_by=actor_id,
        )
        self.db.add(execution_session)
        previous_status = task.status
        completed = not workspace_settings.approval_required

        if task.status == "open":
            task.status = "in_progress"

        if completed:
            task.status = "completed"
            task.completed_at = datetime.now(timezone.utc)

        self.repo.create_comment(
            TaskComment(
                task_id=task.id,
                user_id=actor_id,
                comment="Evidence submitted by outlet",
                event_type="completed" if completed else "evidence_submitted",
                previous_value=previous_status,
                new_value=task.status,
            )
        )

        corrective_task: Task | None = None

        if (
            workspace_settings.auto_corrective_action
            and checklist_result.get("failed_items")
        ):
            failed_items = checklist_result["failed_items"]
            failed_labels = [item["label"] for item in failed_items]
            if len(failed_labels) <= 3:
                corrective_title = f"Corrective: {', '.join(failed_labels)}"
            else:
                corrective_title = f"Corrective: {task.title}"

            description_lines = [
                f"Checklist failure from task #{task.id}: {task.title}",
                f"Score: {checklist_result['score']}% (threshold: {workspace_settings.pass_threshold}%)",
                "",
                "Failed items:",
            ]
            for item in failed_items:
                description_lines.append(
                    f"- {item['label']}: {item.get('value') or '-'} ({item['reason']})"
                )

            priority = (
                "urgent"
                if checklist_result.get("status") == "fail"
                else "high"
            )
            due_date = datetime.now(timezone.utc) + timedelta(
                hours=max(1, workspace_settings.corrective_action_sla_hours)
            )

            corrective_task = Task(
                title=corrective_title,
                description="\n".join(description_lines),
                outlet_id=task.outlet_id,
                assigned_to=task.assigned_to,
                created_by=actor_id,
                source_type="corrective_action",
                source_id=task.id,
                priority=priority,
                status="open",
                due_date=due_date,
            )
            self.repo.create(corrective_task)
            self.repo.create_comment(
                TaskComment(
                    task_id=corrective_task.id,
                    user_id=actor_id,
                    comment="Corrective action created from checklist failure",
                    event_type="created",
                    new_value=corrective_title,
                )
            )

        self.db.commit()
        self.db.refresh(task)

        actor = self.db.get(User, actor_id)
        actor_name = actor.name if actor and actor.name else f"User {actor_id}"

        checklist_action = (
            "checklist_submitted"
            if checklist_result.get("status") == "pass"
            else "checklist_failed"
        )
        record_activity_event(
            self.db,
            action=checklist_action,
            summary=f"Checklist {checklist_result.get('status')} untuk {task.title} ({checklist_result.get('score')}%)",
            outlet_id=task.outlet_id,
            actor_id=actor_id,
            actor_name=actor_name,
            resource_type="task",
            resource_id=str(task.id),
            metadata={
                "checklist_status": checklist_result.get("status"),
                "score": checklist_result.get("score"),
            },
        )

        if corrective_task is not None:
            self.db.refresh(corrective_task)
            record_activity_event(
                self.db,
                action="capa_created",
                summary=f"CAPA dibuat: {corrective_task.title}",
                outlet_id=task.outlet_id,
                actor_id=actor_id,
                actor_name=actor_name,
                resource_type="task",
                resource_id=str(corrective_task.id),
                metadata={"parent_task_id": task.id},
            )

        if completed:
            record_activity_event(
                self.db,
                action="task_completed",
                summary=f"Task selesai: {task.title}",
                outlet_id=task.outlet_id,
                actor_id=actor_id,
                actor_name=actor_name,
                resource_type="task",
                resource_id=str(task.id),
            )

        if checklist_result.get("status") != "pass":
            notify_checklist_failure_supervisors(
                self.db,
                task=task,
                checklist=checklist_result,
                submitted_by_identity_id=actor_identity_id,
            )
            try:
                dispatch_webhook_event(
                    self.db,
                    event_type="checklist.failed",
                    outlet_id=task.outlet_id,
                    payload={
                        "task_id": task.id,
                        "task_title": task.title,
                        "outlet_id": task.outlet_id,
                        "checklist_status": checklist_result.get("status"),
                        "checklist_score": checklist_result.get("score"),
                        "failed_items": checklist_result.get("failed_items", []),
                    },
                )
                maybe_trigger_checklist_fail_workflow(
                    self.db,
                    task=task,
                    checklist=checklist_result,
                    submitted_by_identity_id=actor_identity_id,
                )
            except Exception:
                pass

        if completed:
            notify_task_completed_supervisors(
                self.db,
                task=task,
                completed_by_identity_id=actor_identity_id,
            )
            try:
                dispatch_webhook_event(
                    self.db,
                    event_type="task.completed",
                    outlet_id=task.outlet_id,
                    payload={
                        "task_id": task.id,
                        "task_title": task.title,
                        "outlet_id": task.outlet_id,
                        "status": task.status,
                        "completed_at": task.completed_at.isoformat() if task.completed_at else None,
                    },
                )
                maybe_trigger_task_completed_workflow(
                    self.db,
                    task=task,
                    completed_by_identity_id=actor_identity_id,
                )
            except Exception:
                pass

        return task, checklist_result, corrective_task

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

    def verify_task(
        self,
        task_id: int,
        outlet_id: int,
        actor_id: int,
    ) -> Task:
        task = self.get_task(task_id, outlet_id)

        if task.source_type != "corrective_action":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only corrective action tasks can be manager-verified",
            )

        if task.status != "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Task must be completed before manager verification",
            )

        if task.verified_at:
            return task

        task.verified_at = datetime.now(timezone.utc)

        self.repo.create_comment(
            TaskComment(
                task_id=task.id,
                user_id=actor_id,
                comment="CAPA verified by manager",
                event_type="capa_verified",
                previous_value=None,
                new_value=task.verified_at.isoformat(),
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

        assigned_identity_user_id = resolve_identity_user_id(self.db, payload.user_id)
        notify_task_incoming_recipients(
            self.db,
            task=task,
            event_type="task_assignment_updated",
            excluded_identity_user_ids=(
                {assigned_identity_user_id} if assigned_identity_user_id else None
            ),
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
