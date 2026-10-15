#!/usr/bin/env bash
# Deploys all four broken workloads into the helpdesk namespace. Clean up with: ./triage_all.sh cleanup
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "${1:-}" == "cleanup" ]]; then
  kubectl delete -f "$DIR" --ignore-not-found
  exit 0
fi

kubectl apply -f "$DIR/broken-image.yaml" -f "$DIR/broken-service.yaml" \
  -f "$DIR/crashloop-bad-db.yaml" -f "$DIR/pending-huge-request.yaml"
echo "Waiting 30s for failures to show up..."
sleep 30
kubectl get pods -n helpdesk -l tier=troubleshooting
kubectl get endpointslices -n helpdesk -l kubernetes.io/service-name=broken-service
