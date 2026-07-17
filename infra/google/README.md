# LAZA Google Cloud infrastructure

This folder contains the LAZA-034 Terraform scaffold for the Google Cloud
foundation. It is intentionally parameterized and safe to commit: it contains no
project secrets, credentials, state files or live resource identifiers.

## What this creates when applied

- Required Google Cloud APIs for the MVP foundation.
- Cloud Storage buckets for landing, Bronze archive, rejected payloads,
  manifests and logs.
- BigQuery datasets aligned to the local medallion model:
  `control`, `audit`, `reference`, `bronze`, `silver`, `dq`, `gold`, `api`.
- Service accounts for extraction, transformation, publication and API runtime.
- Baseline IAM bindings for BigQuery jobs, datasets and storage access.

Cloud Run services, scheduler jobs, Dataform repositories and alert policies are
left as follow-up resources once image names, schedules, identity provider and
operational thresholds are approved.

## Environment files

Copy an example file before use:

```powershell
Copy-Item infra\google\envs\dev.tfvars.example infra\google\envs\dev.tfvars
```

Do not commit real `.tfvars` files if they contain project-specific or
restricted values.

## Suggested workflow

```powershell
cd infra\google
terraform init
terraform fmt -recursive
terraform validate
terraform plan -var-file=envs\dev.tfvars
```

Only run `terraform apply` after the Google landing zone, IAM ownership and
state backend are approved.

## Remote state

Configure a Google Cloud Storage backend after the landing zone is confirmed.
Example:

```hcl
terraform {
  backend "gcs" {
    bucket = "laza-terraform-state-<landing-zone>"
    prefix = "laza/dev"
  }
}
```

Keep backend configuration outside this scaffold until the official state bucket
name is known.
