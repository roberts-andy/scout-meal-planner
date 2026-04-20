# Start local dev environment
# Prerequisites: Python 3.13+, Node.js 20+ (for frontend), Azure Cosmos DB Emulator running

$ErrorActionPreference = "Stop"

# Auto-activate fnm + Node version from .nvmrc (works even with PowerShell --noprofile)
if (Get-Command fnm -ErrorAction SilentlyContinue) {
    fnm env --use-on-cd --shell power-shell | Out-String | Invoke-Expression
    if (Test-Path ".nvmrc") { fnm use --install-if-missing | Out-Null }
} elseif ((node --version) -notmatch '^v(20|22)\.') {
    Write-Host "WARNING: Node $(node --version) may be incompatible." -ForegroundColor Yellow
    Write-Host "         Install fnm (winget install Schniz.fnm) or switch to Node 20 LTS." -ForegroundColor Yellow
}

# Install frontend dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
    npm install
}

# Set up Python venv and install API dependencies
if (-not (Test-Path "api/.venv")) {
    Write-Host "Creating Python virtual environment..." -ForegroundColor Cyan
    python -m venv api/.venv
}
$venvPython = if ($IsWindows -or $env:OS -match "Windows") { "api/.venv/Scripts/python" } else { "api/.venv/bin/python" }
& $venvPython -m pip install -q -r api/requirements.txt

# Load .env file if present (gitignored — copy .env.example to .env and fill in values)
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+?)\s*=\s*(.+)$') {
            [System.Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], 'Process')
        }
    }
} else {
    Write-Host "WARNING: No .env file found. Copy .env.example to .env and fill in your values." -ForegroundColor Red
    exit 1
}

# Validate required Entra env vars
if (-not $env:VITE_ENTRA_CLIENT_ID -or $env:VITE_ENTRA_CLIENT_ID -eq "REPLACE_ME") {
    Write-Host "ERROR: Set VITE_ENTRA_CLIENT_ID in .env to your Application (client) ID" -ForegroundColor Red
    Write-Host "       (GUID from the Entra app registration)" -ForegroundColor Yellow
    exit 1
}


# Clear VITE_API_URL so the Vite proxy is used (don't call API directly cross-origin)
$env:VITE_API_URL = ""

# Validate Cosmos DB connection — must be set in .env (emulator or real account)
if (-not $env:COSMOS_ENDPOINT -and -not $env:COSMOS_CONNECTION_STRING) {
    Write-Host "ERROR: Set COSMOS_CONNECTION_STRING in .env (see .env.example for the emulator value)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Starting dev environment (Vite + FastAPI)..." -ForegroundColor Green
Write-Host "  App:    http://localhost:5000" -ForegroundColor Yellow
Write-Host "  API:    http://localhost:8000" -ForegroundColor DarkGray
Write-Host "  Health: http://localhost:5000/api/health" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Vite proxies /api/* to FastAPI automatically." -ForegroundColor DarkGray
Write-Host ""

# Start FastAPI in the background
$uvicorn = if ($IsWindows -or $env:OS -match "Windows") { "api/.venv/Scripts/uvicorn" } else { "api/.venv/bin/uvicorn" }
$apiJob = Start-Process -NoNewWindow -PassThru -FilePath $uvicorn -ArgumentList "app.main:app --host 127.0.0.1 --port 8000 --reload --reload-exclude .venv" -WorkingDirectory "api"

# Wait for API to be ready
$retries = 0
while ($retries -lt 15) {
    try {
        $null = Invoke-RestMethod -Uri "http://localhost:8000/api/health" -TimeoutSec 1
        break
    } catch {
        Start-Sleep -Milliseconds 500
        $retries++
    }
}
if ($retries -ge 15) {
    Write-Host "ERROR: FastAPI did not start on port 8000" -ForegroundColor Red
    exit 1
}
Write-Host "  API ready on port 8000" -ForegroundColor Green

try {
    npm run dev
} finally {
    # Clean up API process on exit
    if ($apiJob -and -not $apiJob.HasExited) { Stop-Process -Id $apiJob.Id -Force -ErrorAction SilentlyContinue }
}
