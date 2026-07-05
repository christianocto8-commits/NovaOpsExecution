$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$ApiPath = Join-Path $Root "apps\api"
$WebPath = Join-Path $Root "apps\web"

Write-Host "Updating NovaOps from GitHub..." -ForegroundColor Cyan

Set-Location $Root
git pull origin main

Write-Host "Starting PostgreSQL..." -ForegroundColor Yellow
docker compose up -d

Write-Host "Updating backend database..." -ForegroundColor Yellow
Set-Location $ApiPath
& ".\.venv\Scripts\alembic.exe" upgrade head

Write-Host "Updating frontend dependencies deterministically..." -ForegroundColor Yellow
Set-Location $WebPath
npm ci

Write-Host "Update completed." -ForegroundColor Green
