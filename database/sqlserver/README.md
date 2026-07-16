# LAZA SQL Server execution package

> The development database is deployed on the approved local SQL Server
> instance. Run each load script only once; its duplicate-series guard stops a
> second execution. Script `99_rollback.sql` still requires explicit approval.

## Proposed execution order

| Order | Script | Purpose | Destructive? |
| ---: | --- | --- | ---: |
| 0 | `00_preflight_readonly.sql` | Recheck instance, permissions and database-name availability | No |
| 1 | `01_create_database.sql` | Create the isolated development database | Creates database |
| 2 | `02_create_schemas_security.sql` | Create schemas and empty database roles | Creates objects |
| 3 | `03_create_control_audit.sql` | Create run, batch and audit structures | Creates objects |
| 4 | `04_create_reference_bronze.sql` | Create controlled vocabularies and immutable landing tables | Creates objects |
| 5 | `05_create_silver.sql` | Create canonical indicator, series and observation tables | Creates objects |
| 6 | `06_create_dq.sql` | Create data-quality rules, results and approval structures | Creates objects |
| 7 | `07_create_gold_api.sql` | Create curated dimensions, fact and API view | Creates objects |
| 8 | `08_seed_demo_indicators.sql` | Load the six prototype indicators as explicitly non-official DEMO data | Inserts demo data |
| 9 | `09_validation_readonly.sql` | Verify objects, counts, lineage and publication guardrails | No |
| 10 | `10_ingest_ine_ipcn_2026_06_bronze.sql` | Register the first official INE assets and one raw observation in Bronze | Inserts official Bronze data |
| 11 | `11_validate_ine_ipcn_2026_06_bronze.sql` | Validate the first official Bronze load and DEMO isolation | No |
| 12 | `12_finalize_ine_ipcn_2026_06_archive.sql` | Update Bronze lineage after verified files move to archive | Updates lineage paths |
| 13 | `13_transform_ine_ipcn_2021_2026_silver.sql` | Normalize 66 monthly IPCN YoY observations and execute completeness, uniqueness and homologue reconciliation DQ | Inserts validated Silver/DQ data; no Gold writes |
| 14 | `14_validate_ine_ipcn_2021_2026_silver.sql` | Read-only validation of the 66-month Silver load, DQ evidence and Gold isolation | No |
| 15 | `15_accept_ipcn_2021_reconciliation_exceptions.sql` | Record approved exceptions for the 12 unavailable 2020 comparisons and release 2021 Silver observations | Inserts governance evidence and updates Silver quality; no Gold writes |
| 16 | `16_validate_ipcn_2021_reconciliation_exceptions.sql` | Validate approved exceptions, preserved warnings and Gold isolation | No |
| 17 | `17_publish_ine_ipcn_2021_2026_gold.sql` | Approve the 66 official observations and publish the validated IPCN series to Gold | Inserts OFFICIAL approvals, updates Silver publication state and inserts Gold facts |
| 18 | `18_validate_ine_ipcn_gold_publication.sql` | Validate official Gold counts, lineage, scores and API latest result | No |
| 19 | `19_create_ipcn_incremental_procedure.sql` | Create the guarded one-month IPCN Bronze-to-Gold procedure | Creates or alters one stored procedure |
| 20 | `20_simulate_ipcn_incremental_67_rollback.sql` | Prove a synthetic 67th month through the complete pipeline and roll it back | No persistent changes |
| 21 | `21_create_bna_exchange_initial_procedure.sql` | Create the guarded BNA daily USD/AOA to monthly Gold initial-load procedure | Creates or alters one stored procedure |
| 22 | `22_load_ine_gdp_quarterly_2021_2026.sql` | Load the latest revised INE quarterly real-GDP YoY series for 2021-Q1 through 2026-Q1 | Inserts official Bronze, Silver, DQ and Gold data |
| 23 | `23_load_ine_population_census_2014_2024.sql` | Load definitive INE resident-population totals from the 2014 and 2024 censuses | Inserts official Bronze, Silver, DQ and Gold data |
| 24 | `24_load_bna_banking_assets_2021_2026.sql` | Load 65 monthly BNA other-depository-corporation total-asset balances for January 2021 through May 2026 | Inserts official Bronze, Silver, DQ and Gold data; marks 2026 preliminary |
| 25 | `25_load_ugd_public_debt_gdp_2025_2026.sql` | Load the published 2025 UGD Public Debt/GDP ratio and the transparently derived Q1 2026 ratio | Inserts official Bronze, Silver, DQ and Gold data; records one derivation warning |
| 26 | `26_load_anpg_oil_gas_production_2025_2026.sql` | Load 18 ANPG monthly oil, gas-allocation and Angola LNG publications for January 2025 through June 2026 | Inserts 18 Bronze assets and 252 official Silver/DQ/Gold observations; creates the analytical API view and records two accepted source exceptions |
| 27 | `27_load_minfin_fiscal_execution_2025_2026.sql` | Load official MINFIN quarterly budget execution from 2025 Q1 through 2026 Q1 | Inserts 5 Bronze PDF assets and 80 official Silver/DQ/Gold observations; creates the fiscal analytical API view and records three accepted source exceptions |
| 28 | `28_load_bodiva_sovereign_yield_curve_2025_2026.sql` | Load four official BODIVA kwanza sovereign-yield snapshots from February 2025 through June 2026 | Inserts 4 Bronze PDFs and 48 official Silver/DQ/Gold tenor observations; creates the curve analytical API view without interpolation |
| 99 | `99_rollback.sql` | Remove the entire POC database after explicit confirmation | **Yes** |

## Safety properties

- Scripts 01-08 stop if the target database is in an unexpected state.
- Creation scripts are rerunnable where practical.
- No server login is created and no existing database is modified.
- No raw file is stored as a SQL binary object.
- Demo records use `is_official = 0` and cannot masquerade as published data.
- The rollback requires a SQLCMD variable and an explicit confirmation value.

## Execution method after approval

Run from a terminal with Windows authentication, one script at a time, review
the output, and stop on the first error:

```powershell
sqlcmd.exe -S .\SQLEXPRESS -E -C -b -i .\database\sqlserver\00_preflight_readonly.sql
```

Review the output after every execution and stop on the first error. Each
official load uses a transaction and the Gold publication gate.

## Design reference

See [`docs/sqlserver-data-model.md`](../../docs/sqlserver-data-model.md) for
grains, publication states, security roles and approval decisions.

See [`VALIDATION.md`](VALIDATION.md) for the non-executing syntax validation and
its limitations.

See [`BACKUP.md`](BACKUP.md) for the verified initial `COPY_ONLY` baseline.

See [`LANDING.md`](LANDING.md) for the external landing, archive, rejected,
manifest and log contract.

The first acquired official-source evidence is recorded in
[`evidence/ine-ipcn-2026-06-manifest.json`](evidence/ine-ipcn-2026-06-manifest.json)
and its
[`quality assessment`](evidence/ine-ipcn-2026-06-quality-assessment.md).
