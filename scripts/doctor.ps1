$ErrorActionPreference = "Continue"

$Root = Resolve-Path "$PSScriptRoot\.."
Set-Location $Root

function Pass($m) { Write-Host "[PASS] $m" -ForegroundColor Green }
function Warn($m) { Write-Host "[WARN] $m" -ForegroundColor Yellow }
function Fail($m) { Write-Host "[FAIL] $m" -ForegroundColor Red }
function Section($m) { Write-Host "`n=== $m ===" -ForegroundColor Cyan }
function HasCmd($cmd) { return $null -ne (Get-Command $cmd -ErrorAction SilentlyContinue) }

function RunCheck($label, $command) {
  $output = Invoke-Expression "$command 2>&1"
  if ($LASTEXITCODE -eq 0) {
    Pass "$label`: $output"
    return $true
  }

  Fail "$label failed: $output"
  return $false
}

Write-Host "`nNovaOps Doctor" -ForegroundColor Cyan
Write-Host "Root: $Root"

Section "Repository"
if (Test-Path ".git") { Pass "Git repository found" } else { Fail ".git not found" }
git status --short
git log --oneline -1

Section "Runtime"
if (HasCmd node) { RunCheck "Node" "node --version" | Out-Null } else { Fail "Node missing" }
if (HasCmd npm) { RunCheck "npm" "npm --version" | Out-Null } else { Fail "npm missing" }

$PythonCmd = $null
if (HasCmd py) {
  if (RunCheck "Python launcher" "py --version") { $PythonCmd = "py" }
}

if (-not $PythonCmd -and (HasCmd python)) {
  if (RunCheck "Python" "python --version") { $PythonCmd = "python" }
}

if ($PythonCmd) {
  RunCheck "pip" "$PythonCmd -m pip --version" | Out-Null
} else {
  Fail "No working Python interpreter found"
}

Section "Docker"
if (HasCmd docker) {
  RunCheck "Docker" "docker --version" | Out-Null
  docker info *> $null
  if ($LASTEXITCODE -eq 0) { Pass "Docker engine running" } else { Fail "Docker engine not running" }
} else {
  Fail "Docker missing"
}

Section "Project Structure"
if (Test-Path "apps\web\package.json") { Pass "Frontend found: apps\web" } else { Fail "Frontend missing: apps\web" }

if (Test-Path "apps\api") {
  Pass "Backend found: apps\api"
} elseif (Test-Path "apps\backend") {
  Pass "Backend found: apps\backend"
} else {
  Fail "Backend folder not found"
}

if (Test-Path "docker-compose.yml") { Pass "docker-compose.yml found" } else { Fail "docker-compose.yml missing" }
if (Test-Path ".env") { Pass ".env found" } else { Warn ".env missing" }
if (Test-Path ".env.example") { Pass ".env.example found" } else { Warn ".env.example missing" }

Section "Ports"
foreach ($port in @(3000, 8000, 5432, 5433)) {
  $active = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
  if ($active) { Pass "Port $port active" } else { Warn "Port $port inactive" }
}

Section "Docker Compose"
docker compose ps

Write-Host "`nDoctor completed." -ForegroundColor Cyan
