$ErrorActionPreference = "Continue"

Set-Location "$PSScriptRoot\.."

Write-Host "NovaOps Health Check" -ForegroundColor Green
Write-Host ""

function Check-Command($name) {
    $cmd = Get-Command $name -ErrorAction SilentlyContinue
    if ($cmd) {
        Write-Host "[OK] $name found" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] $name not found" -ForegroundColor Red
    }
}

function Check-Path($path, $label) {
    if (Test-Path $path) {
        Write-Host "[OK] $label" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] $label missing" -ForegroundColor Red
    }
}

Check-Command "python"
Check-Command "node"
Check-Command "npm"
Check-Command "git"

Check-Path ".venv" "Python virtual environment"
Check-Path "apps\api\requirements.txt" "Backend requirements"
Check-Path "apps\web\package.json" "Frontend package.json"
Check-Path "apps\web\node_modules" "Frontend node_modules"

Write-Host ""
Write-Host "Checking API..."
try {
    $api = Invoke-WebRequest "http://localhost:8000/docs" -UseBasicParsing -TimeoutSec 3
    Write-Host "[OK] API reachable: http://localhost:8000/docs" -ForegroundColor Green
} catch {
    Write-Host "[WARN] API not reachable. Run .\scripts\run-api.ps1" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Checking Web..."
try {
    $web = Invoke-WebRequest "http://localhost:3000" -UseBasicParsing -TimeoutSec 3
    Write-Host "[OK] Web reachable: http://localhost:3000" -ForegroundColor Green
} catch {
    Write-Host "[WARN] Web not reachable. Run .\scripts\run-web.ps1" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Health check complete."
