function Get-NovaOpsRoot {
    return (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
}

function Get-NovaOpsPython {
    $root = Get-NovaOpsRoot
    $python = Join-Path $root ".venv\Scripts\python.exe"

    if (!(Test-Path $python)) {
        throw "Python virtual environment not found. Run: .\scripts\setup-dev.ps1"
    }

    return $python
}

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Write-Ok {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Fail {
    param([string]$Message)
    Write-Host "[FAIL] $Message" -ForegroundColor Red
}
