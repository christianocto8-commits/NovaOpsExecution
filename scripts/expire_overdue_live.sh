#!/usr/bin/env bash
cd /opt/NovaOpsExecution/apps/api
source .venv/bin/activate
python3 -c "
from app.core.database import SessionLocal
from app.models.task import Task
from app.models.task_comment import TaskComment
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo

tz = ZoneInfo('Asia/Jakarta')
db = SessionLocal()
now = datetime.now(timezone.utc)

# Find all open/in_progress tasks that are 60+ min past due
overdue_tasks = db.query(Task).filter(
    Task.due_date.isnot(None),
    Task.due_date + timedelta(minutes=60) <= now,
    Task.status.in_(['open', 'in_progress']),
).all()

expired = 0
for t in overdue_tasks:
    local_due = t.due_date.astimezone(tz) if t.due_date else None
    local_created = t.created_at.astimezone(tz) if t.created_at else None
    mins_overdue = int((now - t.due_date).total_seconds() // 60)
    print(f'EXPIRE task id={t.id} title={t.title!r} due={local_due.strftime(\"%H:%M %d/%m\") if local_due else \"?\"} overdue={mins_overdue}min')
    
    previous_status = t.status
    t.status = 'expired'
    t.expired_at = now
    db.add(TaskComment(
        task_id=t.id,
        user_id=t.created_by,
        comment=f'Task auto-expired {mins_overdue} minutes after overdue.',
        event_type='overdue_expired',
        previous_value=previous_status,
        new_value='expired',
    ))
    expired += 1

db.commit()
print(f'Total expired: {expired}')
db.close()
"

# Restart API
systemctl restart novaops-api
echo "API restarted with overdue auto-expiration fix."
