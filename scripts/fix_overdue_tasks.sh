#!/usr/bin/env bash
cd /opt/NovaOpsExecution/apps/api
source .venv/bin/activate
python3 -c "
from app.core.database import SessionLocal
from app.models.task import Task
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

tz = ZoneInfo('Asia/Jakarta')
db = SessionLocal()
now_local = datetime.now(tz)

# Cancel evening tasks that are already overdue (due_date has passed and still open)
overdue_tasks = db.query(Task).filter(
    Task.schedule_id.isnot(None),
    Task.status.in_(['open', 'in_progress']),
    Task.due_date < datetime.now(timezone.utc),
).all()

cancelled = 0
for t in overdue_tasks:
    local_due = t.due_date.astimezone(tz) if t.due_date else None
    local_created = t.created_at.astimezone(tz)
    # If created AFTER due date, it was a late publish → cancel
    if local_created > t.due_date:
        print(f'CANCEL late-published overdue task id={t.id} title={t.title!r} created={local_created.strftime(\"%H:%M %d/%m\")} due={local_due.strftime(\"%H:%M %d/%m\") if local_due else \"?\"} ')
        t.status = 'cancelled'
        cancelled += 1

db.commit()
print(f'Total cancelled: {cancelled}')

# Restart API to pick up the new publisher.py
import subprocess
subprocess.run(['systemctl', 'restart', 'novaops-api'], check=True)
print('API restarted successfully with new publisher fix.')

# Show remaining active tasks
from datetime import timedelta
cutoff = datetime.now(timezone.utc) - timedelta(hours=48)
remaining = db.query(Task).filter(
    Task.schedule_id.isnot(None),
    Task.created_at >= cutoff,
    Task.status.in_(['open', 'in_progress']),
).order_by(Task.created_at.desc()).all()

print(f'\\nRemaining active scheduled tasks ({len(remaining)}):')
for t in remaining:
    local_created = t.created_at.astimezone(tz)
    local_due = t.due_date.astimezone(tz) if t.due_date else None
    print(f'  id={t.id} title={t.title!r} status={t.status} created={local_created.strftime(\"%H:%M %d/%m\")} due={local_due.strftime(\"%H:%M %d/%m\") if local_due else \"?\"} ')

db.close()
"
