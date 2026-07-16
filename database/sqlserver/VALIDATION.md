# Static validation record

Validation date: 2026-07-16

## Scope

The approval package was validated without creating the proposed database or
executing any DDL/DML statement.

## Results

| Check | Result |
| --- | --- |
| SQL scripts analyzed | 11 |
| SQL Server `PARSEONLY` syntax analysis | Passed for all 11 scripts |
| Proposed database after validation | `NOT_CREATED` |
| Duplicate constraint names | None found |
| Pilot indicator IDs | All six match `src/app/data/indicators.ts` |
| Server login or database user creation | None |
| Normal execution order includes rollback | No |
| Demo publication guardrail | `DEMONSTRATION` and `is_official = 0` |
| Official Gold publication gate | Trigger requires source evidence, passed DQ and latest official approval |
| Whitespace/error check | Passed |

## Proposed object inventory

| Object type | Count |
| --- | ---: |
| Schemas | 8 |
| Database roles | 4 |
| Tables | 28 |
| API views | 1 |
| Publication triggers | 1 |

## Validation method and limitation

Because `LAZA_DATA_PLATFORM_DEV` intentionally does not exist, the syntax pass
replaced its `USE` statement with `master` **in memory only** and enabled
`SET PARSEONLY ON`. SQL Server parsed every batch but executed no creation,
insert, update, alter or drop statement.

`PARSEONLY` validates T-SQL syntax, not runtime object resolution or business
results. After approval, deployment must therefore remain staged: run the
read-only preflight, execute one numbered script at a time, and run the
read-only validation queries after the controlled demo seed.

## Deployment validation

Deployment completed on 2026-07-16 against `.\SQLEXPRESS` after explicit user
approval. Script `99_rollback.sql` was not executed.

| Runtime check | Result |
| --- | --- |
| Database | `LAZA_DATA_PLATFORM_DEV`, ONLINE, SIMPLE, compatibility 160 |
| Allocated database size | 80 MB |
| Bronze raw observations | 6 |
| Silver observations | 6 |
| DQ results | 18: 12 PASS and 6 expected provenance WARN |
| DQ demo approvals | 6 |
| Gold facts | 6 |
| API latest rows | 6 |
| Official rows | 0 |
| Demo rows correctly labelled | 6 |
| Publication guardrail violations | 0 |
| Gold publication trigger | Enabled |
| LAZA role members | 0 |
| Pipeline run | `SUCCEEDED` |

The expected six warnings are from `OFFICIAL_SOURCE_EVIDENCE`: the prototype
homepages are not exact official source assets. This is intentional and blocks
promotion of the demo values to official publication.
