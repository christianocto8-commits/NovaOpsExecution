#!/usr/bin/env bash
cd /opt/NovaOpsExecution/apps/api
source .venv/bin/activate
python3 -c "
from app.core.database import SessionLocal
from app.models.task_schedule import TaskSchedule
from app.models.task import Task
from datetime import datetime, timezone
db = SessionLocal()
schedules = db.query(TaskSchedule).filter(TaskSchedule.is_active == True).all()
for s in schedules:
    print(f'SCHEDULE id={s.id} title={s.title!r} recurrence={s.recurrence} publish_time={s.publish_time!r} due_time={s.due_time!r} last_pub={s.last_published_at} auto={s.auto_publish} outlets={s.outlet_ids_json}')
print()
print('--- Recent tasks from schedules (last 24h) ---')
from datetime import timedelta
cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
tasks = db.query(Task).filter(Task.schedule_id.isnot(None), Task.created_at >= cutoff).order_by(Task.created_at.desc()).limit(50).all()
for t in tasks:
    print(f'TASK id={t.id} sched={t.schedule_id} title={t.title!r} status={t.status} outlet={t.outlet_id} due={t.due_date} created={t.created_at}')
db.close()
"
