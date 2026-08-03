from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.form_field import FormField
from app.models.form_template import FormTemplate
from app.models.outlet import Outlet
from app.models.task import Task
from app.modules.tasks.schemas import TaskDetailResponse, TaskResponse


def resolve_task_form_template_id(task: Task) -> int | None:
    if (
        task.source_type in {"form_template", "field_audit"}
        and task.source_id
        and int(task.source_id) > 0
    ):
        return int(task.source_id)
    if task.schedule and task.schedule.form_template_id:
        return int(task.schedule.form_template_id)
    return None


def resolve_outlet_name(
    db: Session,
    outlet_id: int | None,
    *,
    outlet_name_by_id: dict[int, str] | None = None,
) -> str | None:
    if outlet_id is None:
        return None
    if outlet_name_by_id is not None:
        return outlet_name_by_id.get(outlet_id)
    outlet = db.get(Outlet, outlet_id)
    return outlet.name if outlet else None


def build_task_response(
    db: Session,
    task: Task,
    *,
    outlet_name_by_id: dict[int, str] | None = None,
) -> TaskResponse:
    template_id = resolve_task_form_template_id(task)
    template_name: str | None = None
    checklist_preview: list[str] = []
    checklist_field_count = 0

    if template_id:
        template = db.query(FormTemplate).filter(FormTemplate.id == template_id).first()
        if template:
            template_name = template.title

        fields = (
            db.query(FormField)
            .filter(FormField.form_template_id == template_id)
            .order_by(FormField.sort_order.asc())
            .all()
        )
        checklist_field_count = len(fields)
        checklist_preview = [field.label for field in fields[:8] if field.label.strip()]

    payload = TaskResponse.model_validate(task).model_dump()
    payload.update(
        {
            "outlet_name": resolve_outlet_name(
                db, task.outlet_id, outlet_name_by_id=outlet_name_by_id
            ),
            "form_template_id": template_id,
            "form_template_name": template_name,
            "checklist_field_count": checklist_field_count,
            "checklist_preview": checklist_preview,
        }
    )
    return TaskResponse(**payload)


def build_task_responses(db: Session, tasks: list[Task]) -> list[TaskResponse]:
    outlet_ids = {task.outlet_id for task in tasks if task.outlet_id is not None}
    outlet_name_by_id: dict[int, str] = {}
    if outlet_ids:
        outlet_name_by_id = {
            outlet.id: outlet.name
            for outlet in db.query(Outlet).filter(Outlet.id.in_(outlet_ids)).all()
        }

    return [
        build_task_response(db, task, outlet_name_by_id=outlet_name_by_id) for task in tasks
    ]


def build_task_detail_response(db: Session, task: Task) -> TaskDetailResponse:
    base = build_task_response(db, task).model_dump()
    base["comments"] = task.comments or []
    base["assignments"] = task.assignments or []
    return TaskDetailResponse(**base)
