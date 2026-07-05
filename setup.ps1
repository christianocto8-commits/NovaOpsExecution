$ErrorActionPreference = "Stop"

$Root = Resolve-Path "$PSScriptRoot"
Set-Location $Root

Write-Host "setup.ps1 is a compatibility wrapper." -ForegroundColor Yellow
Write-Host "Running bootstrap.ps1..." -ForegroundColor Cyan

& "$Root\bootstrap.ps1"
