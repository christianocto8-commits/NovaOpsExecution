$ErrorActionPreference = "Stop"

. "$PSScriptRoot\lib\common.ps1"

$root = Get-NovaOpsRoot
Set-Location $root

Write-Step "NovaOps Developer Setup"

if (!(Test-Path ".venv")) {
    Write-Step "Creating Python virtual environment"
    python -m venv .venv
}

$python = Get-NovaOpsPython

Write-Step "Upgrading pip"
& $python -m pip install --upgrade pip

Write-Step "Installing backend dependencies"
& $python -m pip install -r "$root\apps\api\requirements.txt"

Write-Step "Validating bcrypt lock"
$bcryptVersion = & $python -m pip show bcrypt | Select-String "^Version:"
if ($bcryptVersion -notmatch "4\.0\.1") {
    throw "bcrypt must be 4.0.1 for passlib compatibility. Check apps\api\requirements.txt"
}

Write-Step "Installing frontend dependencies"
Set-Location "$root\apps\web"
npm install

Set-Location $root
Write-Ok "Setup complete"
Write-Host "Run all: .\scripts\run-all.ps1"
