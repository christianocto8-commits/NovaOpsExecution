$ErrorActionPreference = "Stop"

$root = Split-Path $PSScriptRoot -Parent

Write-Host "Starting NovaOps API and Web..." -ForegroundColor Green

Start-Process powershell.exe -WorkingDirectory $root -ArgumentList @(
  "-NoExit",
  "-ExecutionPolicy", "Bypass",
  "-File", "$PSScriptRoot\run-api.ps1"
)

Start-Sleep -Seconds 2

Start-Process powershell.exe -WorkingDirectory $root -ArgumentList @(
  "-NoExit",
  "-ExecutionPolicy", "Bypass",
  "-File", "$PSScriptRoot\run-web.ps1"
)

Write-Host "Backend : http://localhost:8000/docs"
Write-Host "Frontend: http://localhost:3000"
