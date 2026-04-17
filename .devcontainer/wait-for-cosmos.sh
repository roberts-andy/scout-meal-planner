#!/bin/bash
# Wait for the Cosmos DB emulator to become ready and install its TLS certificate.
# Runs as postStartCommand in the devcontainer.

set -e

EMULATOR_HOST="cosmos"
EMULATOR_PORT="8081"
CERT_URL="https://${EMULATOR_HOST}:${EMULATOR_PORT}/_explorer/emulator.pem"
MAX_RETRIES=30
RETRY_INTERVAL=5

echo "Waiting for Cosmos DB emulator at ${EMULATOR_HOST}:${EMULATOR_PORT}..."

for i in $(seq 1 $MAX_RETRIES); do
  if curl -sfk "$CERT_URL" -o /dev/null 2>/dev/null; then
    echo "Cosmos DB emulator is ready."

    # Import the emulator's self-signed certificate into the system trust store
    sudo curl -sfk "$CERT_URL" -o /usr/local/share/ca-certificates/cosmos-emulator.crt
    sudo update-ca-certificates

    echo "Emulator TLS certificate installed."
    exit 0
  fi
  echo "  Attempt $i/$MAX_RETRIES — emulator not ready yet, retrying in ${RETRY_INTERVAL}s..."
  sleep $RETRY_INTERVAL
done

echo "WARNING: Cosmos DB emulator did not become ready in time."
echo "         The app will still work (NODE_TLS_REJECT_UNAUTHORIZED=0 is set),"
echo "         but you may want to restart the Codespace if the emulator is stuck."
exit 0
