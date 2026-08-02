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
  if (-not (Test-Path -LiteralPath $standaloneDir)) {
    throw "Standalone build not found at $standaloneDir. Run 'npm run build' first."
  }

  $timestamp = Get-Date -Format "yyyyMMddHHmmss"
  $remoteNext = "$RemoteRoot/apps/web/.next"
  $remoteStandalone = "$remoteNext/standalone"
  $remoteStandaloneIncoming = "$remoteNext/standalone-new-$timestamp"

  Write-Host "  Uploading standalone folder to VPS ..." -ForegroundColor Gray
  ssh @sshArgs $VpsHost "mkdir -p '$remoteNext' && rm -rf '$remoteStandaloneIncoming'"
  if ($LASTEXITCODE -ne 0) { throw "ssh prepare failed" }

  scp @sshArgs -r $standaloneDir "${VpsHost}:${remoteStandaloneIncoming}"
  if ($LASTEXITCODE -ne 0) { throw "scp upload failed" }

  Write-Host "  Swapping standalone on VPS ..." -ForegroundColor Gray
  $remoteScript = @"
set -e
test -f '$remoteStandaloneIncoming/server.js'
systemctl stop novaops-web 2>/dev/null || true
rm -rf '$remoteStandalone.previous'
if [ -d '$remoteStandalone' ]; then
  mv '$remoteStandalone' '$remoteStandalone.previous'
fi
mv '$remoteStandaloneIncoming' '$remoteStandalone'
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

  try {
    scp @sshArgs $localSh "${VpsHost}:${remoteSh}"
    if ($LASTEXITCODE -ne 0) { throw "scp remote script failed" }
    ssh @sshArgs $VpsHost "bash '$remoteSh'; ec=`$?; rm -f '$remoteSh'; exit `$ec"
    if ($LASTEXITCODE -ne 0) { throw "remote swap failed" }
  }
  finally {
    Remove-Item -LiteralPath $localSh -ErrorAction SilentlyContinue -Force
  }

  Write-Host "  Frontend standalone deploy complete." -ForegroundColor Green
}
