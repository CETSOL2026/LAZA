# ANPG Oil & Gas Production Intelligence

## Scope

The first advanced analytical product uses 18 official ANPG monthly production
publications covering January 2025 through June 2026. The source snapshot is
recorded in `database/sqlserver/evidence/anpg-oil-gas-production-2025-2026.json`.

The extraction preserves 15 governed metrics:

- monthly oil barrels, actual BOPD and forecast BOPD;
- associated gas total, daily production, reinjection, Angola LNG supply and
  facility-power use;
- Angola LNG actual and forecast BOE, daily BOEPD and LNG, propane, butane and
  condensate product output.

## Data flow

```text
ANPG monthly HTML publications
              |
              v
18 Bronze source assets + 18 raw monthly records
              |
              v
15 governed Silver series + 252 observations
              |
              v
DQ rules, scores, approvals and source exceptions
              |
              v
252 official Gold facts
              |
              v
api.vw_anpg_oil_gas_monthly
              |
              v
GET /api/analytics/oil-gas-production
```

## Quality controls

1. Eighteen unique, contiguous monthly publications are required.
2. Oil and gas core values must be positive and complete.
3. Monthly oil barrels must reconcile to BOPD multiplied by calendar days,
   within the source's whole-number rounding tolerance.
4. Monthly gas volume must reconcile to MMSCFD multiplied by calendar days.
5. Published allocation components should not exceed total associated gas.

ANPG's August and September 2025 publications report allocation components
whose sum exceeds the published associated-gas total. LAZA does not alter or
impute these values. Both months retain approved DQ exceptions, receive the
lower quality score on the affected total-gas observation and suppress the
derived residual allocation.

January and February 2025 do not expose detailed Angola LNG values as
extractable page text. Those optional values remain absent. No interpolation is
used.

## Website experience

The advanced product is visually separated from the six pilot cards. Its three
views are:

- **Oil performance:** actual versus ANPG forecast BOPD;
- **Gas allocation:** reinjection, Angola LNG supply, facility power, residual
  and published total;
- **Angola LNG:** daily product mix and total output.

The default view is summary-first and exposes source, coverage, quality score
and accepted-exception count alongside the analytical charts.
