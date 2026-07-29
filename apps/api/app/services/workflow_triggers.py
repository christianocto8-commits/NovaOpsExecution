from __future__ import annotations

import logging
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.task import Task
from app.modules.workflows.repository import WorkflowDefinitionRepository
from app.modules.workflows.schemas import WorkflowInstanceCreate
from app.modules.workflows.service import WorkflowInstanceService
from app.services.workspace_settings import get_workspace_settings

logger = logging.getLogger(__name__)


def _start_workflow(
    db: Session,
    *,
    workflow_code: str,
    module: str,
    entity_type: str,
    entity_id: str,
    context_json: dict,
    submitted_by_id: UUID | None = None,
) -> None:
    if not workflow_code.strip():
        return

    workflow = WorkflowDefinitionRepository(db).find_by_code(workflow_code.strip().lower())
    if not workflow or not workflow.is_active:
        logger.info("Workflow code %s not found or inactive; skipping auto trigger", workflow_code)
        return

    if not workflow.steps:
        logger.info("Workflow %s has no steps; skipping auto trigger", workflow_code)
        return

    WorkflowInstanceService(db).create_instance(
        WorkflowInstanceCreate(
            workflow_id=workflow.id,
            module=module,
            entity_type=entity_type,
            entity_id=entity_id,
            context_json=context_json,
        ),
        submitted_by_id=submitted_by_id,
    )


def maybe_trigger_checklist_fail_workflow(
    db: Session,
    *,
    task: Task,
    checklist: dict,
    submitted_by_identity_id: UUID | None = None,
) -> None:
    if checklist.get("status") == "pass":
        return

    settings = get_workspace_settings(db)
    if not settings.auto_workflow_on_checklist_fail:
        return

    failed_items = checklist.get("failed_items", [])
    if not isinstance(failed_items, list):
        logger.warning("Invalid failed_items format for task %s, resetting to empty list", task.id)
        failed_items = []

    raw_score = checklist.get("score", 100)
    try:
        score = max(0.0, min(100.0, float(raw_score)))
    except (TypeError, ValueError):
        logger.warning("Invalid checklist score for task %s: %r", task.id, raw_score)
        score = 0.0

    critical_failures = checklist.get("critical_failures", [])
    if not isinstance(critical_failures, list):
        critical_failures = []

    logger.info(
        "Triggering checklist fail workflow for task %s (score: %s, items: %d)",
        task.id,
        score,
        len(failed_items)
    )

    priority = "critical" if critical_failures else "high" if score < 50 else "medium"
    sla_hours = 4 if priority == "critical" else 24 if priority == "high" else 48

    _start_workflow(
        db,
        workflow_code=settings.checklist_fail_workflow_code,
        module="tasks",
        entity_type="task",
        entity_id=str(task.id),
        context_json={
            "task_id": task.id,
            "task_title": task.title,
            "outlet_id": task.outlet_id,
            "checklist_status": checklist.get("status"),
            "checklist_score": score,
            "failed_items": failed_items,
            "critical_failures": critical_failures,
            "trigger": "checklist_fail",
            "priority": priority,
            "sla_hours": sla_hours,
        },
        submitted_by_id=submitted_by_identity_id,
    )


def maybe_trigger_task_completed_workflow(
    db: Session,
    *,
    task: Task,
    completed_by_identity_id: UUID | None = None,
) -> None:
    settings = get_workspace_settings(db)
    if not settings.auto_workflow_on_task_completed:
        return

    _start_workflow(
        db,
        workflow_code=settings.task_completed_workflow_code,
        module="tasks",
        entity_type="task",
        entity_id=str(task.id),
        context_json={
            "task_id": task.id,
            "task_title": task.title,
            "outlet_id": task.outlet_id,
            "status": task.status,
            "trigger": "task_completed",
        },
        submitted_by_id=completed_by_identity_id,
    )
