function Deploy-VpsFrontendArchive {
  param(
    [Parameter(Mandatory = $true)]
    [string]$WebDir,
    [Parameter(Mandatory = $true)]
    [string]$VpsHost,
    [Parameter(Mandatory = $true)]
    [string]$RemoteRoot,
    [string]$SshKey
  )

  $sshArgs = if ($SshKey) { @("-i", $SshKey, "-o", "IdentitiesOnly=yes") } else { @() }
  $tar = Get-Command tar -ErrorAction SilentlyContinue
  if (-not $tar) {
    throw "'tar' not found in PATH."
  }

  $timestamp = Get-Date -Format "yyyyMMddHHmmss"
  $stagingRoot = Join-Path $env:TEMP "novaops-websrc-$timestamp"
  $archiveName = "novaops-websrc-$timestamp.tar.gz"
  $localArchive = Join-Path $env:TEMP $archiveName
  $remoteArchive = "$RemoteRoot/.deploy-tmp/$archiveName"

  if (Test-Path -LiteralPath $stagingRoot) {
    Remove-Item -LiteralPath $stagingRoot -Recurse -Force
  }
  if (Test-Path -LiteralPath $localArchive) {
    Remove-Item -LiteralPath $localArchive -Force
  }

  New-Item -ItemType Directory -Path $stagingRoot -Force | Out-Null

  $dirsToCopy = @("app", "components", "features", "hooks", "lib", "providers", "public", "services", "shared")
  foreach ($d in $dirsToCopy) {
    $srcPath = Join-Path $WebDir $d
    if (Test-Path $srcPath) {
      Copy-Item -LiteralPath $srcPath -Destination (Join-Path $stagingRoot $d) -Recurse -Force
    }
  }

  $filesToCopy = @("next.config.ts", "package.json", "package-lock.json", "postcss.config.mjs", "tsconfig.json", "next-env.d.ts", "eslint.config.mjs")
  foreach ($f in $filesToCopy) {
    $srcPath = Join-Path $WebDir $f
    if (Test-Path $srcPath) {
      Copy-Item -LiteralPath $srcPath -Destination (Join-Path $stagingRoot $f) -Force
    }
  }

  Push-Location $stagingRoot
  try {
    & tar -czf $localArchive *
    if ($LASTEXITCODE -ne 0) {
      throw "tar pack failed with exit code $LASTEXITCODE"
    }
  }
  finally {
    Pop-Location
  }

  $sizeMb = [math]::Round((Get-Item $localArchive).Length / 1MB, 1)
  Write-Host "  Uploading web source ($sizeMb MB) to VPS and building on Linux..." -ForegroundColor Gray

  ssh @sshArgs $VpsHost "mkdir -p '$RemoteRoot/.deploy-tmp' '$RemoteRoot/apps/web'"
  if ($LASTEXITCODE -ne 0) { throw "ssh mkdir failed" }

  scp @sshArgs $localArchive "${VpsHost}:${remoteArchive}"
  if ($LASTEXITCODE -ne 0) { throw "scp upload failed" }

  $remoteScript = @"
set -e
ROOT="$RemoteRoot"
ARCHIVE="$remoteArchive"
WEB_DIR="`$ROOT/apps/web"

mkdir -p "`$WEB_DIR"
tar -xzf "`$ARCHIVE" -C "`$WEB_DIR"
rm -f "`$ARCHIVE"

cd "`$WEB_DIR"
export NEXT_PUBLIC_USE_RELATIVE_API=true
npm ci --prefer-offline 2>/dev/null || npm install --no-audit

npm run build

cp -rf public .next/standalone/public
mkdir -p .next/standalone/.next
cp -rf .next/static .next/standalone/.next/static

if systemctl list-unit-files novaops-web.service 2>/dev/null | grep -q '^novaops-web.service'; then
  systemctl restart novaops-web
  echo 'novaops-web restarted'
fi
echo 'Frontend built and deployed successfully on VPS.'
"@
  $remoteScript = ($remoteScript -replace "`r`n", "`n" -replace "`r", "`n").Trim()
  $localSh = Join-Path $env:TEMP "novaops-frontend-build-$timestamp.sh"
  $utf8NoBom = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllText($localSh, $remoteScript, $utf8NoBom)
  $remoteSh = "/tmp/novaops-frontend-build-$timestamp.sh"

  try {
    scp @sshArgs $localSh "${VpsHost}:${remoteSh}"
    if ($LASTEXITCODE -ne 0) { throw "scp remote script failed" }
    ssh @sshArgs $VpsHost "bash '$remoteSh'; ec=`$?; rm -f '$remoteSh'; exit `$ec"
    if ($LASTEXITCODE -ne 0) { throw "remote build on VPS failed" }
  }
  finally {
    Remove-Item -LiteralPath $localSh -ErrorAction SilentlyContinue -Force
    Remove-Item -LiteralPath $localArchive -ErrorAction SilentlyContinue -Force
    Remove-Item -LiteralPath $stagingRoot -ErrorAction SilentlyContinue -Recurse -Force
  }

  Write-Host "  Frontend deploy complete." -ForegroundColor Green
}
