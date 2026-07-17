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
