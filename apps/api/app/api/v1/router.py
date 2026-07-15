from fastapi import APIRouter

from app.api.v1.health import router as health_router
from app.modules.identity.api import router as auth_router
from app.modules.identity.authorization_api import router as authorization_router
from app.modules.identity.management_api import router as identity_router
from app.modules.notifications.api import router as notification_router
from app.modules.task_drafts.draft_router import router as task_draft_router
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
from app.routers.execution_sessions import router as execution_session_router
from app.routers.form_templates import router as form_template_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(identity_router)
api_router.include_router(authorization_router)

api_router.include_router(task_router)
api_router.include_router(task_draft_router)
api_router.include_router(form_template_router)
api_router.include_router(execution_session_router)

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