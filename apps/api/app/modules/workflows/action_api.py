from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.identity.dependencies import require_permission
from app.modules.identity.models import User
from app.modules.workflows.schemas import (
    WorkflowActionRequest,
    WorkflowApprovalHistoryRead,
    WorkflowInstanceRead,
)
from app.modules.workflows.service import WorkflowActionService

router = APIRouter(prefix="/workflows/instances", tags=["Workflows"])


@router.get(
    "/{instance_id}/history",
    response_model=list[WorkflowApprovalHistoryRead],
    dependencies=[Depends(require_permission("workflow.read"))],
)
def list_workflow_history(instance_id: UUID, db: Session = Depends(get_db)):
    return WorkflowActionService(db).list_history(instance_id)


@router.post(
    "/{instance_id}/approve",
    response_model=WorkflowInstanceRead,
)
def approve_workflow_instance(
    instance_id: UUID,
    payload: WorkflowActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("workflow.approve")),
):
    return WorkflowActionService(db).approve(
        instance_id,
        actor_user_id=current_user.id,
        payload=payload,
    )


@router.post(
    "/{instance_id}/reject",
    response_model=WorkflowInstanceRead,
)
def reject_workflow_instance(
    instance_id: UUID,
    payload: WorkflowActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("workflow.approve")),
):
    return WorkflowActionService(db).reject(
        instance_id,
        actor_user_id=current_user.id,
        payload=payload,
    )


@router.post(
    "/{instance_id}/return",
    response_model=WorkflowInstanceRead,
)
def return_workflow_instance(
    instance_id: UUID,
    payload: WorkflowActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("workflow.approve")),
):
    return WorkflowActionService(db).return_instance(
        instance_id,
        actor_user_id=current_user.id,
        payload=payload,
    )


@router.post(
    "/{instance_id}/cancel",
    response_model=WorkflowInstanceRead,
)
def cancel_workflow_instance(
    instance_id: UUID,
    payload: WorkflowActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("workflow.edit")),
):
    return WorkflowActionService(db).cancel(
        instance_id,
        actor_user_id=current_user.id,
        payload=payload,
    )
