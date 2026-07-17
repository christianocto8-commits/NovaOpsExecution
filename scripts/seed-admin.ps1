$ErrorActionPreference = "Stop"

Set-Location "$PSScriptRoot\..\apps\api"

if (Test-Path ".\.venv\Scripts\python.exe") {
  $PythonCmd = ".\.venv\Scripts\python.exe"
} else {
  $PythonCmd = "python"
}

& $PythonCmd -c "from app.bootstrap.ensure_online_admin import ensure_online_admin; ensure_online_admin(); print('Bootstrap admin ensured from BOOTSTRAP_* settings.')"
