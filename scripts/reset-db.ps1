$ErrorActionPreference = "Stop"

$Root = Resolve-Path "$PSScriptRoot\.."
Set-Location $Root

function Info($m) { Write-Host "[INFO] $m" -ForegroundColor Cyan }
function Pass($m) { Write-Host "[PASS] $m" -ForegroundColor Green }
function Warn($m) { Write-Host "[WARN] $m" -ForegroundColor Yellow }

function Resolve-Backend {
  if (Test-Path "apps\api") { return "apps\api" }
  if (Test-Path "apps\backend") { return "apps\backend" }
  throw "Backend folder not found. Expected apps\api or apps\backend."
}

function Resolve-Python($Backend) {
  $venvPython = Join-Path $Root "$Backend\.venv\Scripts\python.exe"

  if (Test-Path $venvPython) {
    return $venvPython
  }

  $py = Get-Command py -ErrorAction SilentlyContinue
  if ($py) { return "py" }

  $python = Get-Command python -ErrorAction SilentlyContinue
  if ($python) { return "python" }

  throw "No working Python interpreter found."
}

function Run-External($label, $exe, $arguments) {
  Info $label
  & $exe @arguments

  if ($LASTEXITCODE -ne 0) {
    throw "$label failed."
  }

  Pass $label
}

$Backend = Resolve-Backend
$PythonCmd = Resolve-Python $Backend

Write-Host ""
Write-Host "NovaOps Reset Database" -ForegroundColor Cyan
Write-Host "======================"
Write-Host "Root    : $Root"
Write-Host "Backend : $Backend"
Write-Host "Python  : $PythonCmd"
Write-Host ""

Warn "This will DROP and RECREATE the local NovaOps database."
$confirm = Read-Host "Type RESET to continue"

if ($confirm -ne "RESET") {
  Warn "Reset cancelled."
  exit 0
}

Info "Starting Docker services"
docker compose up -d
if ($LASTEXITCODE -ne 0) { throw "Docker compose failed." }
Pass "Starting Docker services"

Info "Dropping active database connections"
docker exec novaops_postgres psql -U novaops_user -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'novaops_db' AND pid <> pg_backend_pid();"

Info "Dropping database"
docker exec novaops_postgres psql -U novaops_user -d postgres -c "DROP DATABASE IF EXISTS novaops_db;"

Info "Creating database"
docker exec novaops_postgres psql -U novaops_user -d postgres -c "CREATE DATABASE novaops_db OWNER novaops_user;"

Pass "Database recreated"

Push-Location $Backend

if (Test-Path "alembic.ini") {
  Run-External "Running Alembic upgrade" $PythonCmd @("-m", "alembic", "upgrade", "head")
} else {
  Warn "alembic.ini not found in $Backend"
}

Run-External "Ensuring bootstrap admin from BOOTSTRAP_* env" $PythonCmd @(
  "-c",
  "from app.bootstrap.ensure_online_admin import ensure_online_admin; ensure_online_admin(); print('Bootstrap admin ensured.')"
)

Pop-Location

Write-Host ""
Write-Host "Database reset completed." -ForegroundColor Green
