#!/usr/bin/env bash
# Prepares a kind cluster for HelpDesk: ingress-nginx + metrics-server (needed for HPA).
# Reuses the cluster if it already exists. Usage: CLUSTER=project-cluster ./scripts/kind-up.sh
set -euo pipefail
cd "$(dirname "$0")/.."
CLUSTER="${CLUSTER:-project-cluster}"

if ! kind get clusters | grep -qx "$CLUSTER"; then
  kind create cluster --name "$CLUSTER" --config k8s/kind-config.yaml
fi
kubectl config use-context "kind-$CLUSTER"

echo ">> Installing ingress-nginx (kind flavour)"
# The kind manifest only schedules on nodes labelled ingress-ready=true
kubectl label node --all ingress-ready=true --overwrite
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
kubectl wait -n ingress-nginx --for=condition=ready pod -l app.kubernetes.io/component=controller --timeout=300s

echo ">> Installing metrics-server"
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
# kind kubelets use self-signed certs
kubectl patch -n kube-system deployment metrics-server --type=json \
  -p='[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--kubelet-insecure-tls"}]' || true
kubectl rollout status -n kube-system deployment/metrics-server --timeout=180s

kubectl apply -f k8s/namespace.yaml
echo ">> Cluster ready"
kubectl get nodes
