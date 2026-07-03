@"
`$ErrorActionPreference = "Stop"

Write-Host "NovaOps Developer Setup" -ForegroundColor Green

Set-Location "`$PSScriptRoot\.."

if (!(Test-Path ".venv")) {
    Write-Host "Creating Python virtual environment..."
    python -m venv .venv
}

Write-Host "Activating virtual environment..."
& ".\.venv\Scripts\Activate.ps1"

Write-Host "Upgrading pip..."
python -m pip install --upgrade pip

Write-Host "Installing backend dependencies..."
pip install -r apps\api\requirements.txt

Write-Host "Installing frontend dependencies..."
Set-Location "apps\web"
npm install

Set-Location "..\.."

Write-Host ""
Write-Host "Setup complete." -ForegroundColor Green
Write-Host "Run API : .\scripts\run-api.ps1"
Write-Host "Run Web : .\scripts\run-web.ps1"
"@ | Set-Content scripts\setup-dev.ps1