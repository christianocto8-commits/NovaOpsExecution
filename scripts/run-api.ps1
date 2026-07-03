$ErrorActionPreference = "Stop"

. "$PSScriptRoot\lib\common.ps1"

$root = Get-NovaOpsRoot
$python = Get-NovaOpsPython

Set-Location "$root\apps\api"

Write-Step "Starting NovaOps API"
& $python -m uvicorn app.main:app --reload
