#!/bin/bash
# Wait for E2E API server to be ready before starting Cypress tests
#
# This script polls the health endpoint until it responds with 200 OK,
# ensuring the Rails API is fully booted before E2E tests begin.
#
# Usage:
#   bash scripts/wait-for-api.sh
#
# Environment Variables:
#   E2E_API_URL: Base URL for E2E API (default: http://localhost:3002)
#
# Exit Codes:
#   0: Success - API is ready
#   1: Failure - API failed to start after max attempts

set -e

API_URL="${E2E_API_URL:-http://localhost:3002}"
MAX_ATTEMPTS=30
SLEEP_SECONDS=2

echo "🔍 Waiting for E2E API at $API_URL/api/health..."

for i in $(seq 1 $MAX_ATTEMPTS); do
  if curl -sf "$API_URL/api/health" > /dev/null 2>&1; then
    echo "✅ E2E API ready (attempt $i/$MAX_ATTEMPTS)"
    exit 0
  fi

  echo "⏳ Attempt $i/$MAX_ATTEMPTS failed, retrying in ${SLEEP_SECONDS}s..."
  sleep $SLEEP_SECONDS
done

echo "❌ E2E API failed to start after $MAX_ATTEMPTS attempts ($(($MAX_ATTEMPTS * $SLEEP_SECONDS))s timeout)"
exit 1
