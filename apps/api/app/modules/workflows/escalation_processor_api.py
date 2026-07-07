from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.identity.dependencies import require_permission
from app.modules.identity.models import User
from app.modules.workflows.service import WorkflowEscalationProcessorService

router = APIRouter(prefix="/workflows/escalations", tags=["Workflows"])


@router.post(
    "/process",
    dependencies=[Depends(require_permission("workflow.edit"))],
)
def process_escalations(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("workflow.edit")),
):
    return WorkflowEscalationProcessorService(db).run_once()


@router.post(
    "/assign-due-dates",
    dependencies=[Depends(require_permission("workflow.edit"))],
)
def assign_escalation_due_dates(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("workflow.edit")),
):
    assigned = WorkflowEscalationProcessorService(db).assign_due_dates_for_active_steps()
    return {"due_dates_assigned": assigned}
