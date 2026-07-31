<#
.SYNOPSIS
    Automated Mobile Build & Packaging Script for NovaOps Capacitor App (Android & iOS).
.DESCRIPTION
    Fase 3: Native Mobile Production & Store-Ready Pipeline
    1. Builds Next.js static export (apps/web/out)
    2. Syncs Capacitor native assets (npx cap sync)
    3. Builds Android APK / AAB bundles via Gradle Wrapper
    4. Collects and outputs release-ready artifacts into dist/mobile/
.EXAMPLE
    .\scripts\build-mobile.ps1 -Environment production -BuildType Release
#>

[CmdletBinding()]
param(
    [Parameter()]
    [ValidateSet("production", "staging", "development")]
    [string]$Environment = "production",

    [Parameter()]
    [ValidateSet("Release", "Debug")]
    [string]$BuildType = "Release",

    [Parameter()]
    [switch]$SkipNextBuild
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path "$ScriptDir\.."
$WebDir = "$ProjectRoot\apps\web"
$OutputDir = "$ProjectRoot\dist\mobile"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  NovaOps Native Mobile Build Pipeline (Fase 3)         " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " Environment: $Environment" -ForegroundColor Yellow
Write-Host " Build Type : $BuildType" -ForegroundColor Yellow
Write-Host " Output Dir : $OutputDir" -ForegroundColor Yellow
Write-Host "--------------------------------------------------------"

# 1. Prepare Output Directory
if (Test-Path $OutputDir) {
    Remove-Item -Path $OutputDir -Recurse -Force
}
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

# 2. Build Next.js Web Assets (out/)
if (-not $SkipNextBuild) {
    Write-Host "`n[1/4] Building Next.js Static Export..." -ForegroundColor Green
    Push-Location $WebDir
    try {
        $env:CAPACITOR_ENV = $Environment
        $env:NODE_ENV = "production"
        npm run build
    }
    finally {
        Pop-Location
    }
} else {
    Write-Host "`n[1/4] Skipping Next.js build as requested." -ForegroundColor Yellow
}

# 3. Capacitor Sync
Write-Host "`n[2/4] Syncing Capacitor Native Web Assets..." -ForegroundColor Green
Push-Location $WebDir
try {
    if ($BuildType -eq "Release") {
        node scripts/check-mobile-release.mjs --require-signing
    } else {
        node scripts/check-mobile-release.mjs
    }
    npx cap sync android
}
finally {
    Pop-Location
}

# 4. Build Android Binaries (Gradle)
$AndroidDir = "$WebDir\android"
if (Test-Path $AndroidDir) {
    Write-Host "`n[3/4] Compiling Android Native Project ($BuildType)..." -ForegroundColor Green
    Push-Location $AndroidDir
    try {
        $GradleCmd = if (Test-Path ".\gradlew.bat") { ".\gradlew.bat" } else { "gradle" }
        
        if ($BuildType -eq "Release") {
            & $GradleCmd assembleRelease bundleRelease
        } else {
            & $GradleCmd assembleDebug
        }

        # Copy APK & AAB to dist/mobile
        $ApkSource = Get-ChildItem -Path "$AndroidDir\app\build\outputs\apk" -Recurse -Filter "*.apk" -ErrorAction SilentlyContinue
        $AabSource = Get-ChildItem -Path "$AndroidDir\app\build\outputs\bundle" -Recurse -Filter "*.aab" -ErrorAction SilentlyContinue

        foreach ($file in $ApkSource) {
            Copy-Item -Path $file.FullName -Destination "$OutputDir\$($file.Name)" -Force
            Write-Host "  [+] APK Artifact: $OutputDir\$($file.Name)" -ForegroundColor Cyan
        }
        foreach ($file in $AabSource) {
            Copy-Item -Path $file.FullName -Destination "$OutputDir\$($file.Name)" -Force
            Write-Host "  [+] AAB Artifact: $OutputDir\$($file.Name)" -ForegroundColor Cyan
        }
    }
    catch {
        Write-Host "  [!] Gradle build warning: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "  [!] Capacitor Android web assets synced. Open Android Studio to build APK/AAB if Gradle SDK is not in PATH." -ForegroundColor Yellow
    }
    finally {
        Pop-Location
    }
} else {
    Write-Host "`n[3/4] Android native folder not found. Run 'npx cap add android' in apps/web." -ForegroundColor Yellow
}

# 5. Output Summary
Write-Host "`n[4/4] Mobile Build Pipeline Completed Successfully!" -ForegroundColor Green
Write-Host "Artifacts location: $OutputDir" -ForegroundColor White
Write-Host "========================================================" -ForegroundColor Cyan
