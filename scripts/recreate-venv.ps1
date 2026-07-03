@"
`$ErrorActionPreference = "Stop"

Set-Location "`$PSScriptRoot\.."

if (Test-Path ".venv") {
    Write-Host "Removing old .venv..."
    Remove-Item ".venv" -Recurse -Force
}

Write-Host "Creating fresh .venv..."
python -m venv .venv

& ".\.venv\Scripts\Activate.ps1"

python -m pip install --upgrade pip
pip install -r apps\api\requirements.txt

Write-Host "Virtual environment recreated." -ForegroundColor Green
"@ | Set-Content scripts\recreate-venv.ps1
