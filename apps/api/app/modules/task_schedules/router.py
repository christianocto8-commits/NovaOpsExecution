from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.scheduler import verify_scheduler_secret
from app.modules.identity.audit import record_identity_audit_event
from app.modules.task_schedules.schemas import (
    TaskScheduleCreate,
    TaskScheduleExceptionCreate,
    TaskScheduleExceptionResponse,
    TaskScheduleProcessResult,
    TaskScheduleResponse,
    TaskScheduleUpcomingResponse,
    TaskScheduleUpdate,
)
from app.modules.task_schedules.service import TaskScheduleService
from app.modules.tasks.identity_bridge import get_identity_user_by_email, sync_identity_access

router = APIRouter(prefix="/task-schedules", tags=["Task Schedules"])


def _get_actor_id(current_user) -> int:
    return current_user.id


def _has_full_access(db: Session, current_user) -> bool:
    identity_user = get_identity_user_by_email(db, current_user.email)
    if not identity_user:
        return False
    _legacy_user, _outlet_ids, full_access = sync_identity_access(db, identity_user)
    db.commit()
    return full_access


def _require_owner_admin(db: Session, current_user) -> None:
    if not _has_full_access(db, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owner/admin can manage task schedules",
        )


@router.get("", response_model=list[TaskScheduleResponse])
def list_task_schedules(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    service = TaskScheduleService(db)
    return service.list_schedules()


@router.post("", response_model=TaskScheduleResponse, status_code=status.HTTP_201_CREATED)
def create_task_schedule(
    payload: TaskScheduleCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _require_owner_admin(db, current_user)
    service = TaskScheduleService(db)
    schedule = service.create_schedule(payload, actor_id=_get_actor_id(current_user))
    record_identity_audit_event(
        db,
        action="schedule.created",
        resource_type="task_schedule",
        actor_user_id=current_user.id,
        resource_id=str(schedule.id),
        metadata={"title": schedule.title, "recurrence": schedule.recurrence},
    )
    db.commit()
    return schedule


@router.get("/upcoming", response_model=list[TaskScheduleUpcomingResponse])
def list_upcoming_task_schedules(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    identity_user = get_identity_user_by_email(db, current_user.email)
    if identity_user:
        _legacy_user, outlet_ids, full_access = sync_identity_access(db, identity_user)
        db.commit()
    else:
        outlet_ids = []
        full_access = False

    service = TaskScheduleService(db)
    return service.list_upcoming(outlet_ids=outlet_ids, all_outlets=full_access)


@router.get("/exceptions", response_model=list[TaskScheduleExceptionResponse])
def list_task_schedule_exceptions(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    del current_user
    service = TaskScheduleService(db)
    return service.list_exceptions()


@router.post("/exceptions", response_model=TaskScheduleExceptionResponse, status_code=status.HTTP_201_CREATED)
def create_task_schedule_exception(
    payload: TaskScheduleExceptionCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _require_owner_admin(db, current_user)
    service = TaskScheduleService(db)
    return service.create_exception(payload, actor_id=_get_actor_id(current_user))


@router.delete("/exceptions/{exception_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task_schedule_exception(
    exception_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _require_owner_admin(db, current_user)
    service = TaskScheduleService(db)
    service.delete_exception(exception_id)
    return None


@router.post("/run-now", response_model=TaskScheduleProcessResult)
def run_task_schedules_now(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _require_owner_admin(db, current_user)
    service = TaskScheduleService(db)
    result = service.process_due_schedules(force=False)
    return TaskScheduleProcessResult(**result)


@router.get("/{schedule_id}", response_model=TaskScheduleResponse)
def get_task_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    service = TaskScheduleService(db)
    return service.get_schedule(schedule_id)


@router.patch("/{schedule_id}", response_model=TaskScheduleResponse)
def update_task_schedule(
    schedule_id: int,
    payload: TaskScheduleUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _require_owner_admin(db, current_user)
    service = TaskScheduleService(db)
    schedule = service.update_schedule(schedule_id, payload)
    record_identity_audit_event(
        db,
        action="schedule.updated",
        resource_type="task_schedule",
        actor_user_id=current_user.id,
        resource_id=str(schedule_id),
        metadata={"title": schedule.title},
    )
    db.commit()
    return schedule


@router.delete("/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _require_owner_admin(db, current_user)
    service = TaskScheduleService(db)
    schedule = service.get_schedule(schedule_id)
    title = schedule.title
    service.delete_schedule(schedule_id)
    record_identity_audit_event(
        db,
        action="schedule.deleted",
        resource_type="task_schedule",
        actor_user_id=current_user.id,
        resource_id=str(schedule_id),
        metadata={"title": title},
    )
    db.commit()
    return None


@router.post("/process", response_model=TaskScheduleProcessResult)
def process_task_schedules(
    force: bool = False,
    db: Session = Depends(get_db),
    x_scheduler_secret: str | None = Header(default=None, alias="X-Scheduler-Secret"),
):
    verify_scheduler_secret(x_scheduler_secret)
    service = TaskScheduleService(db)
    result = service.process_due_schedules(force=force)
    return TaskScheduleProcessResult(**result)
