$ErrorActionPreference = "Stop"

$Root = Resolve-Path "$PSScriptRoot\.."
Set-Location $Root

function Info($m) { Write-Host "[INFO] $m" -ForegroundColor Cyan }
function Pass($m) { Write-Host "[PASS] $m" -ForegroundColor Green }
function Warn($m) { Write-Host "[WARN] $m" -ForegroundColor Yellow }

$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupRoot = Join-Path $Root "backups\local-$Timestamp"
$DbDir = Join-Path $BackupRoot "db"
$EvidenceDir = Join-Path $BackupRoot "evidence"

New-Item -ItemType Directory -Force -Path $DbDir, $EvidenceDir | Out-Null

$DefaultDatabaseUrl = "postgresql://novaops_user:novaops_password@localhost:5433/novaops_db"
$DatabaseUrl = $DefaultDatabaseUrl
$EnvFile = Join-Path $Root "apps\api\.env"

if (Test-Path $EnvFile) {
  foreach ($line in Get-Content $EnvFile) {
    if ($line -match '^\s*DATABASE_URL\s*=\s*(.+)\s*$') {
      $DatabaseUrl = $Matches[1].Trim().Trim('"').Trim("'")
      break
    }
  }
}

Info "Backup folder: $BackupRoot"
Info "DATABASE_URL: $($DatabaseUrl -replace '://([^:@/]+):([^@/]+)@', '://$1:***@')"

if ($DatabaseUrl -match '^postgres(?:ql)?(\+[^:]+)?://(?<user>[^:@/]+):(?<pass>[^@/]+)@(?<host>[^:/]+):(?<port>\d+)/(?<db>[^?]+)') {
  $pgUser = $Matches.user
  $pgPass = $Matches.pass
  $pgHost = $Matches.host
  $pgPort = $Matches.port
  $pgDb = $Matches.db
} else {
  throw "DATABASE_URL format not recognized. Expected postgresql://user:pass@host:port/db"
}

$DumpFile = Join-Path $DbDir "novaops-$Timestamp.sql"
$DumpSucceeded = $false

$pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
if ($pgDump) {
  Info "Running pg_dump..."
  $env:PGPASSWORD = $pgPass
  & pg_dump -h $pgHost -p $pgPort -U $pgUser -d $pgDb -F p -f $DumpFile
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue

  if ($LASTEXITCODE -eq 0 -and (Test-Path $DumpFile)) {
    $DumpSucceeded = $true
    Pass "PostgreSQL dump saved to $DumpFile"
  }
}

if (-not $DumpSucceeded) {
  $docker = Get-Command docker -ErrorAction SilentlyContinue
  if ($docker) {
    Info "pg_dump unavailable; trying docker exec novaops_postgres..."
    docker exec -e PGPASSWORD=$pgPass novaops_postgres pg_dump -U $pgUser -d $pgDb | Set-Content -Encoding utf8 $DumpFile

    if ($LASTEXITCODE -eq 0 -and (Test-Path $DumpFile)) {
      $DumpSucceeded = $true
      Pass "PostgreSQL dump via Docker saved to $DumpFile"
    }
  }
}

if (-not $DumpSucceeded) {
  Warn "Database dump skipped. Start Postgres (docker compose up -d) and ensure pg_dump or Docker is available."
}

$EvidenceSource = Join-Path $Root "apps\api\uploads\evidence"
if (Test-Path $EvidenceSource) {
  Info "Copying evidence uploads..."
  Copy-Item -Path (Join-Path $EvidenceSource "*") -Destination $EvidenceDir -Recurse -Force -ErrorAction SilentlyContinue
  Pass "Evidence copied to $EvidenceDir"
} else {
  Warn "Evidence folder not found at $EvidenceSource (skipped)."
}

@{
  created_at = (Get-Date).ToUniversalTime().ToString("o")
  database_url_host = $pgHost
  database_url_port = $pgPort
  database_url_name = $pgDb
  db_dump = $(if ($DumpSucceeded) { (Split-Path -Leaf $DumpFile) } else { $null })
  evidence_source = $EvidenceSource
} | ConvertTo-Json | Set-Content -Path (Join-Path $BackupRoot "manifest.json") -Encoding utf8

Pass "Local backup complete: $BackupRoot"
