$ErrorActionPreference = "Stop"

Write-Host "== NovaOps Setup ==" -ForegroundColor Cyan

$Root = Split-Path -Parent $PSScriptRoot
$ApiPath = Join-Path $Root "apps\api"
$WebPath = Join-Path $Root "apps\web"

Write-Host "Checking Docker..." -ForegroundColor Yellow
docker version | Out-Null

Write-Host "Starting PostgreSQL..." -ForegroundColor Yellow
Set-Location $Root
docker compose up -d

Write-Host "Setting up backend..." -ForegroundColor Yellow
Set-Location $ApiPath

if (!(Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Created apps/api/.env from .env.example"
}

if (!(Test-Path ".venv")) {
  python -m venv .venv
}

& ".\.venv\Scripts\python.exe" -m pip install --upgrade pip
& ".\.venv\Scripts\pip.exe" install -r requirements.txt
& ".\.venv\Scripts\alembic.exe" upgrade head
& ".\.venv\Scripts\python.exe" -c "from app.bootstrap.ensure_online_admin import ensure_online_admin; ensure_online_admin(); print('Bootstrap admin ensured.')"

Write-Host "Setting up frontend..." -ForegroundColor Yellow
Set-Location $WebPath

if (Test-Path "package-lock.json") {
  npm ci
} else {
  npm install
}

Write-Host ""
Write-Host "NovaOps setup completed." -ForegroundColor Green
Write-Host "Admin login: admin@novaops.com / admin123"
