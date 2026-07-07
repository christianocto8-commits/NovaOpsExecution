from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.identity.dependencies import require_permission
from app.modules.identity.models import User
from app.modules.workflows.schemas import (
    MessageResponse,
    WorkflowApprovalMatrixCreate,
    WorkflowApprovalMatrixRead,
    WorkflowApprovalMatrixUpdate,
)
from app.modules.workflows.service import WorkflowApprovalMatrixService

router = APIRouter(prefix="/workflows/approval-matrix", tags=["Workflows"])


@router.get(
    "/{workflow_id}",
    response_model=list[WorkflowApprovalMatrixRead],
    dependencies=[Depends(require_permission("workflow.read"))],
)
def list_approval_matrix(workflow_id: UUID, db: Session = Depends(get_db)):
    return WorkflowApprovalMatrixService(db).list_by_workflow(workflow_id)


@router.post(
    "",
    response_model=WorkflowApprovalMatrixRead,
    status_code=status.HTTP_201_CREATED,
)
def create_approval_matrix(
    payload: WorkflowApprovalMatrixCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("workflow.edit")),
):
    return WorkflowApprovalMatrixService(db).create_matrix(payload)


@router.put(
    "/{matrix_id}",
    response_model=WorkflowApprovalMatrixRead,
)
def update_approval_matrix(
    matrix_id: UUID,
    payload: WorkflowApprovalMatrixUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("workflow.edit")),
):
    return WorkflowApprovalMatrixService(db).update_matrix(matrix_id, payload)


@router.delete(
    "/{matrix_id}",
    response_model=MessageResponse,
)
def delete_approval_matrix(
    matrix_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("workflow.edit")),
):
    WorkflowApprovalMatrixService(db).delete_matrix(matrix_id)
    return {"message": "Approval matrix deleted"}
