$ErrorActionPreference = "Stop"

$root = Split-Path $PSScriptRoot -Parent
Set-Location "$root\apps\api"

& "$root\.venv\Scripts\Activate.ps1"

uvicorn app.main:app --reload
