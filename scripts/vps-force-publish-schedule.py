#!/usr/bin/env python3
"""Force-publish a task schedule on VPS. Usage: python3 vps-force-publish-schedule.py [schedule_id]"""
import sys

from app.core.database import SessionLocal
from app.modules.task_schedules.publisher import TaskSchedulePublisher


def main() -> None:
    schedule_id = int(sys.argv[1]) if len(sys.argv) > 1 else None
    db = SessionLocal()
    try:
        result = TaskSchedulePublisher(db).process_due_schedules(
            schedule_id=schedule_id,
            force=True,
        )
        print(result)
    finally:
        db.close()


if __name__ == "__main__":
    main()
