"""Wipe transactional data that feeds Reports for all accounts/outlets.

Keeps identity (users/outlets/roles), form templates, task schedules, and settings.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.activity_event import ActivityEvent
from app.models.announcement import Announcement, AnnouncementRead
from app.models.execution_session import ExecutionSession
from app.models.finance_shift_deposit import FinanceShiftDepositRecord
from app.models.form_answer import FormAnswer
from app.models.form_submission import FormSubmission
from app.models.task import Task
from app.models.task_assignment import TaskAssignment
from app.models.task_comment import TaskComment
from app.models.task_draft import TaskDraft
from app.models.task_schedule_exception import TaskScheduleException
from app.modules.incidents.models import FollowUpAction, Incident
from app.modules.notifications.models import NotificationDelivery, NotificationEvent
from app.modules.webhooks.models import WebhookDelivery
from app.modules.workflows.models import (
    WorkflowApprovalHistory,
    WorkflowInstance,
    WorkflowInstanceStep,
    WorkflowTask,
    WorkflowVariable,
)


def _delete_count(db: Session, model, key: str, deleted: dict[str, int]) -> None:
    deleted[key] = db.query(model).delete(synchronize_session=False)


def wipe_report_data_for_all_accounts(db: Session) -> dict[str, int]:
    """Delete report-feeding rows across the whole workspace."""
    deleted: dict[str, int] = {}

    try:
        # Finance reports
        _delete_count(db, FinanceShiftDepositRecord, "finance_shift_deposits", deleted)

        # Form / checklist execution history
        _delete_count(db, FormAnswer, "form_answers", deleted)
        _delete_count(db, FormSubmission, "form_submissions", deleted)
        _delete_count(db, TaskComment, "task_comments", deleted)
        _delete_count(db, TaskAssignment, "task_assignments", deleted)
        _delete_count(db, ExecutionSession, "execution_sessions", deleted)
        _delete_count(db, Task, "tasks", deleted)
        _delete_count(db, TaskDraft, "task_drafts", deleted)
        _delete_count(db, TaskScheduleException, "task_schedule_exceptions", deleted)

        # Incidents / follow-ups (operational history)
        _delete_count(db, FollowUpAction, "ops_follow_up_actions", deleted)
        _delete_count(db, Incident, "ops_incidents", deleted)

        # Activity / announcements / notifications / webhook delivery history
        _delete_count(db, ActivityEvent, "activity_events", deleted)
        _delete_count(db, AnnouncementRead, "announcement_reads", deleted)
        _delete_count(db, Announcement, "announcements", deleted)
        _delete_count(db, NotificationDelivery, "notification_deliveries", deleted)
        _delete_count(db, NotificationEvent, "notification_events", deleted)
        _delete_count(db, WebhookDelivery, "webhook_deliveries", deleted)

        # Workflow runtime instances (not definitions)
        _delete_count(db, WorkflowApprovalHistory, "workflow_approval_history", deleted)
        _delete_count(db, WorkflowTask, "workflow_tasks", deleted)
        _delete_count(db, WorkflowVariable, "workflow_variables", deleted)
        _delete_count(db, WorkflowInstanceStep, "workflow_instance_steps", deleted)
        _delete_count(db, WorkflowInstance, "workflow_instances", deleted)

        db.commit()
        return deleted
    except Exception:
        db.rollback()
        raise
