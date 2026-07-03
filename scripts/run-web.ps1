$ErrorActionPreference = "Stop"

. "$PSScriptRoot\lib\common.ps1"

$root = Get-NovaOpsRoot

Set-Location "$root\apps\web"

Write-Step "Starting NovaOps Web"
npm run dev
