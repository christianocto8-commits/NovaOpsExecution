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
  $standaloneDir = Join-Path $WebDir ".next\standalone"
  if (-not (Test-Path $standaloneDir)) {
    throw "Standalone build not found at $standaloneDir. Run 'npm run build' first."
  }

  $tar = Get-Command tar -ErrorAction SilentlyContinue
  if (-not $tar) {
    Write-Host "[ERROR] 'tar' not found. Windows 10+ includes tar.exe - enable it or add it to PATH." -ForegroundColor Red
    exit 1
  }

  $timestamp = Get-Date -Format "yyyyMMddHHmmss"
  $archiveName = "novaops-standalone-$timestamp.tar.gz"
  $localArchive = Join-Path $env:TEMP $archiveName
  $remoteNext = "$RemoteRoot/apps/web/.next"
  $remoteArchive = "$remoteNext/$archiveName"
  $remoteStandalone = "$remoteNext/standalone"

  Write-Host "  Packing standalone -> $archiveName ..." -ForegroundColor Gray
  if (Test-Path $localArchive) { Remove-Item -Force $localArchive }

  Push-Location (Join-Path $WebDir ".next")
  try {
    & tar -czf $localArchive standalone
    if ($LASTEXITCODE -ne 0) { throw "tar pack failed with exit code $LASTEXITCODE" }
  }
  finally {
    Pop-Location
  }

  $sizeMb = [math]::Round((Get-Item $localArchive).Length / 1MB, 1)
  Write-Host "  Archive size: ${sizeMb} MB" -ForegroundColor Gray

  Write-Host "  Uploading archive to VPS ..." -ForegroundColor Gray
  ssh @sshArgs $VpsHost "mkdir -p '$remoteNext'"
  if ($LASTEXITCODE -ne 0) { throw "ssh mkdir failed" }

  scp @sshArgs $localArchive "${VpsHost}:${remoteArchive}"
  if ($LASTEXITCODE -ne 0) { throw "scp upload failed" }

  Write-Host "  Extracting on VPS (stop web, replace standalone, cleanup) ..." -ForegroundColor Gray
  $remoteScript = @"
set -e
systemctl stop novaops-web 2>/dev/null || true
rm -rf '$remoteStandalone'
tar -xzf '$remoteArchive' -C '$remoteNext'
rm -f '$remoteArchive'
if systemctl list-unit-files novaops-web.service 2>/dev/null | grep -q '^novaops-web.service'; then
  systemctl restart novaops-web
  echo 'novaops-web restarted'
else
  echo 'novaops-web not installed yet; skipped restart'
fi
echo 'Frontend standalone deployed to $remoteStandalone'
"@
  $remoteScript = ($remoteScript -replace "`r`n", "`n" -replace "`r", "`n").Trim()
  $localSh = Join-Path $env:TEMP "novaops-frontend-remote-$timestamp.sh"
  $utf8NoBom = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllText($localSh, $remoteScript, $utf8NoBom)
  $remoteSh = "/tmp/novaops-frontend-remote-$timestamp.sh"
  scp @sshArgs $localSh "${VpsHost}:${remoteSh}"
  if ($LASTEXITCODE -ne 0) { throw "scp remote script failed" }
  ssh @sshArgs $VpsHost "bash '$remoteSh'; ec=`$?; rm -f '$remoteSh'; exit `$ec"
  if ($LASTEXITCODE -ne 0) { throw "remote extract failed" }
  Remove-Item -Force $localSh -ErrorAction SilentlyContinue

  Remove-Item -Force $localArchive -ErrorAction SilentlyContinue
  Write-Host "  Frontend tar.gz deploy complete." -ForegroundColor Green
}
