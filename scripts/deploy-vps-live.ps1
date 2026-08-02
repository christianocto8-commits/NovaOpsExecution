$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$WebDir = Join-Path $Root "apps\web"
$ApiDir = Join-Path $Root "apps\api"
. (Join-Path $PSScriptRoot "Deploy-VpsFrontendArchive.ps1")
. (Join-Path $PSScriptRoot "Deploy-VpsCodePayload.ps1")
$VpsHost = if ($env:NOVAOPS_VPS_HOST) { $env:NOVAOPS_VPS_HOST } else { "root@103.247.10.145" }
$RemoteRoot = "/opt/NovaOpsExecution"

function Resolve-SshKeyPath {
  if ($env:NOVAOPS_VPS_SSH_KEY) {
    return @{
      Path = $env:NOVAOPS_VPS_SSH_KEY
      Checked = @($env:NOVAOPS_VPS_SSH_KEY)
    }
  }

  $checked = New-Object System.Collections.Generic.List[string]
  $candidates = New-Object System.Collections.Generic.List[string]

  if ($env:USERPROFILE) {
    $candidates.Add((Join-Path $env:USERPROFILE ".ssh\novaops_vps_ed25519"))
    $candidates.Add((Join-Path $env:USERPROFILE ".ssh\id_ed25519"))
  }

  if ($env:HOME) {
    $candidates.Add((Join-Path $env:HOME ".ssh/novaops_vps_ed25519"))
    $candidates.Add((Join-Path $env:HOME ".ssh/id_ed25519"))
  }

  foreach ($candidate in $candidates) {
    if ([string]::IsNullOrWhiteSpace($candidate)) { continue }
    $checked.Add($candidate)
    if (Test-Path -LiteralPath $candidate) {
      return @{
        Path = $candidate
        Checked = $checked
      }
    }
  }

  return @{
    Path = $null
    Checked = $checked
  }
}

$sshKeyResolution = Resolve-SshKeyPath
$SshKey = $sshKeyResolution.Path
$SshArgs = @("-i", $SshKey, "-o", "IdentitiesOnly=yes")

function ConvertTo-BashSingleQuotedValue {
  param([string]$Value)
  if ($null -eq $Value) { return "''" }
  $escaped = $Value.Replace("'", "'""'""'")
  return "'$escaped'"
}

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

if (-not (Test-Path -LiteralPath $SshKey)) {
  Write-Host "[BLOCKED] SSH private key tidak ditemukan." -ForegroundColor Red
  foreach ($checkedPath in $sshKeyResolution.Checked) {
    Write-Host "  checked: $checkedPath" -ForegroundColor DarkGray
  }
  Write-Host "  hint: set NOVAOPS_VPS_SSH_KEY ke path private key yang valid." -ForegroundColor Yellow
  exit 1
}

ssh @SshArgs -o BatchMode=yes -o ConnectTimeout=10 $VpsHost "echo ok" 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "[BLOCKED] SSH ke VPS gagal." -ForegroundColor Red
  exit 1
}

Write-Host "[1/6] Build frontend (relative API + VAPID)..." -ForegroundColor Cyan
Push-Location $WebDir
$env:NEXT_PUBLIC_USE_RELATIVE_API = "true"
if ($vapidPublic) { $env:NEXT_PUBLIC_VAPID_PUBLIC_KEY = $vapidPublic }
npm run build
if ($LASTEXITCODE -ne 0) { exit 1 }
Copy-Item -Recurse -Force public .next\standalone\public
Copy-Item -Recurse -Force .next\static .next\standalone\.next\static
Pop-Location

Write-Host "[2/6] Upload backend + infra payload..." -ForegroundColor Cyan
Deploy-VpsCodePayload -Root $Root -ApiDir $ApiDir -VpsHost $VpsHost -RemoteRoot $RemoteRoot -SshKey $SshKey

Write-Host "[3/6] Upload frontend standalone (tar.gz)..." -ForegroundColor Cyan
Deploy-VpsFrontendArchive -WebDir $WebDir -VpsHost $VpsHost -RemoteRoot $RemoteRoot -SshKey $SshKey

Write-Host "[4/6] Activate live integrations on VPS..." -ForegroundColor Cyan
$remoteEnvPairs = @()
if ($vapidPublic) {
  $remoteEnvPairs += "VAPID_PUBLIC_KEY=$(ConvertTo-BashSingleQuotedValue $vapidPublic)"
  $remoteEnvPairs += "VAPID_PRIVATE_KEY=$(ConvertTo-BashSingleQuotedValue $vapidPrivate)"
  $remoteEnvPairs += "VAPID_SUBJECT=$(ConvertTo-BashSingleQuotedValue $vapidSubject)"
}
$remoteEnv = if ($remoteEnvPairs.Count -gt 0) { ($remoteEnvPairs -join " ") + " " } else { "" }
ssh @SshArgs $VpsHost "chmod +x ${RemoteRoot}/scripts/vps-activate-live.sh; ${remoteEnv}bash ${RemoteRoot}/scripts/vps-activate-live.sh"
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "[5/6] Production sync (nginx, scheduler, backup, hardening)..." -ForegroundColor Cyan
ssh @SshArgs $VpsHost "chmod +x ${RemoteRoot}/scripts/vps-sync-production.sh ${RemoteRoot}/scripts/vps-harden-production.sh ${RemoteRoot}/scripts/backup-novaops-vps.sh ${RemoteRoot}/deploy/scripts/novaops-scheduler-run.sh; bash ${RemoteRoot}/scripts/vps-sync-production.sh"
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "[6/6] Public health check..." -ForegroundColor Cyan
$health = $null
for ($attempt = 1; $attempt -le 12; $attempt++) {
  $health = ssh @SshArgs $VpsHost "curl -sS -m 10 http://127.0.0.1:8000/api/v1/ready 2>/dev/null"
  if ($LASTEXITCODE -eq 0 -and $health -match '"status"\s*:\s*"ready"') {
    break
  }
  Write-Host "  API belum siap (attempt $attempt/12), retry 5 detik..." -ForegroundColor Yellow
  Start-Sleep -Seconds 5
}

if ($LASTEXITCODE -ne 0 -or -not ($health -match '"status"\s*:\s*"ready"')) {
  Write-Host "[FAILED] API tidak sehat setelah 60 detik. Response: $health" -ForegroundColor Red
  exit 1
}
Write-Host "  $health" -ForegroundColor Gray

$publicHealth = Invoke-WebRequest -Uri "https://nova-ops.cloud/api/v1/health" -UseBasicParsing -TimeoutSec 20
if ($publicHealth.StatusCode -ne 200 -or $publicHealth.Content -notmatch '"status"\s*:\s*"ok"') {
  Write-Host "[FAILED] Public health check gagal: $($publicHealth.StatusCode) $($publicHealth.Content)" -ForegroundColor Red
  exit 1
}
Write-Host "  Public health: $($publicHealth.StatusCode)" -ForegroundColor Gray

$browserSessionProbe = Invoke-WebRequest `
  -Uri "https://nova-ops.cloud/api/v1/auth/browser-session" `
  -Method Delete `
  -UseBasicParsing `
  -TimeoutSec 20
if ($browserSessionProbe.StatusCode -ne 200) {
  Write-Host "[FAILED] Browser session BFF tidak aktif: $($browserSessionProbe.StatusCode)" -ForegroundColor Red
  exit 1
}
Write-Host "  Browser session BFF: $($browserSessionProbe.StatusCode)" -ForegroundColor Gray

$reloginProbeStatus = $null
try {
  Invoke-WebRequest `
    -Uri "https://nova-ops.cloud/api/v1/auth/login" `
    -Method Post `
    -Headers @{
      Origin = "https://nova-ops.cloud"
      Cookie = "novaops_access=stale-session-probe"
    } `
    -ContentType "application/json" `
    -Body "{}" `
    -UseBasicParsing `
    -TimeoutSec 20 | Out-Null
} catch {
  $reloginProbeStatus = $_.Exception.Response.StatusCode.value__
}
if ($reloginProbeStatus -ne 422) {
  Write-Host "[FAILED] Relogin dengan stale cookie gagal melewati BFF: $reloginProbeStatus" -ForegroundColor Red
  exit 1
}
Write-Host "  Relogin stale-cookie guard: 422 (expected validation response)" -ForegroundColor Gray
Write-Host ""
Write-Host "  Deploy source branch: main" -ForegroundColor Gray
Write-Host "[DONE] https://nova-ops.cloud" -ForegroundColor Green
