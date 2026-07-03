Write-Host "Stopping common NovaOps development ports..." -ForegroundColor Yellow

$ports = @(3000, 8000)

foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue

    foreach ($connection in $connections) {
        $pid = $connection.OwningProcess

        if ($pid) {
            Write-Host "Stopping process on port $port. PID: $pid"
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        }
    }
}

Write-Host "Done." -ForegroundColor Green
