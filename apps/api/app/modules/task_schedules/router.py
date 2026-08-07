from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

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
from app.modules.tasks.identity_bridge import (
    get_accessible_identity_outlets,
    get_identity_user_by_email,
    sync_identity_access,
)

router = APIRouter(prefix="/task-schedules", tags=["Task Schedules"])


def _get_actor_id(current_user) -> int:
    return current_user.id


def _get_identity_actor_id(db: Session, current_user) -> UUID | None:
    identity_user = get_identity_user_by_email(db, current_user.email)
    return identity_user.id if identity_user else None


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


def _scoped_schedules(db: Session, current_user, service: TaskScheduleService) -> list:
    identity_user = get_identity_user_by_email(db, current_user.email)
    if not identity_user:
        return []

    accessible_outlets, full_access = get_accessible_identity_outlets(db, identity_user)
    if full_access:
        return service.list_schedules()

    accessible_codes = {
        (outlet.code or "").strip().upper()
        for outlet in accessible_outlets
    }
    return [
        schedule
        for schedule in service.list_schedules()
        if not schedule.outlet_ids_json
        or any(
            _outlet_code_matches(db, outlet_ref) in accessible_codes
            for outlet_ref in schedule.outlet_ids_json
        )
    ]


def _outlet_code_matches(db: Session, outlet_ref: str) -> str:
    from app.modules.tasks.identity_bridge import get_identity_outlet

    try:
        identity_outlet = get_identity_outlet(db, UUID(outlet_ref))
    except (TypeError, ValueError):
        return ""
    return (identity_outlet.code or "").strip().upper() if identity_outlet else ""


def _legacy_outlet_id_for(db: Session, outlet_code: str) -> int | None:
    from app.models.outlet import Outlet as LegacyOutlet
    from app.modules.identity.models import Outlet as IdentityOutlet

    identity_outlet = (
        db.query(IdentityOutlet)
        .filter(IdentityOutlet.code == (outlet_code or "").strip().upper())
        .first()
    )
    if not identity_outlet:
        return None
    legacy_outlet = (
        db.query(LegacyOutlet)
        .filter(LegacyOutlet.code == identity_outlet.code.strip().upper())
        .first()
    )
    return legacy_outlet.id if legacy_outlet else None


@router.get("", response_model=list[TaskScheduleResponse])
def list_task_schedules(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    service = TaskScheduleService(db)
    return _scoped_schedules(db, current_user, service)


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
        actor_user_id=_get_identity_actor_id(db, current_user),
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
    service = TaskScheduleService(db)
    exceptions = service.list_exceptions()

    identity_user = get_identity_user_by_email(db, current_user.email)
    if not identity_user:
        return []
    accessible_outlets, full_access = get_accessible_identity_outlets(db, identity_user)
    if not full_access:
        accessible_legacy_ids = {
            _legacy_outlet_id_for(db, outlet.code) for outlet in accessible_outlets
        }
        accessible_legacy_ids.discard(None)
        exceptions = [
            exception
            for exception in exceptions
            if exception.outlet_id is None or exception.outlet_id in accessible_legacy_ids
        ]

    return exceptions


@router.post("/exceptions", response_model=TaskScheduleExceptionResponse, status_code=status.HTTP_201_CREATED)
def create_task_schedule_exception(
    payload: TaskScheduleExceptionCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _require_owner_admin(db, current_user)
    service = TaskScheduleService(db)
    exception = service.create_exception(payload, actor_id=_get_actor_id(current_user))
    record_identity_audit_event(
        db,
        action="schedule_exception.created",
        resource_type="task_schedule_exception",
        actor_user_id=_get_identity_actor_id(db, current_user),
        resource_id=str(exception.id),
        metadata={"outlet_id": exception.outlet_id, "date": exception.date.isoformat() if exception.date else None},
    )
    db.commit()
    return exception


@router.delete("/exceptions/{exception_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task_schedule_exception(
    exception_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _require_owner_admin(db, current_user)
    service = TaskScheduleService(db)
    exception = service.get_exception(exception_id)
    outlet_id = exception.outlet_id if exception else None
    date = exception.date.isoformat() if exception and exception.date else None
    service.delete_exception(exception_id)
    record_identity_audit_event(
        db,
        action="schedule_exception.deleted",
        resource_type="task_schedule_exception",
        actor_user_id=_get_identity_actor_id(db, current_user),
        resource_id=str(exception_id),
        metadata={"outlet_id": outlet_id, "date": date},
    )
    db.commit()
    return None


@router.post("/run-now", response_model=TaskScheduleProcessResult)
def run_task_schedules_now(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _require_owner_admin(db, current_user)
    service = TaskScheduleService(db)
    result = service.process_due_schedules(force=False)
    record_identity_audit_event(
        db,
        action="schedule.run_now",
        resource_type="task_schedule",
        actor_user_id=_get_identity_actor_id(db, current_user),
        metadata={"published": result.get("schedules_published", 0), "created": result.get("tasks_created", 0)},
    )
    db.commit()
    return TaskScheduleProcessResult(**result)


@router.get("/{schedule_id}", response_model=TaskScheduleResponse)
def get_task_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    service = TaskScheduleService(db)
    schedule = service.get_schedule(schedule_id)

    identity_user = get_identity_user_by_email(db, current_user.email)
    if not identity_user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User has no access to this schedule",
        )
    accessible_outlets, full_access = get_accessible_identity_outlets(db, identity_user)
    if not full_access:
        accessible_codes = {
            (outlet.code or "").strip().upper() for outlet in accessible_outlets
        }
        allowed = not schedule.outlet_ids_json or any(
            _outlet_code_matches(db, outlet_ref) in accessible_codes
            for outlet_ref in schedule.outlet_ids_json
        )
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User has no access to this schedule",
            )

    return schedule


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
        actor_user_id=_get_identity_actor_id(db, current_user),
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
        actor_user_id=_get_identity_actor_id(db, current_user),
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
    record_identity_audit_event(
        db,
        action="schedule.processed",
        resource_type="task_schedule",
        actor_user_id=None,
        metadata={
            "force": force,
            "published": result.get("schedules_published", 0),
            "created": result.get("tasks_created", 0),
        },
    )
    db.commit()
    return TaskScheduleProcessResult(**result)
