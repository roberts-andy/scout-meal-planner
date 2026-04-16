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
}

# Set env vars for Cosmos DB Emulator
$env:COSMOS_EMULATOR = "true"
# Clear VITE_API_URL so the Vite proxy is used (don't call API directly cross-origin)
$env:VITE_API_URL = ""

Write-Host ""
Write-Host "Starting dev environment..." -ForegroundColor Green
Write-Host "  Frontend: http://localhost:5000 (Vite proxies /api to Express)" -ForegroundColor Yellow
Write-Host "  API:      http://localhost:3001/api" -ForegroundColor Yellow
Write-Host "  Health:   http://localhost:3001/api/health" -ForegroundColor Yellow
Write-Host ""

npm run dev:all
