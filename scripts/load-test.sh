#!/usr/bin/env bash
# HPA load generator: 20 parallel curl workers hammering the API. Ctrl+C to stop.
# Usage: ./scripts/load-test.sh [url] [workers]
set -euo pipefail

TARGET_URL="${1:-http://helpdesk.local:8081/api/tickets/stats}"
WORKERS="${2:-20}"

echo "Generating load on $TARGET_URL with $WORKERS workers. Press Ctrl+C to stop."
echo "In another terminal: kubectl get hpa -n helpdesk -w"

trap 'kill 0' INT TERM
for _ in $(seq "$WORKERS"); do
  while true; do curl -s -o /dev/null "$TARGET_URL" || true; done &
done
wait
