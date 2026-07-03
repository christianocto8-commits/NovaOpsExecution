$ErrorActionPreference = "Stop"

Set-Location "$PSScriptRoot\.."

Write-Host "Starting NovaOps API and Web..." -ForegroundColor Green

Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy Bypass", "-File "$PSScriptRoot\run-api.ps1""
Start-Sleep -Seconds 2
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy Bypass", "-File "$PSScriptRoot\run-web.ps1""

Write-Host "NovaOps services started." -ForegroundColor Green
Write-Host "API : http://localhost:8000/docs"
Write-Host "Web : http://localhost:3000"
