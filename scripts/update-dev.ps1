$ErrorActionPreference = "Stop"

Set-Location "$PSScriptRoot\.."

Write-Host "Updating NovaOps development environment..." -ForegroundColor Green

git pull

if (!(Test-Path ".venv")) {
    Write-Host "Creating Python virtual environment..."
    python -m venv .venv
}

& ".\.venv\Scripts\Activate.ps1"

Write-Host "Updating backend dependencies..."
python -m pip install --upgrade pip
pip install -r apps\api\requirements.txt

Write-Host "Updating frontend dependencies..."
Set-Location "apps\web"
npm install

Set-Location "..\.."

Write-Host "Development environment updated." -ForegroundColor Green
