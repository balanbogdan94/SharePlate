# SharePlate - Start full development environment (Windows / PowerShell)
$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Definition

function Write-Step([string]$msg) { Write-Host $msg -ForegroundColor Yellow }
function Write-Ok([string]$msg)   { Write-Host $msg -ForegroundColor Green }
function Write-Err([string]$msg)  { Write-Host $msg -ForegroundColor Red }

Write-Host "SharePlate Dev Environment" -ForegroundColor Cyan
Write-Host ""

# 1. Docker
Write-Step "[1/3] Starting Docker services (postgres + azurite)..."
try {
    docker compose -f "$RootDir\infra\docker-compose.yml" up -d
} catch {
    Write-Err "Failed to start Docker services. Is Docker running?"
    exit 1
}
Write-Ok "  Docker services ready."
Write-Host ""

# 2. Backend
Write-Step "[2/3] Starting .NET backend (http://localhost:5211)..."
$backend = Start-Process -FilePath "dotnet" `
    -ArgumentList "run --project SharePlate.API/SharePlate.API.csproj" `
    -WorkingDirectory "$RootDir\backend" `
    -PassThru -NoNewWindow

Start-Sleep -Seconds 2

# 3. Frontend
Write-Step "[3/3] Starting frontend (Vite dev server)..."
$frontend = Start-Process -FilePath "cmd" `
    -ArgumentList "/c npm run dev" `
    -WorkingDirectory "$RootDir\frontend" `
    -PassThru -NoNewWindow

Write-Host ""
Write-Ok "All services started."
Write-Host "  Backend  -> " -NoNewline; Write-Host "http://localhost:5211" -ForegroundColor Cyan
Write-Host "  Frontend -> " -NoNewline; Write-Host "http://localhost:5173" -ForegroundColor Green
Write-Host "  Swagger  -> " -NoNewline; Write-Host "http://localhost:5211/swagger" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press " -NoNewline; Write-Host "Ctrl+C" -ForegroundColor Yellow -NoNewline; Write-Host " to stop all services."
Write-Host ""

try {
    # Keep running until Ctrl+C
    while ($true) { Start-Sleep -Seconds 5 }
} finally {
    Write-Host "`nShutting down..." -ForegroundColor Yellow
    if ($backend -and !$backend.HasExited)  { Stop-Process -Id $backend.Id  -Force -ErrorAction SilentlyContinue }
    if ($frontend -and !$frontend.HasExited) { Stop-Process -Id $frontend.Id -Force -ErrorAction SilentlyContinue }
    docker compose -f "$RootDir\infra\docker-compose.yml" stop
    Write-Ok "All services stopped."
}
