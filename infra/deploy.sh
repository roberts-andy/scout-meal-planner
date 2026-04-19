#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Deploying Azure infrastructure..."
echo "================================="

az deployment sub create \
  --location centralus \
  --template-file "$SCRIPT_DIR/main.bicep" \
  --parameters "$SCRIPT_DIR/parameters.json" \
  --parameters sendGridEmail="$SENDGRID_EMAIL" \
               sendGridPassword="$SENDGRID_PASSWORD" \
               sendGridApiKey="$SENDGRID_API_KEY" \
  --name "scout-meal-planner-$(date +%Y%m%d%H%M%S)"

echo ""
echo "Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Get the SWA deployment token from the Azure Portal"
echo "   (Static Web App → Manage deployment token)"
echo "2. Add it as AZURE_STATIC_WEB_APPS_API_TOKEN in your GitHub repo secrets"
echo "3. Push to main to trigger the CI/CD pipeline"
