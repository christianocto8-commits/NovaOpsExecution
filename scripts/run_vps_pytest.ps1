$key = "$env:USERPROFILE\.ssh\id_ed25519"
ssh -i $key -o StrictHostKeyChecking=no root@103.247.10.145 "cd /opt/NovaOpsExecution/apps/api && source .venv/bin/activate && pytest tests/ -q"
