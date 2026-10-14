# Terraform — AWS VPC + EKS for HelpDesk

Infrastructure as Code for the production-style environment:

```text
AWS (ap-south-1)
 ├── VPC 10.20.0.0/16
 │    ├── 2 public subnets  (load balancers, NAT gateway)
 │    └── 2 private subnets (worker nodes)
 └── EKS cluster
      └── managed node group (t3.medium x2)
```

> **Cost warning:** EKS (~$0.10/h) + NAT gateway (~$0.045/h) + EC2 nodes cost money.
> In this course the app runs on a local kind cluster; these files are validated, not applied.

```bash
terraform init            # download providers + modules
terraform fmt -recursive  # format
terraform validate        # syntax + type check (no AWS account needed)
terraform plan            # needs AWS credentials; creates nothing
# terraform apply         # would create real (billable) infrastructure
# aws eks update-kubeconfig --region ap-south-1 --name helpdesk-dev-eks
# terraform destroy       # always destroy after a real apply
```
