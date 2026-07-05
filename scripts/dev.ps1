$ErrorActionPreference = "Stop"

$Root = Resolve-Path "$PSScriptRoot\.."
Set-Location $Root

function HasCmd($cmd) { return $null -ne (Get-Command $cmd -ErrorAction SilentlyContinue) }

function Resolve-Python {
  if (HasCmd py) {
    py --version *> $null
    if ($LASTEXITCODE -eq 0) { return "py" }
  }

  if (HasCmd python) {
    python --version *> $null
    if ($LASTEXITCODE -eq 0) { return "python" }
  }

  throw "No working Python interpreter found."
}

$PythonCmd = Resolve-Python

Write-Host "`nStarting NovaOps development stack..." -ForegroundColor Cyan

docker compose up -d

$Backend = $null
if (Test-Path "apps\api") {
  $Backend = "apps\api"
} elseif (Test-Path "apps\backend") {
  $Backend = "apps\backend"
}

if (-not $Backend) {
  throw "Backend folder not found. Expected apps\api or apps\backend."
}

Write-Host "`nBackend path: $Backend"
Write-Host "Frontend path: apps\web"
Write-Host "Python command: $PythonCmd"

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd `"$Root\$Backend`"; $PythonCmd -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd `"$Root\apps\web`"; npm run dev"

Write-Host "`nNovaOps is starting:" -ForegroundColor Green
Write-Host "Frontend : http://localhost:3000"
Write-Host "Backend  : http://localhost:8000"
Write-Host "Swagger  : http://localhost:8000/docs"
