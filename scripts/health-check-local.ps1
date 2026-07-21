$ErrorActionPreference = "Stop"

$ApiUrl = if ($env:NOVAOPS_API_URL) { $env:NOVAOPS_API_URL } else { "http://localhost:8000/api/v1/health" }
$WebUrl = if ($env:NOVAOPS_WEB_URL) { $env:NOVAOPS_WEB_URL } else { "http://localhost:3000" }

function Test-Endpoint {
  param(
    [string]$Name,
    [string]$Url
  )

  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
      Write-Host "[PASS] $Name ($Url)" -ForegroundColor Green
      return $true
    }

    Write-Host "[FAIL] $Name returned $($response.StatusCode)" -ForegroundColor Red
    return $false
  } catch {
    Write-Host "[FAIL] $Name unreachable: $($_.Exception.Message)" -ForegroundColor Red
    return $false
  }
}

Write-Host "NovaOps local health check" -ForegroundColor Cyan

$apiOk = Test-Endpoint -Name "API" -Url $ApiUrl
$webOk = Test-Endpoint -Name "Web" -Url $WebUrl

if (-not ($apiOk -and $webOk)) {
  exit 1
}

Write-Host "All checks passed." -ForegroundColor Green
