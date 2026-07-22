$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$WebDir = Join-Path $Root "apps\web"
$ApiDir = Join-Path $Root "apps\api"
$VpsHost = if ($env:NOVAOPS_VPS_HOST) { $env:NOVAOPS_VPS_HOST } else { "root@103.247.10.145" }
$RemoteRoot = "/opt/NovaOpsExecution"

function Read-EnvValue($file, $key) {
  if (-not (Test-Path $file)) { return $null }
  foreach ($line in Get-Content $file) {
    if ($line -match "^\s*$key=(.*)$") { return $Matches[1].Trim() }
  }
  return $null
}

$apiEnv = Join-Path $ApiDir ".env"
$webEnv = Join-Path $WebDir ".env.local"
$vapidPublic = Read-EnvValue $apiEnv "VAPID_PUBLIC_KEY"
$vapidPrivate = Read-EnvValue $apiEnv "VAPID_PRIVATE_KEY"
$vapidSubject = Read-EnvValue $apiEnv "VAPID_SUBJECT"
if (-not $vapidPublic) { $vapidPublic = Read-EnvValue $webEnv "NEXT_PUBLIC_VAPID_PUBLIC_KEY" }

Write-Host ""
Write-Host "NovaOps VPS Deploy + Live Activation" -ForegroundColor Cyan
Write-Host "Target: $VpsHost" -ForegroundColor Gray
Write-Host ""

ssh -o BatchMode=yes -o ConnectTimeout=10 $VpsHost "echo ok" 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "[BLOCKED] SSH ke VPS gagal." -ForegroundColor Red
  exit 1
}

Write-Host "[1/5] Build frontend (relative API + VAPID)..." -ForegroundColor Cyan
Push-Location $WebDir
$env:NEXT_PUBLIC_USE_RELATIVE_API = "true"
if ($vapidPublic) { $env:NEXT_PUBLIC_VAPID_PUBLIC_KEY = $vapidPublic }
npm run build
if ($LASTEXITCODE -ne 0) { exit 1 }
Copy-Item -Recurse -Force public .next\standalone\public
Copy-Item -Recurse -Force .next\static .next\standalone\.next\static
Pop-Location

Write-Host "[2/5] Upload API..." -ForegroundColor Cyan
scp -r "$ApiDir\app" "$ApiDir\alembic" "$ApiDir\requirements.txt" "$ApiDir\alembic.ini" "${VpsHost}:${RemoteRoot}/apps/api/"
scp "$Root\scripts\vps-activate-live.sh" "${VpsHost}:${RemoteRoot}/scripts/vps-activate-live.sh"

Write-Host "[3/5] Upload frontend standalone..." -ForegroundColor Cyan
ssh $VpsHost "mkdir -p ${RemoteRoot}/apps/web/.next"
scp -r "$WebDir\.next\standalone" "${VpsHost}:${RemoteRoot}/apps/web/.next/"

Write-Host "[4/5] Activate live integrations on VPS..." -ForegroundColor Cyan
$remoteEnv = ""
if ($vapidPublic) {
  $remoteEnv += "VAPID_PUBLIC_KEY='$vapidPublic' "
  $remoteEnv += "VAPID_PRIVATE_KEY='$vapidPrivate' "
  $remoteEnv += "VAPID_SUBJECT='$vapidSubject' "
}
ssh $VpsHost "chmod +x ${RemoteRoot}/scripts/vps-activate-live.sh; $remoteEnv bash ${RemoteRoot}/scripts/vps-activate-live.sh"

Write-Host "[5/5] Public health check..." -ForegroundColor Cyan
ssh $VpsHost "curl -sf https://nova-ops.cloud/api/v1/health || curl -sf http://127.0.0.1/api/v1/health"
Write-Host ""
Write-Host "[DONE] https://nova-ops.cloud" -ForegroundColor Green
