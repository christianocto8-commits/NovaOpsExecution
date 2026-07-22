import json

from sqlalchemy.orm import Session

from app.models.activity_event import ActivityEvent
from app.models.announcement import Announcement, AnnouncementRead
from app.models.builder_document import BuilderDocument
from app.models.execution_session import ExecutionSession
from app.models.form_answer import FormAnswer
from app.models.form_field import FormField
from app.models.form_schedule import FormSchedule
from app.models.form_submission import FormSubmission
from app.models.form_template import FormTemplate
from app.models.form_template_version import FormTemplateVersion
from app.models.runtime_template import RuntimeTemplate
from app.models.task import Task
from app.models.task_assignment import TaskAssignment
from app.models.task_comment import TaskComment
from app.models.task_draft import TaskDraft
from app.models.task_schedule import TaskSchedule
from app.modules.api_keys.models import ApiKey
from app.modules.notifications.models import (
    DevicePushToken,
    NotificationDelivery,
    NotificationEvent,
    PushSubscription,
)
from app.modules.webhooks.models import WebhookDelivery
from app.modules.workflows.models import (
    WorkflowApprovalHistory,
    WorkflowInstance,
    WorkflowInstanceStep,
    WorkflowTask,
    WorkflowVariable,
)
from app.schemas.settings import SettingsResponse
from app.services.workspace_settings import get_or_create_settings_row


def _delete_count(db: Session, model, key: str, deleted: dict[str, int]) -> None:
    deleted[key] = db.query(model).delete(synchronize_session=False)


def reset_workspace_for_smoke_test(db: Session) -> dict:
    deleted: dict[str, int] = {}

    try:
        row = get_or_create_settings_row(db)
        row.payload = json.dumps(SettingsResponse().model_dump())
        db.add(row)

        _delete_count(db, FormAnswer, "form_answers", deleted)
        _delete_count(db, FormSubmission, "form_submissions", deleted)
        _delete_count(db, TaskComment, "task_comments", deleted)
        _delete_count(db, TaskAssignment, "task_assignments", deleted)
        _delete_count(db, ExecutionSession, "execution_sessions", deleted)
        _delete_count(db, Task, "tasks", deleted)
        _delete_count(db, TaskSchedule, "task_schedules", deleted)
        _delete_count(db, TaskDraft, "task_drafts", deleted)
        _delete_count(db, FormField, "form_fields", deleted)
        _delete_count(db, FormSchedule, "form_schedules", deleted)
        _delete_count(db, FormTemplateVersion, "form_template_versions", deleted)
        _delete_count(db, FormTemplate, "form_templates", deleted)
        _delete_count(db, RuntimeTemplate, "runtime_templates", deleted)
        _delete_count(db, BuilderDocument, "builder_documents", deleted)
        _delete_count(db, ActivityEvent, "activity_events", deleted)
        _delete_count(db, AnnouncementRead, "announcement_reads", deleted)
        _delete_count(db, Announcement, "announcements", deleted)
        _delete_count(db, NotificationDelivery, "notification_deliveries", deleted)
        _delete_count(db, NotificationEvent, "notification_events", deleted)
        _delete_count(db, PushSubscription, "push_subscriptions", deleted)
        _delete_count(db, DevicePushToken, "device_push_tokens", deleted)
        _delete_count(db, WebhookDelivery, "webhook_deliveries", deleted)
        _delete_count(db, WorkflowApprovalHistory, "workflow_approval_history", deleted)
        _delete_count(db, WorkflowTask, "workflow_tasks", deleted)
        _delete_count(db, WorkflowVariable, "workflow_variables", deleted)
        _delete_count(db, WorkflowInstanceStep, "workflow_instance_steps", deleted)
        _delete_count(db, WorkflowInstance, "workflow_instances", deleted)
        _delete_count(db, ApiKey, "api_keys", deleted)

        db.commit()

        return {
            "settings_reset": True,
            "deleted": deleted,
        }
    except Exception:
        db.rollback()
        raise
