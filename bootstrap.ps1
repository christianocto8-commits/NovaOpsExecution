$ErrorActionPreference = "Stop"

$Root = Resolve-Path "$PSScriptRoot"
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

Write-Host ""
Write-Host "NovaOps Bootstrap" -ForegroundColor Cyan
Write-Host "================="
Write-Host "Root: $Root"
Write-Host ""

if (!(Test-Path ".git")) {
  throw "This folder is not a Git repository root."
}

$Backend = Resolve-Backend
$PythonCmd = Resolve-Python $Backend

Write-Host "Backend : $Backend"
Write-Host "Python  : $PythonCmd"
Write-Host ""

if (!(Test-Path ".env")) {
  if (Test-Path ".env.example") {
    Copy-Item ".env.example" ".env"
    Pass ".env created from .env.example"
  } else {
    Warn ".env.example missing. Skipping .env creation."
  }
} else {
  Pass ".env already exists"
}

Info "Starting Docker services"
docker compose up -d
if ($LASTEXITCODE -ne 0) { throw "Docker compose failed." }
Pass "Starting Docker services"

if (Test-Path "apps\web\package.json") {
  Push-Location "apps\web"
  Info "Installing frontend dependencies"
  npm install
  if ($LASTEXITCODE -ne 0) { throw "Installing frontend dependencies failed." }
  Pass "Installing frontend dependencies"
  Pop-Location
} else {
  Warn "apps\web\package.json not found"
}

Push-Location $Backend

if (Test-Path "requirements.txt") {
  Run-External "Installing backend dependencies" $PythonCmd @("-m", "pip", "install", "-r", "requirements.txt")
} else {
  Warn "requirements.txt not found in $Backend"
}

if (Test-Path "alembic.ini") {
  Run-External "Running Alembic upgrade" $PythonCmd @("-m", "alembic", "upgrade", "head")
} else {
  Warn "alembic.ini not found in $Backend"
}

$SeedFiles = @(
  "seed_admin.py",
  "seed.py",
  "scripts\seed_admin.py",
  "scripts\seed.py",
  "app\seed.py",
  "app\db\seed.py"
)

$SeedFile = $SeedFiles | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($SeedFile) {
  Run-External "Running seed file $SeedFile" $PythonCmd @($SeedFile)
} else {
  Warn "Seed file not detected. Skipping seed."
}

Pop-Location

Info "Running doctor"
& "$Root\scripts\doctor.ps1"

Write-Host ""
Write-Host "NovaOps bootstrap completed." -ForegroundColor Green
Write-Host "Run development stack with:"
Write-Host ".\novaops.ps1 dev"
