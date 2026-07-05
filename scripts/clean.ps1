$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$WebPath = Join-Path $Root "apps\web"

Write-Host "Cleaning NovaOps local build artifacts..." -ForegroundColor Cyan

Set-Location $WebPath

if (Test-Path ".next") {
  Remove-Item ".next" -Recurse -Force
  Write-Host "Removed apps/web/.next"
}

if (Test-Path "node_modules\.cache") {
  Remove-Item "node_modules\.cache" -Recurse -Force
  Write-Host "Removed apps/web/node_modules/.cache"
}

Write-Host "Clean completed." -ForegroundColor Green
