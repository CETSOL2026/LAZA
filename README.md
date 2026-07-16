# LAZA Data Marketplace - staged MVP

This repository reuses the LAZA website and admin prototype as the starting
point for the executable MVP.

The first increment centralizes six pilot indicators in
`src/app/data/indicators.ts` and exposes their definition, source, period, unit
and quality status in the website. The current values remain demonstration
fixtures until reviewed official source files are connected.

See [the indicator pilot plan](docs/indicator-pilot.md) for the staged path from
fixtures to reviewed files, API, automated pipelines and DQF publication.

## Local development

1. Install Node.js LTS.
2. Run `npm install`.
3. Run `npm run dev`.
4. Open the local URL printed by Vite.

## Validation rule

Do not remove the demonstration-data label until the exact source asset,
reference period, extraction date and data-quality evidence are available.
