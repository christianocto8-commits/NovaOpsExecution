$ErrorActionPreference = "Stop"

. "$PSScriptRoot\lib\common.ps1"

$root = Get-NovaOpsRoot
Set-Location $root

if (Test-Path ".venv") {
    Write-Step "Removing old .venv"
    Remove-Item ".venv" -Recurse -Force
}

Write-Step "Creating fresh .venv"
python -m venv .venv

$python = Get-NovaOpsPython

Write-Step "Installing backend dependencies"
& $python -m pip install --upgrade pip
& $python -m pip install -r "$root\apps\api\requirements.txt"

Write-Ok "Virtual environment recreated"
