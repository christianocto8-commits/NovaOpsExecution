$ErrorActionPreference = "Stop"

$Root = Resolve-Path "$PSScriptRoot"
Set-Location $Root

$Command = $args[0]

$WebDir = Join-Path $Root "apps\web"
$ApiDir = Join-Path $Root "apps\api"

function Show-Help {
  Write-Host ""
  Write-Host "NovaOps CLI" -ForegroundColor Cyan
  Write-Host "==========="
  Write-Host ""
  Write-Host "Usage:"
  Write-Host "  .\novaops.ps1 <command>"
  Write-Host ""
  Write-Host "Commands:"
  Write-Host "  bootstrap   Run one-click setup"
  Write-Host "  setup       Alias for bootstrap"
  Write-Host "  doctor      Check developer environment"
  Write-Host "  dev         Start development stack"
  Write-Host "  stop        Stop Docker/backend/frontend processes"
  Write-Host "  clean       Clean development cache"
  Write-Host "  reset-db    Reset database, migrate, and seed"
  Write-Host "  status      Show Git and Docker status"
  Write-Host ""
  Write-Host "Quality:"
  Write-Host "  format      Format frontend code"
  Write-Host "  lint        Run frontend lint"
  Write-Host "  typecheck   Run TypeScript typecheck"
  Write-Host "  verify      Run local developer quality gate"
  Write-Host "  ci          Run strict CI quality gate"
  Write-Host ""
  Write-Host "  help        Show this help"
  Write-Host ""
}

function Run-Step($label, [scriptblock]$command) {
  Write-Host ""
  Write-Host "[INFO] $label" -ForegroundColor Cyan

  & $command

  if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] $label failed." -ForegroundColor Red
    exit 1
  }

  Write-Host "[PASS] $label" -ForegroundColor Green
}

function Run-Script($relativePath) {
  $scriptPath = Join-Path $Root $relativePath

  if (!(Test-Path $scriptPath)) {
    Write-Host "Script not found: $relativePath" -ForegroundColor Red
    exit 1
  }

  & $scriptPath
}

function Run-FrontendFormat {
  Run-Step "Formatting frontend" {
    Push-Location $WebDir
    npm run format
    Pop-Location
  }
}

function Run-FrontendFormatCheck {
  Run-Step "Checking frontend formatting" {
    Push-Location $WebDir
    npm run format:check
    Pop-Location
  }
}

function Run-FrontendLint {
  Run-Step "Linting frontend" {
    Push-Location $WebDir
    npm run lint
    Pop-Location
  }
}

function Run-FrontendTypecheck {
  Run-Step "Typechecking frontend" {
    Push-Location $WebDir
    npm run typecheck
    Pop-Location
  }
}

function Run-FrontendBuild {
  Run-Step "Building frontend" {
    Push-Location $WebDir
    npm run build
    Pop-Location
  }
}

function Run-QualityGate($mode) {
  Write-Host ""
  Write-Host "NovaOps Enterprise Quality Gate" -ForegroundColor Cyan
  Write-Host "==============================="
  Write-Host "Mode: $mode"
  Write-Host ""

  Run-Step "Doctor" {
    & (Join-Path $Root "scripts\doctor.ps1")
  }

  Run-Step "Docker services" {
    docker compose ps
  }

  if ($mode -eq "ci") {
    Run-FrontendFormatCheck
  } else {
    Run-FrontendFormat
  }

  Run-FrontendLint
  Run-FrontendTypecheck
  Run-FrontendBuild

  Write-Host ""
  Write-Host "NovaOps quality gate passed." -ForegroundColor Green
}

function Show-Status {
  Write-Host ""
  Write-Host "NovaOps Status" -ForegroundColor Cyan
  Write-Host "=============="
  Write-Host "Root: $Root"
  Write-Host ""

  Write-Host "Git:" -ForegroundColor Cyan
  git status --short
  git log --oneline -1

  Write-Host ""
  Write-Host "Docker:" -ForegroundColor Cyan
  docker compose ps
}

switch ($Command) {
  "bootstrap" { Run-Script "bootstrap.ps1" }
  "setup" { Run-Script "bootstrap.ps1" }
  "doctor" { Run-Script "scripts\doctor.ps1" }
  "dev" { Run-Script "scripts\dev.ps1" }
  "stop" { Run-Script "scripts\stop.ps1" }
  "clean" { Run-Script "scripts\clean.ps1" }
  "reset-db" { Run-Script "scripts\reset-db.ps1" }
  "status" { Show-Status }

  "format" { Run-FrontendFormat }
  "lint" { Run-FrontendLint }
  "typecheck" { Run-FrontendTypecheck }
  "verify" { Run-QualityGate "local" }
  "ci" { Run-QualityGate "ci" }

  "help" { Show-Help }
  $null { Show-Help }
  default {
    Write-Host ""
    Write-Host "Unknown command: $Command" -ForegroundColor Red
    Show-Help
    exit 1
  }
}
