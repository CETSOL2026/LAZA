# LAZA SQL Server backup record

## Initial baseline

| Field | Value |
| --- | --- |
| Database | `LAZA_DATA_PLATFORM_DEV` |
| Instance | `.\SQLEXPRESS` |
| Backup type | Full, `COPY_ONLY` |
| Started / finished | 2026-07-16 12:49:08 |
| SQL backup size | 8.40 MB |
| Physical file size | 8,835,072 bytes |
| Checksum | Enabled |
| Verification | `RESTORE VERIFYONLY ... WITH CHECKSUM` passed |
| File | `C:\Program Files\Microsoft SQL Server\MSSQL16.SQLEXPRESS\MSSQL\Backup\LAZA_DATA_PLATFORM_DEV_INITIAL_20260716_124908.bak` |

This backup is the post-deployment baseline containing the medallion schemas
and the six non-official demonstration observations. It does not establish a
recurring backup policy.

## Restore guardrail

Do not restore over the active database without a separate restore plan,
explicit approval, a target-path review and confirmation of the desired point
in time.

