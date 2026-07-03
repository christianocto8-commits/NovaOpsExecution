$ErrorActionPreference = "Continue"

. "$PSScriptRoot\lib\common.ps1"

$root = Get-NovaOpsRoot
Set-Location $root

Write-Step "NovaOps Health Check"

foreach ($cmd in @("python", "node", "npm", "git")) {
    if (Get-Command $cmd -ErrorAction SilentlyContinue) {
        Write-Ok "$cmd found"
    } else {
        Write-Fail "$cmd not found"
    }
}

if (Test-Path ".venv\Scripts\python.exe") {
    Write-Ok ".venv Python found"
    $python = Get-NovaOpsPython

    foreach ($module in @("sqlalchemy", "fastapi", "uvicorn", "passlib", "bcrypt")) {
        & $python -c "import $module" 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Ok "Python module: $module"
        } else {
            Write-Fail "Python module missing: $module"
        }
    }

    $bcryptVersion = & $python -m pip show bcrypt | Select-String "^Version:"
    if ($bcryptVersion -match "4\.0\.1") {
        Write-Ok "bcrypt locked to 4.0.1"
    } else {
        Write-Fail "bcrypt version is not 4.0.1"
    }
} else {
    Write-Fail ".venv Python missing"
}

if (Test-Path "apps\web\package.json") { Write-Ok "Frontend package.json" } else { Write-Fail "Frontend package.json missing" }
if (Test-Path "apps\web\node_modules") { Write-Ok "Frontend node_modules" } else { Write-Warn "Frontend node_modules missing" }

Write-Step "Checking API"
try {
    Invoke-WebRequest "http://localhost:8000/docs" -UseBasicParsing -TimeoutSec 3 | Out-Null
    Write-Ok "API reachable"
} catch {
    Write-Warn "API not reachable"
}

Write-Step "Checking Web"
try {
    Invoke-WebRequest "http://localhost:3000" -UseBasicParsing -TimeoutSec 3 | Out-Null
    Write-Ok "Web reachable"
} catch {
    Write-Warn "Web not reachable"
}

Write-Host ""
Write-Ok "Health check complete"
