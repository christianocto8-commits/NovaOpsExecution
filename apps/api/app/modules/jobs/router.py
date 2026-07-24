from fastapi import APIRouter, Depends, Header, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.scheduler import verify_scheduler_secret
from app.modules.jobs.schemas import SchedulerJobResult
from app.modules.jobs.service import SchedulerJobService

router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.post("/process", response_model=SchedulerJobResult)
def process_scheduler_jobs(
    force_digest: bool = Query(default=False),
    x_scheduler_secret: str | None = Header(default=None, alias="X-Scheduler-Secret"),
    db: Session = Depends(get_db),
):
    verify_scheduler_secret(x_scheduler_secret)
    return SchedulerJobResult(**SchedulerJobService(db).process_all(force_digest=force_digest))
