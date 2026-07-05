$ErrorActionPreference = "Continue"

$Root = Split-Path -Parent $PSScriptRoot
$ApiPath = Join-Path $Root "apps\api"
$WebPath = Join-Path $Root "apps\web"

Write-Host "== NovaOps Doctor ==" -ForegroundColor Cyan

Write-Host "`nGit:" -ForegroundColor Yellow
Set-Location $Root
git status --short
git rev-parse --short HEAD

$dirtyLock = git status --short -- "apps/web/package-lock.json"
if ($dirtyLock) {
  Write-Host "WARNING package-lock.json has local changes. Run: git restore apps/web/package-lock.json" -ForegroundColor Red
} else {
  Write-Host "OK package-lock.json clean"
}

Write-Host "`nDocker:" -ForegroundColor Yellow
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

Write-Host "`nBackend:" -ForegroundColor Yellow
Set-Location $ApiPath
if (Test-Path ".env") { Write-Host "OK .env found" } else { Write-Host "MISSING .env" -ForegroundColor Red }
if (Test-Path ".venv") { Write-Host "OK .venv found" } else { Write-Host "MISSING .venv" -ForegroundColor Red }
if (Test-Path ".venv\Scripts\alembic.exe") {
  & ".\.venv\Scripts\alembic.exe" current
} else {
  Write-Host "MISSING alembic executable" -ForegroundColor Red
}

Write-Host "`nFrontend:" -ForegroundColor Yellow
Set-Location $WebPath
node -v
npm -v

if (Test-Path "package-lock.json") {
  Write-Host "OK package-lock.json found"
} else {
  Write-Host "MISSING package-lock.json" -ForegroundColor Red
}

npm list next --depth=0
npm list tailwindcss --depth=0
npm list react --depth=0

Write-Host "`nDoctor completed." -ForegroundColor Green
