# BODIVA Domestic Sovereign Yield Curve

The third advanced LAZA product uses the official **Curva de Rendimentos Kz**
published in BODIVA Official Market Bulletins. The initial MVP includes four
reviewed snapshots between February 2025 and June 2026.

## Governed flow

```text
BODIVA daily bulletin PDFs
  -> scripts/bodiva/extract-sovereign-yield-curve.py
  -> database/sqlserver/evidence/bodiva-sovereign-yield-curve-2025-2026.json
  -> database/sqlserver/28_load_bodiva_sovereign_yield_curve_2025_2026.sql
  -> 4 Bronze PDF assets
  -> 48 Silver tenor observations and 192 DQ results
  -> 48 Gold published facts
  -> api.vw_bodiva_sovereign_yield_curve
  -> GET /api/analytics/sovereign-yield-curve
  -> SovereignYieldCurveIntelligence
```

## Analytical scope

- twelve observed maturities from 3M through 10Y;
- comparison of the four official curves;
- 5Y-1Y and 10Y-2Y spreads in basis points;
- term-by-term yield shift from the first to the latest snapshot;
- identification of the highest observed point on the latest curve.

## Data quality

Every snapshot must contain exactly twelve unique maturities, every yield must
fall inside the percentage domain, and every value must retain its PDF hash,
source URL and source page. The load applies **no interpolation, forward fill
or synthetic maturity**. All 192 initial rule results passed with quality score
100 and no exception.

## Site experience

The module uses an indigo/violet palette with amber accents. Its interactive
views are **Curve comparison**, **Spread history** and **Term shift**.
