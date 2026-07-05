$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$ApiPath = Join-Path $Root "apps\api"

Write-Host "Resetting NovaOps database..." -ForegroundColor Yellow

Set-Location $Root
docker compose down -v
docker rm -f novaops_postgres 2>$null
docker compose up -d

Start-Sleep -Seconds 5

Set-Location $ApiPath
& ".\.venv\Scripts\alembic.exe" upgrade head
& ".\.venv\Scripts\python.exe" seed_admin.py

Write-Host "Database reset completed." -ForegroundColor Green
