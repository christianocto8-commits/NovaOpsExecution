@"
`$ErrorActionPreference = "Stop"

Set-Location "`$PSScriptRoot\..\apps\web"

npm run dev
"@ | Set-Content scripts\run-web.ps1
