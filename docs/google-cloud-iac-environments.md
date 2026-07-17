# LAZA-034 - Google Cloud IaC and environments

> Status: implementation-ready draft. This document defines the infrastructure
> as code baseline and environment model for LAZA on Google Cloud. It does not
> create resources, move data or authorize cutover.

## Objective

Define a reproducible Google Cloud foundation for the LAZA data platform, with
separate DEV, HML and PRD configurations. The baseline must preserve the
Bronze, Silver and Gold contract defined in LAZA-033 and prepare the project for
the LAZA-035 portability proof.

## IaC decision

| Decision | Proposed value | Rationale |
| --- | --- | --- |
| IaC tool | Terraform | Mature Google Cloud provider, strong review workflow and easy separation of environment variables |
| Scope | Project services, Cloud Storage, BigQuery, service accounts, IAM, Cloud Run placeholders and secrets placeholders | Covers the foundation without coupling the first version to every pipeline detail |
| State backend | Google Cloud Storage bucket per landing zone | Keeps state outside developer machines and enables reviewable changes |
| Environments | `dev`, `hml`, `prd` | Mirrors normal delivery flow and separates data/control boundaries |
| Naming | `laza-<env>-<resource>-<project_id>` where global uniqueness is required | Keeps resources recognizable and avoids bucket-name collisions |
| Region | Parameterized, default candidate `europe-west1` | Final region must be confirmed by the landing-zone owner |

## Environment model

| Environment | Purpose | Data policy | Access posture | Promotion rule |
| --- | --- | --- | --- | --- |
| `dev` | Engineering validation and provider development | Limited official extracts or masked data | Small technical group | Changes can be fast, but must pass Terraform plan review |
| `hml` | Business validation, Cloudflare/IAP testing and LAZA-035 reconciliation | Full MVP dataset, controlled access | Product owner, data steward and technical reviewers | Only promoted from reviewed DEV changes |
| `prd` | Production public or restricted service | Approved official data only | Least privilege; audited admin access | Only promoted after HML sign-off and rollback plan |

## Resource baseline

| Layer | Google Cloud resources | Notes |
| --- | --- | --- |
| Project services | Cloud Run, Artifact Registry, Cloud Build, BigQuery, Cloud Storage, Cloud Scheduler, Workflows, Secret Manager, Cloud Logging, Cloud Monitoring, IAM Credentials and Dataform | Enabled by Terraform before dependent resources |
| Bronze files | Cloud Storage buckets: landing, bronze-assets, rejected, manifests, logs | Archive and manifests use object versioning; landing/rejected/logs use lifecycle retention |
| Warehouse | BigQuery datasets: control, audit, reference, bronze, silver, dq, gold, api | Dataset names stay aligned with SQL Server schemas |
| Identity | Service accounts for extraction, transformation, publication and API | Separate accounts preserve segregation of duties |
| API runtime | Cloud Run placeholder variables | Service creation is controlled by image availability and deployment decision |
| Secrets | Secret Manager placeholders | Secret values are never committed to the repository |
| Observability | Logging and Monitoring APIs enabled; labels applied to resources | Alert policies are a follow-up once operational thresholds are approved |

## IAM principles

| Principal | Intended access |
| --- | --- |
| Extraction service account | Write landing/archive buckets and Bronze/control/audit datasets |
| Transformation service account | Read Bronze/reference and write Silver/DQ/control/audit |
| Publication service account | Read Silver/DQ/reference and write Gold/API views; no direct Bronze mutation |
| API service account | Read API views, Gold facts and approved marketplace metadata |
| Admin users | Access admin UI and approval workflows through the approved identity model |
| Data stewards | Maintain reference data, methodology, DQ exceptions and approvals |

The first Terraform scaffold uses conservative project and dataset IAM
placeholders. Before PRD, IAM must be tightened with dataset-level and
bucket-prefix-level permissions validated by the security owner.

## Repository layout

```text
infra/
  google/
    README.md
    versions.tf
    variables.tf
    main.tf
    outputs.tf
    envs/
      dev.tfvars.example
      hml.tfvars.example
      prd.tfvars.example
```

## Terraform workflow

1. Confirm landing-zone decisions: project IDs, billing, region, organization
   policies, state bucket and allowed identity model.
2. Copy one environment file, for example `dev.tfvars.example`, to a private
   `dev.tfvars` file outside commits or in an approved secure configuration
   repository.
3. Run `terraform init` with the approved remote backend.
4. Run `terraform fmt` and `terraform validate`.
5. Run `terraform plan -var-file=envs/dev.tfvars`.
6. Review resource names, IAM, lifecycle and labels.
7. Apply only after approval from the platform owner and data owner.
8. Promote the same module to HML and PRD using environment-specific variables.

## Required landing-zone decisions

| Decision | Needed for | Default in scaffold |
| --- | --- | --- |
| Google Cloud project IDs | All resources | Placeholder only |
| Billing account and folder/org | Project creation or project selection | Out of scope for this repo |
| Region | Cloud Run, Workflows, Scheduler and bucket location | `europe-west1` placeholder |
| State backend bucket | Terraform remote state | Placeholder in README |
| Hostname and perimeter | Public/private access model | Deferred to Cloudflare/IAP decision |
| Admin identity provider | Admin Panel authorization | Deferred to security decision |
| Retention policy | Bronze assets, rejected payloads and logs | Conservative defaults in tfvars examples |

## Definition of done for LAZA-034

- Terraform scaffold is versioned in the repository.
- DEV/HML/PRD variable examples exist with no secrets.
- BigQuery datasets match the local medallion schema names.
- Storage buckets cover landing, archive, rejected, manifests and logs.
- Service accounts are separated by pipeline responsibility.
- The backlog points to this document and the IaC scaffold.
- No Google resource is created from this task.

## Next step

LAZA-035 should use the IPCN indicator as the first portability proof after the
landing-zone values are confirmed and the DEV environment is applied.
