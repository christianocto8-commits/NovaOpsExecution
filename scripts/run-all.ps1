$ErrorActionPreference = "Stop"

. "$PSScriptRoot\lib\common.ps1"

$root = Get-NovaOpsRoot

Write-Step "Starting NovaOps API and Web"

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

Write-Ok "Services are starting"
Write-Host "Backend : http://localhost:8000/docs"
Write-Host "Frontend: http://localhost:3000"
