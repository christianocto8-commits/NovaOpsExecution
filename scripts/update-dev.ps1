$ErrorActionPreference = "Stop"

. "$PSScriptRoot\lib\common.ps1"

$root = Get-NovaOpsRoot
Set-Location $root

Write-Step "Pulling latest source"
git pull

if (!(Test-Path ".venv")) {
    Write-Step "Creating Python virtual environment"
    python -m venv .venv
}

$python = Get-NovaOpsPython

Write-Step "Updating backend dependencies"
& $python -m pip install --upgrade pip
& $python -m pip install -r "$root\apps\api\requirements.txt"

Write-Step "Updating frontend dependencies"
Set-Location "$root\apps\web"
npm install

Set-Location $root
Write-Ok "Development environment updated"
