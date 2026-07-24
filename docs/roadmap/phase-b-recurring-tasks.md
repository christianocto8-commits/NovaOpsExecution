# Phase B — Recurring Task Scheduler

## What was added

- `task_schedules` table for daily/weekly recurring definitions
- Auto-publish engine that creates outlet tasks from schedules
- API:
  - `GET/POST/PATCH/DELETE /api/v1/task-schedules`
  - `POST /api/v1/jobs/process` for production scheduler runs
  - `POST /api/v1/task-schedules/process` for manual schedule diagnostics
- Frontend task form now saves **Daily/Weekly** schedules to backend
- Auto-publish on create when `autoPublish=true`

## Database migration

Run on the VPS scheduler (or locally):

```bash
cd apps/api
alembic upgrade head
```

Revision: `20260717_0001`

## VPS Cron Job

Create a scheduled job on the VPS:

- **Schedule:** `*/15 * * * *` (every 15 minutes)
- **Command:**

```bash
curl -X POST "$RENDER_API_URL/api/v1/jobs/process" \
  -H "X-Scheduler-Secret: $TASK_SCHEDULER_SECRET"
```

Set environment variable on API service and cron job:

```env
TASK_SCHEDULER_SECRET=your-strong-secret
```

If `TASK_SCHEDULER_SECRET` is empty, the process endpoint accepts unauthenticated calls (development only).

## Behavior

| Recurrence | Publish rule |
|------------|--------------|
| Daily | Creates one task per outlet per selected shift after `due_time` |
| Weekly | Creates one task per outlet on `weekly_publish_day` after `due_time` |

Duplicate protection:

- Daily: one task per schedule/outlet/shift per day
- Weekly: one task per schedule/outlet per week

## Manual test

```bash
curl -X POST http://localhost:8000/api/v1/jobs/process \
  -H "X-Scheduler-Secret: change-this-scheduler-secret"
```
