# LAZA indicator pilot

## Objective

Validate the LAZA website data flow with six indicators before investing in the
full marketplace platform. The user interface remains stable while the data
adapter evolves from controlled fixtures to official automated sources.

## Pilot indicators

| Indicator | Definition | Frequency | Initial source | Stage 1 status |
| --- | --- | --- | --- | --- |
| GDP Growth | YoY change in real quarterly GDP | Quarterly | INE | Official / published |
| Inflation Rate | YoY change in the national IPCN | Monthly | INE | Official / published |
| Exchange Rate | Monthly average AOA per USD reference rate | Monthly | BNA | Official / published |
| Population | Resident population counted at census moments | Decennial census | INE | Official / published |
| Banking Assets | Month-end total assets of other depository corporations | Monthly | BNA | Official / published; 2026 preliminary |
| Public Debt/GDP | Government debt plus unguaranteed public-enterprise debt as a share of nominal GDP | Annual / quarterly | UGD / MINFIN | Official / published; Q1 2026 derived from official components |

## Staged implementation

Stages 1 through 4 are complete for all six pilot indicators: they are served
from the automated Bronze/Silver/Gold pipeline behind the read-only API, not
from the visual-prototype fixtures described below. Stage 5 is in progress —
three advanced analytics products (Oil & Gas, Fiscal Execution and Sovereign
Yield Curve) have already been added; see the [MVP backlog](BACKLOG.md) for
the next candidates and remaining scale-up work.

### Stage 1 - Controlled data contract

- Keep the six values inherited from the visual prototype.
- Move them to one typed indicator catalogue.
- Display period, unit, definition, source and quality status.
- Mark all values as demonstration data.

Acceptance: the website uses one source module for the six indicator cards and
does not present the values as validated official statistics.

### Stage 2 - Reviewed local files

- Create one normalized CSV or JSON input file.
- Load reviewed extracts from INE, BNA and MINFIN.
- Add source URL, extraction date, publication date and version.
- Run basic completeness, type, duplicate and freshness checks.

Acceptance: a non-developer can replace a reviewed input file and refresh the
six cards without changing React components.

### Stage 3 - Read-only API

- Add `GET /indicators` and `GET /indicators/{id}/series`.
- Move transformation rules into the service/data layer.
- Return value, period, unit, source, freshness and quality metadata.
- Connect both the public website and admin view to the same API.

Acceptance: website and API return the same values and metadata.

### Stage 4 - Automated pipelines and DQF

- Ingest the official sources into Bronze.
- Normalize and reconcile in Silver.
- Publish approved values in Gold.
- Apply DQF rules, lineage, freshness and publication gates.

Acceptance: only approved Gold values can receive `published` status.

### Stage 5 - Scale the catalogue

- Add the remaining essential MVP indicators by product family.
- Introduce dashboards, history, export and subscription controls.
- Measure usage before adding countries or premium AI capabilities.

## Indicator contract

Every published indicator must contain:

- stable indicator ID;
- business definition;
- numeric value and display value;
- unit and frequency;
- reference period and publication date;
- source name, URL and source version;
- comparison and trend;
- quality/freshness status;
- publication status and accountable owner.

## Guardrails

- Demonstration values must remain visibly labelled.
- A source link is not proof of validation; the exact source asset and period
  must be recorded in Stage 2.
- A favorable trend cannot be inferred from `up` or `down` alone. For example,
  a higher exchange-rate value may represent currency depreciation.
- No value should be promoted to `published` without lineage and DQF evidence.
