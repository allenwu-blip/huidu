# start.ps1 - serve the app locally and open it.
# ES modules need http://, not file://, so a static server is required. Nothing goes online:
# it binds to 127.0.0.1 only, and every highlight stays in this browser's IndexedDB.
param([int]$Port = 8788, [switch]$NoOpen)

$root = $PSScriptRoot
$url = "http://127.0.0.1:$Port/app/index.html"

$alive = $false
try {
  $r = Invoke-WebRequest "http://127.0.0.1:$Port/app/index.html" -UseBasicParsing -TimeoutSec 3
  if ($r.StatusCode -eq 200) { $alive = $true; "already serving on $Port" }
} catch {}

if (-not $alive) {
  $py = (Get-Command python -ErrorAction SilentlyContinue).Source
  if (-not $py) { $py = "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe" }
  if (-not (Test-Path $py)) { Write-Error "python not found"; exit 1 }
  Start-Process -FilePath $py -ArgumentList '-m', 'http.server', "$Port", '--bind', '127.0.0.1' `
    -WorkingDirectory $root -WindowStyle Hidden
  Start-Sleep -Seconds 2
  try {
    $r = Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 6
    "serving on $Port (HTTP $($r.StatusCode))"
  } catch { Write-Error "server did not come up on $Port"; exit 2 }
}

"open: $url"
if (-not $NoOpen) { Start-Process $url }
