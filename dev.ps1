# Start local dev environment
# Prerequisites: Node.js 20 LTS (pinned via .nvmrc), Azure Cosmos DB Emulator running

$ErrorActionPreference = "Stop"

# Auto-activate fnm + Node version from .nvmrc (works even with PowerShell --noprofile)
if (Get-Command fnm -ErrorAction SilentlyContinue) {
    fnm env --use-on-cd --shell power-shell | Out-String | Invoke-Expression
    if (Test-Path ".nvmrc") { fnm use --install-if-missing | Out-Null }
} elseif ((node --version) -notmatch '^v(20|22)\.') {
    Write-Host "WARNING: Node $(node --version) may be incompatible with Azure Functions Core Tools v4." -ForegroundColor Yellow
    Write-Host "         Install fnm (winget install Schniz.fnm) or switch to Node 20 LTS." -ForegroundColor Yellow
}

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
    npm install
}
if (-not (Test-Path "api/node_modules")) {
    Write-Host "Installing API dependencies..." -ForegroundColor Cyan
    Push-Location api; npm install; Pop-Location
}

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
Write-Host "Starting dev environment (Vite + SWA CLI + Azure Functions)..." -ForegroundColor Green
Write-Host "  Frontend + API: http://localhost:4280" -ForegroundColor Yellow
Write-Host "  Vite (direct):  http://localhost:5000" -ForegroundColor DarkGray
Write-Host "  Health:         http://localhost:4280/api/health" -ForegroundColor Yellow
Write-Host ""

npm run dev:swa
