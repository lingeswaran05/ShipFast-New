$root = Split-Path -Parent $MyInvocation.MyCommand.Path

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
    # Port is free
  }
}

# Stop old backend (8088) and frontend (5173)
Stop-PortListener 8088
Stop-PortListener 5173

Start-Sleep -Seconds 1

# Start MERN Backend
Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  "Set-Location '$root/mern-backend'; `$Host.UI.RawUI.WindowTitle='MERN Backend (8088)'; npm run dev"
)

# Start Frontend
Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  "Set-Location '$root'; `$Host.UI.RawUI.WindowTitle='ShipFast Frontend (5173)'; npm run dev -- --host 0.0.0.0 --port 5173"
)

Write-Host "🚀 ShipFast MERN Backend started on http://localhost:8088"
Write-Host "✨ ShipFast Frontend started on http://localhost:5173"
