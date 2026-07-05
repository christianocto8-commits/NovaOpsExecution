$ErrorActionPreference = "Continue"

$Root = Resolve-Path "$PSScriptRoot\.."
Set-Location $Root

Write-Host "`nStopping NovaOps..." -ForegroundColor Cyan

docker compose down

Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process python -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "NovaOps stopped." -ForegroundColor Green
