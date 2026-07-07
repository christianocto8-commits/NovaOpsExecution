from fastapi import APIRouter

from app.api.v1.health import router as health_router
from app.modules.identity.api import router as auth_router
from app.modules.identity.authorization_api import router as authorization_router
from app.modules.identity.management_api import router as identity_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(identity_router)
api_router.include_router(authorization_router)

from app.modules.workflows.workflow_api import router as workflow_router
api_router.include_router(workflow_router)

from app.modules.workflows.approval_api import router as workflow_approval_router
api_router.include_router(workflow_approval_router)

from app.modules.workflows.instance_api import router as workflow_instance_router
api_router.include_router(workflow_instance_router)

from app.modules.workflows.action_api import router as workflow_action_router
api_router.include_router(workflow_action_router)

from app.modules.workflows.escalation_api import router as workflow_escalation_router
api_router.include_router(workflow_escalation_router)

from app.modules.workflows.escalation_processor_api import router as workflow_escalation_processor_router
api_router.include_router(workflow_escalation_processor_router)

from app.modules.notifications.api import router as notification_router
api_router.include_router(notification_router)

