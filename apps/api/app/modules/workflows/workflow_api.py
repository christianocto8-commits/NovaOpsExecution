from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.identity.dependencies import require_permission
from app.modules.identity.models import User
from app.modules.workflows.schemas import (
    MessageResponse,
    WorkflowDefinitionCreate,
    WorkflowDefinitionRead,
    WorkflowDefinitionUpdate,
)
from app.modules.workflows.service import WorkflowDefinitionService

router = APIRouter(prefix="/workflows", tags=["Workflows"])


@router.get(
    "",
    response_model=list[WorkflowDefinitionRead],
    dependencies=[Depends(require_permission("workflow.read"))],
)
def list_workflows(db: Session = Depends(get_db)):
    return WorkflowDefinitionService(db).list_workflows()


@router.post(
    "",
    response_model=WorkflowDefinitionRead,
    status_code=status.HTTP_201_CREATED,
)
def create_workflow(
    payload: WorkflowDefinitionCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("workflow.create")),
):
    return WorkflowDefinitionService(db).create_workflow(payload)


@router.get(
    "/{workflow_id}",
    response_model=WorkflowDefinitionRead,
    dependencies=[Depends(require_permission("workflow.read"))],
)
def get_workflow(workflow_id: UUID, db: Session = Depends(get_db)):
    return WorkflowDefinitionService(db).get_workflow(workflow_id)


@router.put(
    "/{workflow_id}",
    response_model=WorkflowDefinitionRead,
)
def update_workflow(
    workflow_id: UUID,
    payload: WorkflowDefinitionUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("workflow.edit")),
):
    return WorkflowDefinitionService(db).update_workflow(workflow_id, payload)


@router.delete(
    "/{workflow_id}",
    response_model=MessageResponse,
)
def delete_workflow(
    workflow_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("workflow.delete")),
):
    WorkflowDefinitionService(db).delete_workflow(workflow_id)
    return {"message": "Workflow definition deleted"}
