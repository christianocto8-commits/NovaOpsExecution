import os

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.modules.task_schedules.schemas import (
    TaskScheduleCreate,
    TaskScheduleProcessResult,
    TaskScheduleResponse,
    TaskScheduleUpdate,
)
from app.modules.task_schedules.service import TaskScheduleService

router = APIRouter(prefix="/task-schedules", tags=["Task Schedules"])


def _get_actor_id(current_user) -> int:
    return current_user.id


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
    service = TaskScheduleService(db)
    return service.create_schedule(payload, actor_id=_get_actor_id(current_user))


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
    service = TaskScheduleService(db)
    return service.update_schedule(schedule_id, payload)


@router.delete("/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    service = TaskScheduleService(db)
    service.delete_schedule(schedule_id)
    return None


@router.post("/process", response_model=TaskScheduleProcessResult)
def process_task_schedules(
    force: bool = False,
    db: Session = Depends(get_db),
    x_scheduler_secret: str | None = Header(default=None, alias="X-Scheduler-Secret"),
):
    configured_secret = os.environ.get("TASK_SCHEDULER_SECRET")
    if configured_secret and x_scheduler_secret != configured_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid scheduler secret",
        )

    service = TaskScheduleService(db)
    result = service.process_due_schedules(force=force)
    return TaskScheduleProcessResult(**result)
