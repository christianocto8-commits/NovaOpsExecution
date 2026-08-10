from collections.abc import Callable
from datetime import datetime, timezone
from time import perf_counter

from sqlalchemy.orm import Session

from app.models.scheduler_job_run import SchedulerJobRun
from app.modules.announcements.service import AnnouncementService
from app.modules.assets.api import process_registered_battery_alerts
from app.modules.task_schedules.service import TaskScheduleService
from app.modules.tasks.daily_reminders import (
    process_critical_task_sla_escalations,
    process_daily_task_reminders,
)
from app.modules.tasks.due_soon_alerts import process_due_soon_task_alerts
from app.modules.tasks.overdue_alerts import process_overdue_task_alerts
from app.services.ai_compliance import process_ai_compliance_guard
from app.services.digest_email import send_compliance_digest
from app.services.scheduled_reports import process_scheduled_reports


class SchedulerJobService:
    def __init__(self, db: Session):
        self.db = db

    def process_all(self, *, force_digest: bool = False) -> dict[str, dict]:
        return {
            "task_schedules": self._run_and_record(
                "task_schedules",
                lambda: TaskScheduleService(self.db).process_due_schedules(),
            ),
            "schedule_orphan_cleanup": self._run_and_record(
                "schedule_orphan_cleanup",
                lambda: TaskScheduleService(self.db).cancel_orphan_schedule_tasks(),
            ),
            "overdue_alerts": self._run_and_record(
                "overdue_alerts",
                lambda: process_overdue_task_alerts(self.db),
            ),
            "due_soon_alerts": self._run_and_record(
                "due_soon_alerts",
                lambda: process_due_soon_task_alerts(self.db),
            ),
            "daily_reminders": self._run_and_record(
                "daily_reminders",
                lambda: process_daily_task_reminders(self.db),
            ),
            "task_sla_escalations": self._run_and_record(
                "task_sla_escalations",
                lambda: process_critical_task_sla_escalations(self.db),
            ),
            "sensor_battery_alerts": self._run_and_record(
                "sensor_battery_alerts",
                lambda: process_registered_battery_alerts(self.db),
            ),
            "scheduled_announcements": self._run_and_record(
                "scheduled_announcements",
                lambda: {
                    "published": AnnouncementService(self.db).publish_due(),
                },
            ),
            "compliance_digest": self._run_and_record(
                "compliance_digest",
                lambda: send_compliance_digest(self.db, force=force_digest),
            ),
            "ai_compliance_guard": self._run_and_record(
                "ai_compliance_guard",
                lambda: process_ai_compliance_guard(self.db),
            ),
            "scheduled_reports": self._run_and_record(
                "scheduled_reports",
                lambda: process_scheduled_reports(self.db),
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
