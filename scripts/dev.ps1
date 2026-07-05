$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$ApiPath = Join-Path $Root "apps\api"
$WebPath = Join-Path $Root "apps\web"

Write-Host "Starting NovaOps development environment..." -ForegroundColor Cyan

Set-Location $Root
docker compose up -d

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ApiPath'; .\.venv\Scripts\activate; uvicorn app.main:app --reload"

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$WebPath'; npm run dev"

Write-Host "Backend:  http://127.0.0.1:8000"
Write-Host "Frontend: http://localhost:3000"
