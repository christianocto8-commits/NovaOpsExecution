from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.identity.dependencies import get_current_user, require_permission
from app.modules.identity.models import User
from app.modules.workflows.schemas import (
    WorkflowInstanceCreate,
    WorkflowInstanceRead,
    WorkflowInstanceStepRead,
)
from app.modules.workflows.service import WorkflowInstanceService

router = APIRouter(prefix="/workflows/instances", tags=["Workflows"])


def _serialize_instance(instance, service: WorkflowInstanceService) -> WorkflowInstanceRead:
    payload = WorkflowInstanceRead.model_validate(instance)
    payload.has_escalation = service.instance_has_escalation(instance.id)
    return payload


@router.get(
    "/pending-for-me",
    response_model=list[WorkflowInstanceRead],
)
def list_pending_workflow_instances_for_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("workflow.read")),
):
    service = WorkflowInstanceService(db)
    instances = service.list_pending_for_me(current_user)
    return [_serialize_instance(instance, service) for instance in instances]


@router.get(
    "",
    response_model=list[WorkflowInstanceRead],
    dependencies=[Depends(require_permission("workflow.read"))],
)
def list_workflow_instances(db: Session = Depends(get_db)):
    service = WorkflowInstanceService(db)
    instances = service.list_instances()
    return [_serialize_instance(instance, service) for instance in instances]


@router.post(
    "",
    response_model=WorkflowInstanceRead,
    status_code=status.HTTP_201_CREATED,
)
def create_workflow_instance(
    payload: WorkflowInstanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("workflow.create")),
):
    service = WorkflowInstanceService(db)
    instance = service.create_instance(
        payload,
        submitted_by_id=current_user.id,
    )
    return _serialize_instance(instance, service)


@router.get(
    "/{instance_id}",
    response_model=WorkflowInstanceRead,
    dependencies=[Depends(require_permission("workflow.read"))],
)
def get_workflow_instance(instance_id: UUID, db: Session = Depends(get_db)):
    service = WorkflowInstanceService(db)
    instance = service.get_instance(instance_id)
    return _serialize_instance(instance, service)


@router.get(
    "/{instance_id}/steps",
    response_model=list[WorkflowInstanceStepRead],
    dependencies=[Depends(require_permission("workflow.read"))],
)
def list_workflow_instance_steps(instance_id: UUID, db: Session = Depends(get_db)):
    return WorkflowInstanceService(db).list_instance_steps(instance_id)
