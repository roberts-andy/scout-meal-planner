# Start local dev environment
# Prerequisites: Node.js 22+, Azure Cosmos DB Emulator running

$ErrorActionPreference = "Stop"

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

# Set env vars for Cosmos DB Emulator
$env:COSMOS_EMULATOR = "true"
# Clear VITE_API_URL so the Vite proxy is used (don't call API directly cross-origin)
$env:VITE_API_URL = ""

Write-Host ""
Write-Host "Starting dev environment (SWA CLI + Azure Functions)..." -ForegroundColor Green
Write-Host "  Frontend + API: http://localhost:4280" -ForegroundColor Yellow
Write-Host "  Health:         http://localhost:4280/api/health" -ForegroundColor Yellow
Write-Host ""

npm run dev:swa
