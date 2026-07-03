$ErrorActionPreference = "Stop"

$root = Split-Path $MyInvocation.MyCommand.Path -Parent
Set-Location $root

function Show-Menu {
    Clear-Host
    Write-Host "=============================" -ForegroundColor Green
    Write-Host " NovaOps Developer Console"
    Write-Host "=============================" -ForegroundColor Green
    Write-Host ""
    Write-Host "1. Setup Environment"
    Write-Host "2. Run API"
    Write-Host "3. Run Web"
    Write-Host "4. Run All"
    Write-Host "5. Stop All"
    Write-Host "6. Health Check"
    Write-Host "7. Update Project"
    Write-Host "8. Recreate Venv"
    Write-Host "9. Exit"
    Write-Host ""
}

do {
    Show-Menu
    $choice = Read-Host "Choose option"

    switch ($choice) {
        "1" { .\scripts\setup-dev.ps1; pause }
        "2" { .\scripts\run-api.ps1; pause }
        "3" { .\scripts\run-web.ps1; pause }
        "4" { .\scripts\run-all.ps1; pause }
        "5" { .\scripts\stop-all.ps1; pause }
        "6" { .\scripts\health-check.ps1; pause }
        "7" { .\scripts\update-dev.ps1; pause }
        "8" { .\scripts\recreate-venv.ps1; pause }
        "9" { break }
        default { Write-Host "Invalid option." -ForegroundColor Red; pause }
    }
} while ($choice -ne "9")
