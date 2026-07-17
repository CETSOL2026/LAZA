# LAZA-033 - Google Cloud migration blueprint

> Status: completed blueprint. This document maps the current local MVP to a
> Google Cloud target architecture. It does not authorize migration, data copy,
> resource creation or operational cutover.

## Executive view

The current LAZA platform already follows a portable medallion architecture:
official source assets enter Bronze, normalized and quality-checked observations
move to Silver, and approved consumption facts are published to Gold. The Google
Cloud migration should preserve that contract and replace the local runtime
components progressively, not redesign the product from zero.

Recommended migration style: **strangler migration by indicator**. Move one
indicator end to end, reconcile it against SQL Server, then repeat by product
wave.

## Current local baseline

| Area | Current implementation | Migration implication |
| --- | --- | --- |
| Web app | React, Vite and Tailwind build served by the local Node API on `127.0.0.1:8790` | Can move to Firebase Hosting or Cloud Run without changing the user experience |
| API | Node.js read-only API using `sqlcmd.exe` against SQL Server | Needs a repository/data-access boundary before BigQuery becomes the source |
| Database | SQL Server Express database `LAZA_DATA_PLATFORM_DEV` | Maps naturally to BigQuery datasets by layer |
| Bronze files | Local governed archive under `D:\LAZA_DATA` | Maps to Cloud Storage buckets with retention and object versioning |
| Bronze/Silver/Gold | SQL Server schemas and tables | Maps to BigQuery datasets and tables |
| DQ and approvals | SQL Server `dq` schema and Gold publication gate | Maps to BigQuery DQ tables plus controlled publish jobs |
| Orchestration | PowerShell, Python, Node scripts and Windows Task Scheduler | Maps to Cloud Scheduler, Cloud Run Jobs and Workflows |
| Admin auth | Local username/password with HttpOnly session | Needs cloud identity integration before public production use |
| Observability | Local service checks and future backlog logging | Maps to Cloud Logging, Error Reporting, Monitoring and alert policies |

## Target Google Cloud architecture

| Current layer or service | Google Cloud target | Notes |
| --- | --- | --- |
| `D:\LAZA_DATA\landing` | Cloud Storage `laza-<env>-landing` | Temporary source drop zone; short retention |
| `D:\LAZA_DATA\archive` | Cloud Storage `laza-<env>-bronze-assets` | Immutable official source archive with object versioning |
| `D:\LAZA_DATA\rejected` | Cloud Storage `laza-<env>-rejected` | Failed payloads, parsing errors and rejected extracts |
| `D:\LAZA_DATA\manifests` | Cloud Storage `laza-<env>-manifests` and BigQuery control tables | Keep file manifests and load audit side by side |
| SQL Server `control` | BigQuery dataset `control` | Pipeline definitions, runs, batches and operational state |
| SQL Server `audit` | BigQuery dataset `audit` | Append-only events and rejected-record metadata |
| SQL Server `reference` | BigQuery dataset `reference` | Sources, units, geographies, frequencies and controlled vocabularies |
| SQL Server `bronze` | BigQuery dataset `bronze` | Raw records; source files remain in Cloud Storage |
| SQL Server `silver` | BigQuery dataset `silver` | Canonical observations and series definitions |
| SQL Server `dq` | BigQuery dataset `dq` | Rules, executions, exceptions, approvals and scores |
| SQL Server `gold` | BigQuery dataset `gold` | Consumption facts and dimensions |
| SQL Server `api` views | BigQuery views or materialized views | Stable read contract for the API |
| `server/indicator-api.mjs` | Cloud Run service | Public/private API, health checks and download endpoints |
| `npm run build` output | Firebase Hosting or Cloud Run static serving | Firebase Hosting is cleaner for static web; Cloud Run is simpler if API and web stay together |
| Scheduled scripts | Cloud Run Jobs + Cloud Scheduler | One job per official-source family or per product group |
| Cross-step orchestration | Workflows | Use when extraction, DQ, approval and publication must run as a controlled chain |
| Secrets and credentials | Secret Manager | No secrets in `.env`, scripts or repository |
| Admin access | Identity Platform, IAP or IAM-based admin | Prefer Cloudflare Access only for external perimeter; use Google identity for admin authorization |
| Logs and metrics | Cloud Logging and Cloud Monitoring | Alert on failed jobs, stale indicators, missing files and API errors |

## Medallion data model mapping

| Local schema | BigQuery dataset | Storage principle | Partition and clustering suggestion |
| --- | --- | --- | --- |
| `control` | `control` | Operational metadata | Partition pipeline runs by start date; cluster by pipeline code |
| `audit` | `audit` | Append-only events | Partition by event timestamp; cluster by severity and pipeline |
| `reference` | `reference` | Small governed dimensions | No partition required |
| `bronze` | `bronze` | Raw source records and lineage | Partition by ingestion date; cluster by source and indicator |
| `silver` | `silver` | Canonical, versioned observations | Partition by reference period start or load date; cluster by indicator and series |
| `dq` | `dq` | Rule evidence, approvals and exceptions | Partition by execution date; cluster by indicator and rule |
| `gold` | `gold` | Curated consumption facts | Partition by reference period; cluster by indicator, source and geography |
| `api` | `api` views | Consumer contract | Views should hide physical table changes from the app |

## Pipeline pattern

1. Extract official source into Cloud Run Job.
2. Store original file or response in Cloud Storage Bronze asset bucket.
3. Register source asset and raw observations in BigQuery Bronze.
4. Normalize into BigQuery Silver using SQL, Dataform or a controlled job.
5. Execute DQ rules and write results to the `dq` dataset.
6. Require explicit approval or approved exception for official Gold publication.
7. Publish to BigQuery Gold through a controlled publish job.
8. Expose only Gold/API views to the Node API and website.

Dataform is the preferred fit for repeatable SQL transformations, dependencies,
tests and documentation. Cloud Run Jobs remain better for PDF/HTML extraction,
API calls, hashing and file handling.

## Application changes required before migration

| Area | Required change | Why |
| --- | --- | --- |
| API data access | Introduce a repository interface for indicators, analytics, downloads and admin layers | Allows SQL Server and BigQuery providers to coexist during transition |
| Configuration | Extend `config/data-platform.example.json` with provider, project, datasets and buckets | Avoid hardcoded local paths and database names |
| Downloads | Resolve files from either local archive or Cloud Storage | Preserves marketplace behavior during hybrid phase |
| Admin sessions | Replace in-memory sessions for cloud production | Cloud Run instances are stateless and can scale horizontally |
| Auth | Move admin identity to IAP, Identity Platform or another approved identity provider | Reduces risk before public exposure |
| Tests | Add provider contract tests with fixed fixture data | Confirms SQL Server and BigQuery return the same business contract |
| Observability | Add structured logs with correlation IDs for API and pipelines | Makes cloud operations auditable |

## Recommended environments

| Environment | Purpose | Data policy |
| --- | --- | --- |
| `dev` | Developer validation and first BigQuery provider work | Masked or limited official extracts |
| `hml` | Business validation and Cloudflare/IAP access testing | Full MVP dataset, controlled access |
| `prd` | Public or restricted production | Approved official data only |

Use separate projects per environment if governance and budget allow it. If a
single project is required for the MVP, use strict naming, IAM separation and
dataset-level permissions.

## IAM model

| Principal | Minimum access |
| --- | --- |
| Extraction job service account | Read external source when needed; write landing/archive buckets; write Bronze/control/audit |
| Transformation job service account | Read Bronze/reference; write Silver/DQ/control/audit |
| Publication job service account | Read Silver/DQ/reference; write Gold; no direct Bronze mutation |
| API service account | Read API views, Gold and approved marketplace metadata only |
| Admin users | Access admin UI and approval workflows according to role |
| Data stewards | Maintain reference data, methodology and approvals |

## First proof of portability

Recommended candidate: **IPCN inflation**.

Reason: it already has the strongest governed trail in the MVP: official source
archive, 66 monthly observations, DQ exceptions for 2021, approval evidence and
Gold publication. It is also complex enough to prove the model but not as wide
as Oil & Gas.

Acceptance for LAZA-035:

- same 66 published months as SQL Server;
- same latest value, period, unit and source;
- same DQ exception count and approval status;
- same API response shape consumed by the site;
- reconciliation report shows 100% match for period/value/source/status.

## Migration waves

| Wave | Scope | Exit criterion |
| --- | --- | --- |
| 0 | LAZA-033 blueprint and decisions | Architecture mapping approved |
| 1 | Infrastructure baseline | DEV/HML/PRD or MVP project available through IaC |
| 2 | IPCN portability proof | One indicator reconciles 100% against SQL Server |
| 3 | Six pilot indicators | All cards and details run from Google data provider in HML |
| 4 | Three advanced analytics | Oil & Gas, Fiscal Execution and Sovereign Curve reconciled |
| 5 | Production cutover | Site/API switched, rollback tested and SQL Server retained read-only for agreed period |

## Decisions still required

1. Confirm the Google landing zone: project structure, billing account and regions.
2. Choose hosting target: Firebase Hosting plus Cloud Run API, or Cloud Run for both.
3. Choose transformation engine: Dataform first, or Cloud Run Jobs plus SQL scripts.
4. Define retention for Bronze assets, logs, rejected payloads and backups.
5. Define admin identity provider and access model.
6. Decide whether LAZA-035 belongs to the current MVP or the next phase.

## Recommendation

Proceed with **LAZA-034** only after the landing zone is confirmed. In parallel,
prepare the codebase by adding the API repository abstraction and cloud-ready
configuration, because those changes reduce migration risk without creating
Google resources yet.
