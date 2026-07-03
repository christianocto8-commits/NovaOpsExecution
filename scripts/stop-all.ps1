Write-Host "Stopping common NovaOps development ports..." -ForegroundColor Yellow

$ports = @(3000, 8000)

foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue

    foreach ($connection in $connections) {
        $processId = $connection.OwningProcess

        if ($processId) {
            Write-Host "Stopping process on port $port. PID: $processId"
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        }
    }
}

Write-Host "Done." -ForegroundColor Green
