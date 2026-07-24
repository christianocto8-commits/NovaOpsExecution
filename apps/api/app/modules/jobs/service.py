from sqlalchemy.orm import Session

from app.modules.task_schedules.service import TaskScheduleService
from app.modules.tasks.due_soon_alerts import process_due_soon_task_alerts
from app.modules.tasks.overdue_alerts import process_overdue_task_alerts
from app.services.digest_email import send_compliance_digest


class SchedulerJobService:
    def __init__(self, db: Session):
        self.db = db

    def process_all(self, *, force_digest: bool = False) -> dict[str, dict]:
        return {
            "task_schedules": TaskScheduleService(self.db).process_due_schedules(),
            "overdue_alerts": process_overdue_task_alerts(self.db),
            "due_soon_alerts": process_due_soon_task_alerts(self.db),
            "compliance_digest": send_compliance_digest(self.db, force=force_digest),
        }
