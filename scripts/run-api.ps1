@"
`$ErrorActionPreference = "Stop"

Set-Location "`$PSScriptRoot\..\apps\api"
& "..\..\.venv\Scripts\Activate.ps1"

uvicorn app.main:app --reload
"@ | Set-Content scripts\run-api.ps1