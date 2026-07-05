$ErrorActionPreference = "Continue"

$Root = Resolve-Path "$PSScriptRoot\.."
Set-Location $Root

Write-Host "`nCleaning NovaOps development cache..." -ForegroundColor Cyan

$paths = @(
  "apps\web\.next",
  "apps\web\node_modules\.cache",
  "apps\web\dist",
  "apps\web\coverage",
  "apps\api\__pycache__",
  "apps\api\.pytest_cache",
  "apps\backend\__pycache__",
  "apps\backend\.pytest_cache"
)

foreach ($p in $paths) {
  if (Test-Path $p) {
    Remove-Item $p -Recurse -Force
    Write-Host "Removed $p" -ForegroundColor Green
  }
}

Get-ChildItem -Recurse -Directory -Filter "__pycache__" -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force

Write-Host "Clean completed." -ForegroundColor Green
