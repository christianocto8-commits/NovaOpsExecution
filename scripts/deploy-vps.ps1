$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$WebDir = Join-Path $Root "apps\web"
$ApiDir = Join-Path $Root "apps\api"
. (Join-Path $PSScriptRoot "Deploy-VpsFrontendArchive.ps1")
$VpsHost = if ($env:NOVAOPS_VPS_HOST) { $env:NOVAOPS_VPS_HOST } else { "root@103.247.10.145" }
$RemoteRoot = "/opt/NovaOpsExecution"

Write-Host ""
Write-Host "NovaOps VPS Deploy" -ForegroundColor Cyan
Write-Host "==================" -ForegroundColor Cyan
Write-Host "Target: $VpsHost" -ForegroundColor Gray
Write-Host ""

function Test-SshAccess {
  ssh -o BatchMode=yes -o ConnectTimeout=10 $VpsHost "echo ok" 2>$null
  return $LASTEXITCODE -eq 0
}

if (-not (Test-SshAccess)) {
  Write-Host "[BLOCKED] SSH ke VPS gagal (butuh SSH key atau password)." -ForegroundColor Red
  Write-Host ""
  Write-Host "Opsi A - Setup SSH key (sekali):" -ForegroundColor Yellow
  Write-Host "  ssh-keygen -t ed25519"
  Write-Host "  type $env:USERPROFILE\.ssh\id_ed25519.pub"
  Write-Host "  # paste public key ke VPS: ~/.ssh/authorized_keys"
  Write-Host ""
  Write-Host "Opsi B - Jalankan di konsol VPS (Rumahweb terminal):" -ForegroundColor Yellow
  Write-Host "  cd $RemoteRoot; bash scripts/vps-update.sh"
  Write-Host ""
  exit 1
}

Write-Host "[1/4] Build frontend..." -ForegroundColor Cyan
Push-Location $WebDir
$env:NEXT_PUBLIC_USE_RELATIVE_API = "true"
npm run build
if ($LASTEXITCODE -ne 0) { exit 1 }

Copy-Item -Recurse -Force public .next\standalone\public
Copy-Item -Recurse -Force .next\static .next\standalone\.next\static
Pop-Location

Write-Host "[2/4] API update di VPS..." -ForegroundColor Cyan
$hasGit = ssh $VpsHost "test -d $RemoteRoot/.git && echo yes || echo no"
if ($hasGit -match "yes") {
  ssh $VpsHost @"
set -e
cd $RemoteRoot
git fetch origin main
git reset --hard origin/main
cd apps/api
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
systemctl restart novaops-api
"@
} else {
  Write-Host "  (no git repo on VPS - uploading API via SCP)" -ForegroundColor Gray
  scp -r "$ApiDir\app" "$ApiDir\alembic" "$ApiDir\requirements.txt" "$ApiDir\alembic.ini" "${VpsHost}:${RemoteRoot}/apps/api/"
  ssh $VpsHost @"
set -e
cd $RemoteRoot/apps/api
if [ ! -d .venv ]; then python3 -m venv .venv; fi
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
systemctl restart novaops-api
"@
}

Write-Host "[3/4] Upload frontend standalone (tar.gz)..." -ForegroundColor Cyan
Deploy-VpsFrontendArchive -WebDir $WebDir -VpsHost $VpsHost -RemoteRoot $RemoteRoot

Write-Host "[4/4] Health check..." -ForegroundColor Cyan
ssh $VpsHost "systemctl restart nginx 2>/dev/null || true; curl -sf http://127.0.0.1/api/v1/health"

Write-Host ""
Write-Host "[DONE] Deploy selesai -> http://103.247.10.145" -ForegroundColor Green
