from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.identity.dependencies import require_permission
from app.modules.identity.models import User
from app.modules.workflows.schemas import (
    MessageResponse,
    WorkflowEscalationRuleCreate,
    WorkflowEscalationRuleRead,
    WorkflowEscalationRuleUpdate,
)
from app.modules.workflows.service import WorkflowEscalationRuleService

router = APIRouter(prefix="/workflows/escalation-rules", tags=["Workflows"])


@router.get(
    "/{workflow_id}",
    response_model=list[WorkflowEscalationRuleRead],
    dependencies=[Depends(require_permission("workflow.read"))],
)
def list_escalation_rules(workflow_id: UUID, db: Session = Depends(get_db)):
    return WorkflowEscalationRuleService(db).list_by_workflow(workflow_id)


@router.post(
    "",
    response_model=WorkflowEscalationRuleRead,
    status_code=status.HTTP_201_CREATED,
)
def create_escalation_rule(
    payload: WorkflowEscalationRuleCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("workflow.edit")),
):
    return WorkflowEscalationRuleService(db).create_rule(payload)


@router.put(
    "/{rule_id}",
    response_model=WorkflowEscalationRuleRead,
)
def update_escalation_rule(
    rule_id: UUID,
    payload: WorkflowEscalationRuleUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("workflow.edit")),
):
    return WorkflowEscalationRuleService(db).update_rule(rule_id, payload)


@router.delete(
    "/{rule_id}",
    response_model=MessageResponse,
)
def delete_escalation_rule(
    rule_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("workflow.edit")),
):
    WorkflowEscalationRuleService(db).delete_rule(rule_id)
    return {"message": "Workflow escalation rule deleted"}
