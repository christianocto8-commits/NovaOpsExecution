$key = "$env:USERPROFILE\.ssh\id_ed25519"
ssh -i $key -o StrictHostKeyChecking=no root@103.247.10.145 "cd /opt/NovaOpsExecution/apps/api && source .venv/bin/activate && python -c 'from app.core.database import SessionLocal; from app.services.deduplicate_tasks import deduplicate_existing_schedule_tasks; print(deduplicate_existing_schedule_tasks(SessionLocal()))'"
