$ErrorActionPreference = "Stop"

$Root = Resolve-Path "$PSScriptRoot\.."
Set-Location $Root

$BackendDir = Join-Path $Root "apps\api"
$FrontendDir = Join-Path $Root "apps\web"
$BackendPython = Join-Path $BackendDir ".venv\Scripts\python.exe"

Write-Host ""
Write-Host "Starting NovaOps development stack..." -ForegroundColor Cyan
Write-Host "Root     : $Root"
Write-Host "Backend  : $BackendDir"
Write-Host "Frontend : $FrontendDir"

if (!(Test-Path $BackendDir)) {
  throw "Backend folder not found: $BackendDir"
}

if (!(Test-Path $FrontendDir)) {
  throw "Frontend folder not found: $FrontendDir"
}

if (!(Test-Path $BackendPython)) {
  throw "Backend virtualenv not found. Run .\bootstrap.ps1 first."
}

Write-Host ""
Write-Host "[INFO] Starting Docker services" -ForegroundColor Cyan
docker compose up -d

Write-Host ""
Write-Host "[INFO] Opening backend terminal" -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-ExecutionPolicy", "Bypass",
  "-Command",
  "cd `"$BackendDir`"; `"$BackendPython`" -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"
)

Start-Sleep -Seconds 2

Write-Host "[INFO] Opening frontend terminal" -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-ExecutionPolicy", "Bypass",
  "-Command",
  "cd `"$FrontendDir`"; npm run dev"
)

Start-Sleep -Seconds 2

Write-Host "[INFO] Opening browser" -ForegroundColor Cyan
Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "NovaOps development stack is starting." -ForegroundColor Green
Write-Host "Frontend : http://localhost:3000"
Write-Host "Backend  : http://localhost:8000"
Write-Host "Swagger  : http://localhost:8000/docs"
Write-Host ""
Write-Host "To stop services:"
Write-Host "  .\novaops.ps1 stop"
