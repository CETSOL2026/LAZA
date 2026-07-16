# LAZA SQL Server approval package

> **Do not execute before approval.** These scripts have not been run against
> the local SQL Server instance.

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

Scripts that create or use the database are intentionally not invoked by this
package. The exact post-approval command sequence will be recorded in the
deployment log.

## Design reference

See [`docs/sqlserver-data-model.md`](../../docs/sqlserver-data-model.md) for
grains, publication states, security roles and approval decisions.

See [`VALIDATION.md`](VALIDATION.md) for the non-executing syntax validation and
its limitations.

See [`BACKUP.md`](BACKUP.md) for the verified initial `COPY_ONLY` baseline.
