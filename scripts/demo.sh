#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# STEM Agent — Demo Script
#
# Starts the full stack via docker-compose, waits for services to be healthy,
# then runs a sample task against the agent's REST API.
#
# Usage:
#   ./scripts/demo.sh
# ---------------------------------------------------------------------------
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "=== STEM Agent Demo ==="
echo ""

# 1. Start services
echo "[1/4] Starting services via docker compose..."
docker compose up -d --build

# 2. Wait for health
echo "[2/4] Waiting for services to become healthy..."
MAX_WAIT=60
WAITED=0
until docker compose ps --format json 2>/dev/null | grep -q '"Health":"healthy"' || [ "$WAITED" -ge "$MAX_WAIT" ]; do
  sleep 2
  WAITED=$((WAITED + 2))
  printf "  ... waited %ds\n" "$WAITED"
done

if [ "$WAITED" -ge "$MAX_WAIT" ]; then
  echo "WARNING: Timed out waiting for services. Continuing anyway..."
fi

echo ""
docker compose ps
echo ""

# 3. Run sample task
AGENT_URL="${STEM_AGENT_URL:-http://localhost:8000}"

echo "[3/4] Fetching Agent Card..."
curl -s "${AGENT_URL}/.well-known/agent.json" | python3 -m json.tool 2>/dev/null || echo "(agent card not yet available)"
echo ""

echo "[4/4] Sending sample task..."
RESPONSE=$(curl -s -X POST "${AGENT_URL}/api/v1/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello! What can you do?", "caller_id": "demo-user"}' 2>/dev/null || echo '{"error": "agent not yet responding"}')

echo "Response:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"

echo ""
echo "=== Demo Complete ==="
echo ""
echo "Next steps:"
echo "  - Open http://localhost:8000/.well-known/agent.json for the Agent Card"
echo "  - Open packages/caller-layer/src/human/dashboard/index.html in a browser"
echo "  - Run: npx tsx packages/caller-layer/src/human/cli.ts"
echo "  - Stop: docker compose down"
