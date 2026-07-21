from fastapi import APIRouter

from app.api.v1.health import router as health_router
from app.modules.identity.api import router as auth_router
from app.modules.identity.authorization_api import router as authorization_router
from app.modules.identity.management_api import router as identity_router
from app.modules.identity.bulk_import_api import router as bulk_import_router
from app.modules.notifications.api import router as notification_router
from app.modules.task_drafts.draft_router import router as task_draft_router
from app.modules.task_schedules.router import router as task_schedule_router
from app.modules.tasks.router import router as task_router
from app.modules.workflow_notifications.api import router as workflow_notifications_router
from app.modules.workflows.action_api import router as workflow_action_router
from app.modules.workflows.approval_api import router as workflow_approval_router
from app.modules.workflows.escalation_api import router as workflow_escalation_router
from app.modules.workflows.escalation_processor_api import (
    router as workflow_escalation_processor_router,
)
from app.modules.workflows.instance_api import router as workflow_instance_router
from app.modules.workflows.workflow_api import router as workflow_router
from app.modules.api_keys.api import router as api_keys_router
from app.modules.announcements.api import router as announcement_router
from app.modules.webhooks.api import router as webhooks_router
from app.routers.activity import router as activity_router
from app.routers.audit import router as audit_router
from app.routers.builder_documents import router as builder_document_router
from app.routers.evidence_uploads import router as evidence_upload_router
from app.routers.execution_sessions import router as execution_session_router
from app.routers.form_submissions import router as form_submission_router
from app.routers.form_templates import router as form_template_router
from app.routers.reports import router as reports_router
from app.routers.runtime_templates import router as runtime_template_router
from app.routers.settings import router as settings_router
from app.routers.outlets import router as outlets_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(identity_router)
api_router.include_router(bulk_import_router)
api_router.include_router(authorization_router)

api_router.include_router(task_router)
api_router.include_router(task_schedule_router)
api_router.include_router(task_draft_router)
api_router.include_router(form_template_router)
api_router.include_router(form_submission_router)
api_router.include_router(execution_session_router)
api_router.include_router(settings_router)
api_router.include_router(outlets_router)
api_router.include_router(evidence_upload_router)
api_router.include_router(reports_router)
api_router.include_router(audit_router)
api_router.include_router(activity_router)
api_router.include_router(announcement_router)
api_router.include_router(api_keys_router)
api_router.include_router(webhooks_router)
api_router.include_router(runtime_template_router)
api_router.include_router(builder_document_router)

# Static and specialized workflow routes must be registered before
# the generic /workflows/{workflow_id} routes.
api_router.include_router(workflow_instance_router)
api_router.include_router(workflow_action_router)
api_router.include_router(workflow_approval_router)
api_router.include_router(workflow_escalation_router)
api_router.include_router(workflow_escalation_processor_router)

# Generic workflow definition routes must remain last in the
# /workflows route group to avoid capturing paths such as "instances".
api_router.include_router(workflow_router)

api_router.include_router(notification_router)
api_router.include_router(workflow_notifications_router)
