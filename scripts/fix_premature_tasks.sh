#!/usr/bin/env bash
cd /opt/NovaOpsExecution/apps/api
source .venv/bin/activate
python3 -c "
from app.core.database import SessionLocal
from app.models.task import Task
from app.models.task_schedule import TaskSchedule
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo

tz = ZoneInfo('Asia/Jakarta')
db = SessionLocal()

# Find tasks created from schedules in the last 24h
cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
tasks = db.query(Task).filter(
    Task.schedule_id.isnot(None),
    Task.created_at >= cutoff,
    Task.status.in_(['open', 'in_progress']),
).all()

cancelled = 0
for t in tasks:
    schedule = db.query(TaskSchedule).filter(TaskSchedule.id == t.schedule_id).first()
    if not schedule:
        continue

    created_local = t.created_at.astimezone(tz)
    
    # Parse publish_time
    try:
        pub_h, pub_m = [int(p) for p in (schedule.publish_time or '09:00').split(':')]
    except (TypeError, ValueError):
        pub_h, pub_m = 9, 0

    publish_dt = created_local.replace(hour=pub_h, minute=pub_m, second=0, microsecond=0)
    window_end = publish_dt + timedelta(hours=14)
    
    # If task was created OUTSIDE the publish window, it's a premature publish → cancel
    if not (publish_dt <= created_local < window_end):
        print(f'CANCEL task id={t.id} title={t.title!r} created={created_local} publish_time={schedule.publish_time} (outside window)')
        t.status = 'cancelled'
        cancelled += 1

# Also cancel duplicate midnight tasks (keep only the latest per schedule+outlet+date)
midnight_schedules = db.query(TaskSchedule).filter(TaskSchedule.publish_time == '00:01', TaskSchedule.is_active == True).all()
for sched in midnight_schedules:
    sched_tasks = db.query(Task).filter(
        Task.schedule_id == sched.id,
        Task.created_at >= cutoff,
        Task.status.in_(['open', 'in_progress']),
    ).order_by(Task.created_at.desc()).all()
    
    # Group by local date
    seen_dates = {}
    for t in sched_tasks:
        local_date = t.created_at.astimezone(tz).date()
        key = (sched.id, t.outlet_id, local_date)
        if key not in seen_dates:
            seen_dates[key] = t  # keep latest
        else:
            # duplicate → cancel older
            if t.status in ('open', 'in_progress'):
                print(f'CANCEL duplicate midnight task id={t.id} title={t.title!r} date={local_date}')
                t.status = 'cancelled'
                cancelled += 1

db.commit()
print(f'Total cancelled: {cancelled}')

# Show remaining active tasks
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
