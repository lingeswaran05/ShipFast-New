$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$serviceTitles = "Gateway", "Auth", "Shipment", "Operations", "Admin", "Communications", "Reporting", "Frontend"

function Stop-ServiceWindows {
  foreach ($title in $serviceTitles) {
    Get-Process -Name powershell, pwsh -ErrorAction SilentlyContinue |
      Where-Object { $_.MainWindowTitle -like "*$title*" -and $_.Id -ne $PID } |
      ForEach-Object {
        Write-Host "Closing old $title service window (process $($_.Id))"
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
      }
  }
}

function Stop-PortListener($port) {
  try {
    $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($conn in $connections) {
      $pidToStop = $conn.OwningProcess
      if ($pidToStop -gt 0 -and $pidToStop -ne $PID) {
        Write-Host "Stopping existing process $pidToStop on port $port"
        Stop-Process -Id $pidToStop -Force -ErrorAction SilentlyContinue
      }
    }
  } catch {
    # Port is free or Get-NetTCPConnection is unavailable.
  }
}

function Start-Svc($title, $relativePath, $command) {
  Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$root'; Set-Location '$relativePath'; `$Host.UI.RawUI.WindowTitle='$title'; $command"
  )
}

$servicePorts = 8088, 8085, 8081, 8082, 8083, 8086, 8087, 5173

Stop-ServiceWindows
Start-Sleep -Seconds 1

foreach ($port in $servicePorts) {
  Stop-PortListener $port
}

Start-Sleep -Seconds 2

Start-Svc "Gateway" "Backend/Gateway" "`$env:AUTH_SERVICE_URL='http://localhost:8085'; `$env:SHIPMENT_SERVICE_URL='http://localhost:8081'; `$env:OPERATIONS_SERVICE_URL='http://localhost:8082'; `$env:ADMIN_SERVICE_URL='http://localhost:8083'; `$env:COMMUNICATIONS_SERVICE_URL='http://localhost:8086'; `$env:REPORTING_SERVICE_URL='http://localhost:8087'; .\mvnw.cmd spring-boot:run"
Start-Svc "Auth" "Backend/Authenticate" "`$env:OPERATIONS_SERVICE_URL='http://localhost:8082'; .\mvnw.cmd spring-boot:run"
Start-Svc "Shipment" "Backend/shipment/shipment" "`$env:OPERATIONS_SERVICE_URL='http://localhost:8082'; `$env:COMMUNICATIONS_SERVICE_URL='http://localhost:8086'; `$env:AUTH_SERVICE_URL='http://localhost:8085'; .\mvnw.cmd spring-boot:run"
Start-Svc "Operations" "Backend/operations/operations" ".\mvnw.cmd spring-boot:run"
Start-Svc "Admin" "Backend/admin" ".\mvnw.cmd spring-boot:run"
Start-Svc "Communications" "Backend/communications" ".\mvnw.cmd spring-boot:run"
Start-Svc "Reporting" "Backend" ".\admin\mvnw.cmd -f .\reporting\pom.xml spring-boot:run"
Start-Svc "Frontend" "." "`$env:VITE_ENABLE_OLD_BACKEND_FALLBACK='false'; npm run dev -- --host 0.0.0.0 --port 5173"

Write-Host "Started Gateway(8088), Auth(8085), Shipment(8081), Operations(8082), Admin(8083), Communications(8086), Reporting(8087), Frontend(5173)."
