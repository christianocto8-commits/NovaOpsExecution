param(
  [string]$BaseUrl = $(if ($env:NOVAOPS_UAT_URL) { $env:NOVAOPS_UAT_URL } else { "http://localhost:8000" }),
  [string]$Email = $env:NOVAOPS_UAT_EMAIL,
  [string]$Password = $env:NOVAOPS_UAT_PASSWORD
)

$ErrorActionPreference = "Stop"
$api = $BaseUrl.TrimEnd("/")
$passed = 0

function Assert-Response {
  param([string]$Name, [scriptblock]$Request)
  try {
    $result = & $Request
    Write-Host "[PASS] $Name" -ForegroundColor Green
    $script:passed += 1
    return $result
  } catch {
    Write-Host "[FAIL] $Name - $($_.Exception.Message)" -ForegroundColor Red
    throw
  }
}

Write-Host "NovaOps enterprise UAT gates: $api" -ForegroundColor Cyan

$health = Assert-Response "API liveness" {
  Invoke-RestMethod -Uri "$api/api/v1/health" -Method Get -TimeoutSec 20
}
if ($health.status -ne "ok") { throw "Unexpected health status: $($health.status)" }

$ready = Assert-Response "Database readiness" {
  Invoke-RestMethod -Uri "$api/api/v1/ready" -Method Get -TimeoutSec 20
}
if ($ready.status -ne "ready" -or $ready.database -ne "ok") {
  throw "Readiness dependency check failed"
}

if (-not $Email -or -not $Password) {
  Write-Host "[SKIP] Authenticated gates require NOVAOPS_UAT_EMAIL and NOVAOPS_UAT_PASSWORD." -ForegroundColor Yellow
  Write-Host "$passed public gates passed." -ForegroundColor Green
  exit 0
}

$login = Assert-Response "Admin login" {
  Invoke-RestMethod `
    -Uri "$api/api/v1/auth/login" `
    -Method Post `
    -ContentType "application/json" `
    -Body (@{ identifier = $Email; password = $Password } | ConvertTo-Json) `
    -TimeoutSec 20
}
if (-not $login.access_token) { throw "Login did not return an access token" }
$headers = @{ Authorization = "Bearer $($login.access_token)" }

$context = Assert-Response "Authorization context" {
  Invoke-RestMethod -Uri "$api/api/v1/authorization/context" -Headers $headers -TimeoutSec 20
}
if (-not $context.user.id -or -not $context.role.slug) { throw "Incomplete authorization context" }

Assert-Response "Task visibility" {
  Invoke-RestMethod -Uri "$api/api/v1/tasks" -Headers $headers -TimeoutSec 30
} | Out-Null
Assert-Response "Report visibility" {
  Invoke-RestMethod -Uri "$api/api/v1/reports/summary" -Headers $headers -TimeoutSec 30
} | Out-Null
Assert-Response "Notification inbox" {
  Invoke-RestMethod -Uri "$api/api/v1/notifications/me" -Headers $headers -TimeoutSec 30
} | Out-Null
Assert-Response "Incident summary" {
  Invoke-RestMethod -Uri "$api/api/v1/incidents/summary" -Headers $headers -TimeoutSec 30
} | Out-Null

Write-Host "$passed enterprise gates passed." -ForegroundColor Green
