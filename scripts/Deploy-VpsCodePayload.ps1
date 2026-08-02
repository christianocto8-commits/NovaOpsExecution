function Deploy-VpsCodePayload {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Root,
    [Parameter(Mandatory = $true)]
    [string]$ApiDir,
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
  $stagingRoot = Join-Path $env:TEMP "novaops-codepayload-$timestamp"
  $payloadRoot = Join-Path $stagingRoot "payload"
  $archiveName = "novaops-codepayload-$timestamp.tar.gz"
  $localArchive = Join-Path $env:TEMP $archiveName
  $remoteArchive = "$RemoteRoot/.deploy-tmp/$archiveName"

  if (Test-Path -LiteralPath $stagingRoot) {
    Remove-Item -LiteralPath $stagingRoot -Recurse -Force
  }
  if (Test-Path -LiteralPath $localArchive) {
    Remove-Item -LiteralPath $localArchive -Force
  }

  $apiPayloadDir = Join-Path $payloadRoot "apps\api"
  $scriptsPayloadDir = Join-Path $payloadRoot "scripts"
  $deployPayloadDir = Join-Path $payloadRoot "deploy"

  New-Item -ItemType Directory -Path $apiPayloadDir -Force | Out-Null
  New-Item -ItemType Directory -Path $scriptsPayloadDir -Force | Out-Null

  Copy-Item -LiteralPath (Join-Path $ApiDir "app") -Destination (Join-Path $apiPayloadDir "app") -Recurse -Force
  Copy-Item -LiteralPath (Join-Path $ApiDir "alembic") -Destination (Join-Path $apiPayloadDir "alembic") -Recurse -Force
  Copy-Item -LiteralPath (Join-Path $ApiDir "requirements.txt") -Destination (Join-Path $apiPayloadDir "requirements.txt") -Force
  Copy-Item -LiteralPath (Join-Path $ApiDir "alembic.ini") -Destination (Join-Path $apiPayloadDir "alembic.ini") -Force
  Copy-Item -LiteralPath (Join-Path $Root "deploy") -Destination $deployPayloadDir -Recurse -Force

  $scriptFiles = @(
    "vps-activate-live.sh",
    "vps-sync-production.sh",
    "vps-harden-production.sh",
    "backup-novaops-vps.sh",
    "vps-wipe-reports.py"
  )
  foreach ($scriptFile in $scriptFiles) {
    Copy-Item `
      -LiteralPath (Join-Path $Root "scripts\$scriptFile") `
      -Destination (Join-Path $scriptsPayloadDir $scriptFile) `
      -Force
  }

  Push-Location $payloadRoot
  try {
    & tar -czf $localArchive apps deploy scripts
    if ($LASTEXITCODE -ne 0) {
      throw "tar pack failed with exit code $LASTEXITCODE"
    }
  }
  finally {
    Pop-Location
  }

  $sizeMb = [math]::Round((Get-Item $localArchive).Length / 1MB, 1)
  Write-Host "  Packaging backend + infra -> $archiveName (${sizeMb} MB) ..." -ForegroundColor Gray

  ssh @sshArgs $VpsHost "mkdir -p '$RemoteRoot/.deploy-tmp' '$RemoteRoot/apps/api' '$RemoteRoot/scripts'"
  if ($LASTEXITCODE -ne 0) {
    throw "ssh mkdir failed"
  }

  scp @sshArgs $localArchive "${VpsHost}:${remoteArchive}"
  if ($LASTEXITCODE -ne 0) {
    throw "scp upload failed"
  }

  $remoteScript = @'
set -e
ROOT="__REMOTE_ROOT__"
ARCHIVE="__REMOTE_ARCHIVE__"
STAMP="__STAMP__"
TMP_DIR="$ROOT/.deploy-tmp/code-$STAMP"

rm -rf "$TMP_DIR"
mkdir -p "$TMP_DIR"
tar -xzf "$ARCHIVE" -C "$TMP_DIR"

mkdir -p "$ROOT/apps/api" "$ROOT/scripts"
rm -rf "$ROOT/apps/api/app" "$ROOT/apps/api/alembic" "$ROOT/deploy"
cp -a "$TMP_DIR/apps/api/app" "$ROOT/apps/api/app"
cp -a "$TMP_DIR/apps/api/alembic" "$ROOT/apps/api/alembic"
cp -f "$TMP_DIR/apps/api/requirements.txt" "$ROOT/apps/api/requirements.txt"
cp -f "$TMP_DIR/apps/api/alembic.ini" "$ROOT/apps/api/alembic.ini"
cp -a "$TMP_DIR/deploy" "$ROOT/deploy"
cp -f "$TMP_DIR/scripts/"* "$ROOT/scripts/"
chmod +x "$ROOT/scripts/"*.sh 2>/dev/null || true
chmod +x "$ROOT/deploy/scripts/"*.sh 2>/dev/null || true
rm -rf "$TMP_DIR"
rm -f "$ARCHIVE"
echo 'Backend and infra payload deployed.'
'@
  $remoteScript = $remoteScript.Replace("__REMOTE_ROOT__", $RemoteRoot)
  $remoteScript = $remoteScript.Replace("__REMOTE_ARCHIVE__", $remoteArchive)
  $remoteScript = $remoteScript.Replace("__STAMP__", $timestamp)
  $remoteScript = ($remoteScript -replace "`r`n", "`n" -replace "`r", "`n").Trim()
  $localSh = Join-Path $env:TEMP "novaops-codepayload-remote-$timestamp.sh"
  $utf8NoBom = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllText($localSh, $remoteScript, $utf8NoBom)
  $remoteSh = "/tmp/novaops-codepayload-$timestamp.sh"

  try {
    scp @sshArgs $localSh "${VpsHost}:${remoteSh}"
    if ($LASTEXITCODE -ne 0) {
      throw "scp remote script failed"
    }
    ssh @sshArgs $VpsHost "bash '$remoteSh'; ec=`$?; rm -f '$remoteSh'; exit `$ec"
    if ($LASTEXITCODE -ne 0) {
      throw "remote extract failed"
    }
  }
  finally {
    Remove-Item -LiteralPath $localSh -ErrorAction SilentlyContinue -Force
    Remove-Item -LiteralPath $localArchive -ErrorAction SilentlyContinue -Force
    Remove-Item -LiteralPath $stagingRoot -ErrorAction SilentlyContinue -Recurse -Force
  }

  Write-Host "  Backend + infra payload deploy complete." -ForegroundColor Green
}
