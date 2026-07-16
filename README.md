# LAZA Data Marketplace - staged MVP

This repository reuses the LAZA website and admin prototype as the starting
point for the executable MVP.

The website reads the latest indicator state from the local SQL Server Gold
view through a read-only local API. IPCN inflation is official and published;
the other five indicators remain clearly identified as demonstration values.

See [the indicator pilot plan](docs/indicator-pilot.md) for the staged path from
fixtures to reviewed files, API, automated pipelines and DQF publication.

## Local development

1. Install Node.js LTS.
2. Run `npm install`.
3. Confirm that `.\\SQLEXPRESS` and `LAZA_DATA_PLATFORM_DEV` are available.
4. Run `npm run dev`. This starts the local indicator API and Vite together.
5. Open the local URL printed by Vite.

The API health endpoint is `http://127.0.0.1:8790/health`. Override the defaults
with `LAZA_SQL_INSTANCE`, `LAZA_SQL_DATABASE`, `LAZA_SQLCMD` or `LAZA_API_PORT`
environment variables when needed.

Clicking the official inflation indicator loads its 66 published monthly
observations from `/api/indicators/inflation-rate/history`, with a trend chart,
exact-value table, quality scores and accepted-exception labels for 2021.

## Validation rule

Do not remove the demonstration-data label until the exact source asset,
reference period, extraction date and data-quality evidence are available.
