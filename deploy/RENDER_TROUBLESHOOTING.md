# Render Troubleshooting (NovaOps)

## Symptom: `novaops-api` stuck on **Deploying**

Common cause: `alembic upgrade head` hangs or fails while connecting to Neon, so the new container never passes the health check.

### Fix in Render dashboard

1. Open **novaops-api** service.
2. Click **Cancel deploy** on the stuck deployment.
3. Open **Logs** and look for:
   - `Migration failed or timed out`
   - `connection refused` / `timeout` to Neon
   - `relation "task_schedules" already exists`
4. Verify **Environment**:
   - `DATABASE_URL` = Neon pooled connection string
   - `JWT_SECRET_KEY` = strong secret
   - `CORS_ORIGINS` = your Vercel URL (no trailing slash), example:
     `https://novaops-web.vercel.app`
   - `TASK_SCHEDULER_SECRET` = random secret string
5. Click **Manual Deploy** → **Deploy latest commit**.

After the latest repo changes, migrations also run in `preDeployCommand` with a 90s timeout so deploy should fail fast instead of hanging ~1 hour.

### Quick API check

```text
GET https://novaops-api.onrender.com/
```

Expected:

```json
{"service":"NovaOps Enterprise API","version":"0.7.0","status":"running"}
```

---

## Symptom: `novaops-task-scheduler` **Failed run**

The cron job calls:

```text
POST https://novaops-api.onrender.com/api/v1/task-schedules/process
Header: X-Scheduler-Secret: <same as API>
```

### Required env on cron service

| Variable | Example |
|----------|---------|
| `NOVAOPS_API_URL` | `https://novaops-api.onrender.com` |
| `TASK_SCHEDULER_SECRET` | same value as on `novaops-api` |

Important:

- No trailing slash on `NOVAOPS_API_URL`
- Secret must match exactly on **both** web service and cron job
- If API is sleeping, first cron run may fail; retry after API is awake

### Manual test (replace secret)

```bash
curl -fsS -X POST "https://novaops-api.onrender.com/api/v1/task-schedules/process" \
  -H "X-Scheduler-Secret: YOUR_SECRET"
```

Expected: JSON with processed schedule counts, HTTP 200.

HTTP 401 `Invalid scheduler secret` = secret mismatch.

---

## Symptom: Frontend shows backend connection error

1. Confirm Vercel env `NEXT_PUBLIC_API_URL=https://novaops-api.onrender.com`
2. Confirm Render `CORS_ORIGINS` includes your exact Vercel domain
3. Wake API by opening `https://novaops-api.onrender.com/` and wait 15–30 seconds
4. Retry the action (delete task, login, etc.)

---

## If migration says table already exists

Connect to Neon and check `alembic_version`, or in Render shell run:

```bash
alembic current
alembic upgrade head
```

If schema is already applied but version is behind, stamp then upgrade:

```bash
alembic stamp head
```

Only do this if you are sure the schema matches production.
