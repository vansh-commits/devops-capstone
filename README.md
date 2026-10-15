# HelpDesk — DevOps Capstone

**HelpDesk** is a customer-support ticketing app. Support agents log tickets from customers, set a
priority (Low → Urgent) and category (Bug, Billing, Access, Other), move them through
`Open → In progress → Resolved → Closed`, and watch live KPIs (open, in-progress, resolved, urgent).

The point of the project is the delivery path: the same app runs on a laptop with Docker, is tested and
security-scanned in GitHub Actions, published to GHCR, deployed to Kubernetes with Helm (Ingress, HPA,
Prometheus/Grafana) and kept in sync by Argo CD (GitOps). Terraform describes the AWS VPC + EKS target.

```text
Developer ── git push ──► GitHub Actions
                            ├─ pytest + coverage, React build
                            ├─ SAST  (CodeQL)
                            ├─ SCA   (pip-audit, npm audit)
                            ├─ Secret scan (Gitleaks)
                            ├─ IaC scan (Trivy config) + terraform validate
                            ├─ Docker build ─► Trivy image scan (HIGH/CRITICAL gate)
                            ├─ push ghcr.io/<user>/helpdesk-{backend,frontend}:<git-sha>
                            ├─ deploy to throwaway kind cluster (helm --wait + smoke test)
                            └─ bump image tag in helm/helpdesk/values-gitops.yaml
                                              │
                                              ▼
                     Argo CD (local kind) ── syncs ──► Kubernetes
                                                         ├─ frontend (React + Nginx) x2
                                                         ├─ backend  (FastAPI) x2..5 (HPA)
                                                         ├─ PostgreSQL StatefulSet + PVC
                                                         ├─ Ingress  helpdesk.local  (/ → UI, /api → API)
                                                         └─ ServiceMonitor ─► Prometheus ─► Grafana
Terraform ─► AWS VPC (2 public + 2 private subnets, NAT) + EKS managed node group
```

## Tech stack

| Layer | Tools |
|---|---|
| Frontend | React 19 + Vite, responsive CSS (desktop / tablet / phone), served by unprivileged Nginx |
| Backend | FastAPI, SQLAlchemy 2, Alembic, Pydantic validation, Prometheus instrumentator |
| Database | PostgreSQL 16 |
| Tests | Pytest + pytest-cov against an isolated SQLite DB (13 tests) |
| Containers | Multi-stage Dockerfiles, non-root users, Docker Compose |
| CI/CD | GitHub Actions, GHCR, commit-SHA image tags |
| Security | CodeQL (SAST), pip-audit + npm audit (SCA), Gitleaks (secrets), Trivy (images + IaC) |
| IaC | Terraform (terraform-aws-modules VPC + EKS) |
| Kubernetes | kind, Helm, ingress-nginx, HPA + metrics-server, ConfigMap/Secret, probes |
| Observability | kube-prometheus-stack (Prometheus + Grafana), custom dashboard |
| GitOps | Argo CD |

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness: process is up |
| GET | `/ready` | Readiness: database reachable |
| GET | `/metrics` | Prometheus metrics |
| GET | `/api/tickets?status=&priority=` | List / filter tickets |
| GET | `/api/tickets/stats` | KPI counts |
| GET | `/api/tickets/{id}` | One ticket |
| POST | `/api/tickets` | Create ticket |
| PUT | `/api/tickets/{id}` | Update ticket |
| DELETE | `/api/tickets/{id}` | Delete ticket |

Swagger UI: `http://localhost:8000/docs`

## Repository layout

```text
backend/            FastAPI app, Alembic migrations, pytest suite, Dockerfile
frontend/           React app, Nginx template, multi-stage Dockerfile
docker-compose.yml  Full local stack (postgres + backend + frontend)
.github/workflows/  DevSecOps CI/CD pipeline
helm/helpdesk/      Helm chart (values.yaml, values-dev.yaml for kind, values-gitops.yaml for Argo CD)
k8s/                Namespace + kind cluster config
argocd/             Argo CD Application
monitoring/         kube-prometheus-stack values + Grafana dashboard
terraform/          AWS VPC + EKS (validate/plan only in this course)
troubleshooting/    Deliberately broken manifests (ImagePull, Service, CrashLoop, Pending)
scripts/            kind bootstrap + HPA load generator
```

## Quick start

```bash
docker compose up --build        # UI http://localhost:3000 · API http://localhost:8000/docs
cd backend && pytest -v          # tests
```
