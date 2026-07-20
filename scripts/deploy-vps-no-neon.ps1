$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$WebDir = Join-Path $Root "apps\web"
$ApiDir = Join-Path $Root "apps\api"
$VpsHost = if ($env:NOVAOPS_VPS_HOST) { $env:NOVAOPS_VPS_HOST } else { "root@103.247.10.145" }
$RemoteRoot = "/opt/NovaOpsExecution"
$DbPass = if ($env:NOVAOPS_DB_PASSWORD) { $env:NOVAOPS_DB_PASSWORD } else { "novaops_vps_db_2026" }

Write-Host ""
Write-Host "NovaOps VPS All-in-One (no Neon)" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

function Test-SshAccess {
  ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10 $VpsHost "echo ok" 2>$null
  return $LASTEXITCODE -eq 0
}

if (-not (Test-SshAccess)) {
  Write-Host "[BLOCKED] SSH gagal. Tambahkan SSH key di konsol VPS dulu." -ForegroundColor Red
  Write-Host ""
  Write-Host "Paste di konsol Rumahweb/VNC:" -ForegroundColor Yellow
  Write-Host "  mkdir -p ~/.ssh && chmod 700 ~/.ssh"
  Write-Host "  echo 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAulJrtKdKU1vZOt5D5fQ/yd4pZfOHd26rdjL2Jly4lr asus@LAPTOP-S7HOKDT4' >> ~/.ssh/authorized_keys"
  Write-Host "  chmod 600 ~/.ssh/authorized_keys"
  exit 1
}

Write-Host "[1/5] Build frontend..." -ForegroundColor Cyan
Push-Location $WebDir
$env:NEXT_PUBLIC_USE_RELATIVE_API = "true"
npm run build
if ($LASTEXITCODE -ne 0) { exit 1 }
Copy-Item -Recurse -Force public .next\standalone\public
Copy-Item -Recurse -Force .next\static .next\standalone\.next\static
Pop-Location

Write-Host "[2/5] Upload code..." -ForegroundColor Cyan
ssh $VpsHost "mkdir -p ${RemoteRoot}/apps/api ${RemoteRoot}/apps/web/.next ${RemoteRoot}/deploy/systemd ${RemoteRoot}/deploy/nginx ${RemoteRoot}/scripts"
scp -r "$ApiDir\app" "$ApiDir\alembic" "$ApiDir\requirements.txt" "$ApiDir\alembic.ini" "${VpsHost}:${RemoteRoot}/apps/api/"
scp "$Root\deploy\systemd\novaops-api.service" "$Root\deploy\systemd\novaops-web.service" "${VpsHost}:${RemoteRoot}/deploy/systemd/"
scp "$Root\deploy\nginx\novaops-vps.conf" "${VpsHost}:${RemoteRoot}/deploy/nginx/"
scp "$Root\scripts\vps-all-in-one-no-neon.sh" "${VpsHost}:${RemoteRoot}/scripts/"
scp -r "$WebDir\.next\standalone" "${VpsHost}:${RemoteRoot}/apps/web/.next/"

Write-Host "[3/5] Write API .env (local Postgres)..." -ForegroundColor Cyan
$jwt = "hTGbOkiLQY4ld6Vd/qroW38iseC2gzLPs/lIfd0PdrwnkYcCm2GM3YzTMJZLUolu"
$envContent = @"
DATABASE_URL=postgresql://novaops_user:${DbPass}@127.0.0.1:5432/novaops_db
JWT_SECRET_KEY=$jwt
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://103.247.10.145
ENVIRONMENT=production
BOOTSTRAP_ADMIN_ENABLED=true
BOOTSTRAP_ADMIN_EMAIL=admin@novaops.com
BOOTSTRAP_ADMIN_USERNAME=admin
BOOTSTRAP_ADMIN_PASSWORD=admin123
TASK_SCHEDULER_SECRET=1234Abcd
"@
$envFile = Join-Path $env:TEMP "novaops-vps.env"
Set-Content -Path $envFile -Value $envContent -NoNewline
scp $envFile "${VpsHost}:${RemoteRoot}/apps/api/.env"

Write-Host "[4/5] Run all-in-one setup on VPS..." -ForegroundColor Cyan
ssh $VpsHost "chmod +x ${RemoteRoot}/scripts/vps-all-in-one-no-neon.sh; NOVAOPS_DB_PASSWORD='${DbPass}' bash ${RemoteRoot}/scripts/vps-all-in-one-no-neon.sh"

Write-Host ""
Write-Host "[DONE] http://103.247.10.145" -ForegroundColor Green
Write-Host "Login: admin@novaops.com / admin123" -ForegroundColor Gray
Write-Host "DB: local PostgreSQL (no Neon)" -ForegroundColor Gray
