from collections.abc import Callable
from datetime import datetime, timezone
from time import perf_counter

from sqlalchemy.orm import Session

from app.models.scheduler_job_run import SchedulerJobRun
from app.modules.task_schedules.service import TaskScheduleService
from app.modules.tasks.due_soon_alerts import process_due_soon_task_alerts
from app.modules.tasks.overdue_alerts import process_overdue_task_alerts
from app.services.digest_email import send_compliance_digest


class SchedulerJobService:
    def __init__(self, db: Session):
        self.db = db

    def process_all(self, *, force_digest: bool = False) -> dict[str, dict]:
        return {
            "task_schedules": self._run_and_record(
                "task_schedules",
                lambda: TaskScheduleService(self.db).process_due_schedules(),
            ),
            "overdue_alerts": self._run_and_record(
                "overdue_alerts",
                lambda: process_overdue_task_alerts(self.db),
            ),
            "due_soon_alerts": self._run_and_record(
                "due_soon_alerts",
                lambda: process_due_soon_task_alerts(self.db),
            ),
            "compliance_digest": self._run_and_record(
                "compliance_digest",
                lambda: send_compliance_digest(self.db, force=force_digest),
            ),
        }

    def list_runs(self, *, limit: int = 50) -> list[SchedulerJobRun]:
        bounded_limit = min(max(limit, 1), 200)
        return (
            self.db.query(SchedulerJobRun)
            .order_by(SchedulerJobRun.started_at.desc(), SchedulerJobRun.id.desc())
            .limit(bounded_limit)
            .all()
        )

    def _run_and_record(self, job_name: str, callback: Callable[[], dict]) -> dict:
        started_at = datetime.now(timezone.utc)
        started = perf_counter()
        run = SchedulerJobRun(
            job_name=job_name,
            status="running",
            duration_ms=0,
            started_at=started_at,
        )
        self.db.add(run)
        self.db.flush()

        try:
            result = callback()
            run.status = "success"
            run.result_json = result
            return result
        except Exception as exc:
            self.db.rollback()
            run = SchedulerJobRun(
                job_name=job_name,
                status="failed",
                duration_ms=int((perf_counter() - started) * 1000),
                error_message=str(exc),
                started_at=started_at,
                finished_at=datetime.now(timezone.utc),
            )
            self.db.add(run)
            self.db.commit()
            raise
        finally:
            if run.status != "failed":
                run.duration_ms = int((perf_counter() - started) * 1000)
                run.finished_at = datetime.now(timezone.utc)
                self.db.commit()
