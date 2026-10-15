# Security

## Controls in the pipeline

| Layer | Tool | Blocks the pipeline? |
|---|---|---|
| SAST — our source code | GitHub CodeQL (Python + JavaScript) | Findings appear in **Security → Code scanning** |
| SCA — our dependencies | `pip-audit`, `npm audit --audit-level=high` | Yes, on any known vulnerable package |
| Secret scanning | Gitleaks over the full Git history + GitHub secret scanning / push protection | Yes, on any detected secret |
| IaC misconfiguration | `trivy config` on Terraform, Helm and Dockerfiles | Report only |
| Container images | `trivy image --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1` | Yes: nothing is pushed to GHCR |
| Runtime hardening | Non-root containers, dropped capabilities, no privilege escalation, resource limits | Enforced in the Helm chart |

## Secrets

- No real credentials are committed. `.env`, `*.tfvars` and Terraform state are git-ignored.
- The demo database password lives in a Kubernetes `Secret` that the Helm chart renders. For a real
  environment, override it at deploy time (`--set postgres.password=...`) or use an external secret manager.
- CI uses only the built-in `GITHUB_TOKEN`.

## If a secret leaks

Revoke or rotate it first, remove it from the code and history, check for unauthorised use, then store
the replacement in a secret manager. Deleting the line is not enough.

## Reporting a vulnerability

Open a private security advisory on this repository (**Security → Advisories → Report a vulnerability**).
