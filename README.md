# LAZA Data Marketplace - staged MVP

This repository reuses the LAZA website and admin prototype as the starting
point for the executable MVP.

The website reads the latest indicator state from the local SQL Server Gold
view through a read-only local API. All six core indicators (GDP growth,
inflation, exchange rate, population, banking assets and public debt/GDP) plus
the three advanced analytics products (Oil & Gas, Fiscal Execution and
Sovereign Yield Curve) are official and published.

See [the indicator pilot plan](docs/indicator-pilot.md) for the staged path
already completed, from fixtures to reviewed files, API, automated pipelines
and DQF publication.

Open work, priorities and pending decisions are maintained in the
[MVP backlog](docs/BACKLOG.md).

## Local development

1. Install Node.js LTS.
2. Run `npm install`.
3. Confirm that `.\\SQLEXPRESS` and `LAZA_DATA_PLATFORM_DEV` are available.
4. Run `npm run dev`. This starts the local indicator API and Vite together.
5. Open the local URL printed by Vite.

The API health endpoint is `http://127.0.0.1:8790/health`. Override the defaults
with `LAZA_SQL_INSTANCE`, `LAZA_SQL_DATABASE`, `LAZA_SQLCMD` or `LAZA_API_PORT`
environment variables when needed.

Run `npm test` to run the API contract test suite (`server/test/`) against the
same local SQL Server instance. It spawns its own copy of the API on a
separate port, so it does not disturb an already-running dev or production
instance.

Clicking the official inflation indicator loads its 66 published monthly
observations from `/api/indicators/inflation-rate/history`, with a trend chart,
exact-value table, quality scores and accepted-exception labels for 2021.

The Admin Panel (`/admin`) is protected by server-side credential validation;
see [docs/ADMIN_ACCESS.md](docs/ADMIN_ACCESS.md) for access and credential
rotation.

## Windows production autostart

The official local autostart mechanism for the production MVP is a Windows
Scheduled Task named `LAZA Production Site`.

The task runs at logon for the current Windows user and calls the governed
startup script directly:

```text
scripts\start-laza-production.ps1
```

The task action uses Windows PowerShell with `-NoProfile`, `-NonInteractive`,
`-WindowStyle Hidden` and `-ExecutionPolicy Bypass`, with the repository root as
the explicit working directory. The PowerShell startup script is idempotent: it
checks `http://127.0.0.1:8790/health` first and exits without starting another
Node.js process when the LAZA API is already healthy.

Install or refresh the task from the repository root:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File .\scripts\install-laza-autostart.ps1
```

Remove only the official LAZA autostart task:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File .\scripts\uninstall-laza-autostart.ps1
```

Health check:

```powershell
Invoke-RestMethod -Uri 'http://127.0.0.1:8790/health'
```

Diagnostics:

```powershell
Get-ScheduledTask -TaskName 'LAZA Production Site'
Get-ScheduledTaskInfo -TaskName 'LAZA Production Site'
Get-NetTCPConnection -LocalPort 8790 -State Listen
Get-CimInstance Win32_Process |
  Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -like '*indicator-api.mjs*' }
```

Rollback:

1. Run `.\scripts\uninstall-laza-autostart.ps1`.
2. Restore any previous Startup-folder launcher from the operational backup, if
   required.
3. Start LAZA manually with `.\scripts\start-laza-production.ps1`.

The previous Startup-folder launcher is not the official mechanism. During the
autostart migration it should be backed up outside the repository before being
removed from the Startup folder, so only one LAZA autostart mechanism remains
active.

## Monthly IPCN automation

Run discovery without writes:

```powershell
.\scripts\ipcn\Invoke-LazaIpcnPipeline.ps1 -Mode Discover
```

Run the guarded incremental pipeline:

```powershell
.\scripts\ipcn\Invoke-LazaIpcnPipeline.ps1 -Mode Run
```

The scheduled task checks the official INE portal daily at 09:15. It writes
nothing when the portal period is not newer than Gold, and only publishes the
single next consecutive month after PDF signature, SHA-256, headline/table and
homologue reconciliation checks pass.

## Validation rule for new indicators

Do not remove a new indicator's demonstration-data label until the exact
source asset, reference period, extraction date and data-quality evidence are
available. See the publication states in
[docs/sqlserver-data-model.md](docs/sqlserver-data-model.md).
