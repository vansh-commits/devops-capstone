#!/usr/bin/env bash
# Installs ingress-nginx and metrics-server (needed for HPA) into an existing kind cluster.
# Usage: ./scripts/cluster-addons.sh [cluster-name]   (default: project-cluster)
set -euo pipefail
cd "$(dirname "$0")/.."
CLUSTER="${1:-project-cluster}"

kubectl config use-context "kind-$CLUSTER"

echo ">> Installing ingress-nginx (kind flavour)"
# The kind manifest schedules the controller on nodes labelled ingress-ready=true
kubectl label node "$CLUSTER-control-plane" ingress-ready=true --overwrite
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
kubectl wait -n ingress-nginx --for=condition=ready pod -l app.kubernetes.io/component=controller --timeout=300s

echo ">> Installing metrics-server"
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
# kind kubelets use self-signed certs
kubectl patch -n kube-system deployment metrics-server --type=json \
  -p='[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--kubelet-insecure-tls"}]'
kubectl rollout status -n kube-system deployment/metrics-server --timeout=300s

kubectl apply -f k8s/namespace.yaml
echo ">> Add-ons ready"
kubectl get nodes
