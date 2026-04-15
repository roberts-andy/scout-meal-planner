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

# Set env vars for Cosmos DB Emulator
$env:COSMOS_EMULATOR = "true"
$env:VITE_API_URL = "http://localhost:3001/api"

Write-Host ""
Write-Host "Starting dev environment..." -ForegroundColor Green
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor Yellow
Write-Host "  API:      http://localhost:3001/api" -ForegroundColor Yellow
Write-Host "  Health:   http://localhost:3001/api/health" -ForegroundColor Yellow
Write-Host ""

npm run dev:all
