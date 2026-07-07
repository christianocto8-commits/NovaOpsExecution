from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.identity.dependencies import require_permission
from app.modules.identity.models import User
from app.modules.workflows.schemas import (
    WorkflowInstanceCreate,
    WorkflowInstanceRead,
    WorkflowInstanceStepRead,
)
from app.modules.workflows.service import WorkflowInstanceService

router = APIRouter(prefix="/workflows/instances", tags=["Workflows"])


@router.get(
    "",
    response_model=list[WorkflowInstanceRead],
    dependencies=[Depends(require_permission("workflow.read"))],
)
def list_workflow_instances(db: Session = Depends(get_db)):
    return WorkflowInstanceService(db).list_instances()


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
    return WorkflowInstanceService(db).create_instance(
        payload,
        submitted_by_id=current_user.id,
    )


@router.get(
    "/{instance_id}",
    response_model=WorkflowInstanceRead,
    dependencies=[Depends(require_permission("workflow.read"))],
)
def get_workflow_instance(instance_id: UUID, db: Session = Depends(get_db)):
    return WorkflowInstanceService(db).get_instance(instance_id)


@router.get(
    "/{instance_id}/steps",
    response_model=list[WorkflowInstanceStepRead],
    dependencies=[Depends(require_permission("workflow.read"))],
)
def list_workflow_instance_steps(instance_id: UUID, db: Session = Depends(get_db)):
    return WorkflowInstanceService(db).list_instance_steps(instance_id)
