# IPCN monthly automation runbook

## Operating contract

The task `LAZA IPCN Monthly Pipeline` runs daily at 09:15 under the interactive
Windows user with a hidden PowerShell window. It checks the official INE IPCN
listing and exits without downloading or writing data when the portal period is
not newer than the current Silver maximum.

The first eligible publication must be exactly one month after the current
maximum. A gap, duplicate, non-PDF download, invalid hash, missing table row or
homologue difference above 0.01 percentage point stops the pipeline before
publication.

## Successful monthly path

1. Crawl the official IPCN listing pages and select the latest dated edition.
2. Read the publication detail page and select its primary official PDF.
3. Download to `D:\LAZA_DATA\landing\ine\inflation` and validate `%PDF-`.
4. Extract the latest index and YoY row from the official table.
5. Reconcile headline, table and `(index_t / index_t-12 - 1) * 100`.
6. Capture SHA-256 and archive the exact PDF.
7. Execute `control.usp_publish_ipcn_month` for Bronze, Silver, DQ, approval and Gold.
8. Write an incremental manifest and operational log.
9. The local API refreshes automatically after its 30-second cache expires.

## Commands

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\ipcn\Invoke-LazaIpcnPipeline.ps1 -Mode Discover
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\ipcn\Invoke-LazaIpcnPipeline.ps1 -Mode Run
sqlcmd.exe -S .\SQLEXPRESS -E -C -b -i .\database\sqlserver\20_simulate_ipcn_incremental_67_rollback.sql
```

## Validation snapshot - 2026-07-16

- Portal maximum: 2026-06.
- Database maximum: 2026-06.
- Scheduled execution result: `0`, `NO_NEW_DATA`.
- Next scheduled check: 2026-07-17 09:15 Europe/Lisbon.
- Synthetic transaction reached 67 Silver and 67 Gold rows.
- Simulation rollback restored 66 Silver and 66 Gold rows.
- Persistent synthetic rows and incremental pipeline runs: zero.
