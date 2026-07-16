# MINFIN Fiscal Execution Intelligence

The second advanced LAZA product uses five official quarterly General State
Budget Execution Reports published by Angola's Ministry of Finance (MINFIN),
covering 2025 Q1 through 2026 Q1.

## Governed flow

```text
MINFIN REOGE PDF archive
  -> scripts/minfin/extract-fiscal-execution.py
  -> database/sqlserver/evidence/minfin-fiscal-execution-2025q1-2026q1.json
  -> database/sqlserver/27_load_minfin_fiscal_execution_2025_2026.sql
  -> Bronze PDF assets
  -> Silver quarterly metric observations and DQ evidence
  -> Gold published facts
  -> api.vw_minfin_fiscal_execution_quarterly
  -> GET /api/analytics/fiscal-execution
  -> FiscalExecutionIntelligence
```

## Analytical scope

- quarterly revenue, expenditure and budget balance;
- current and capital revenue/expenditure composition;
- tax, patrimonial and petroleum revenue;
- personnel, interest and investment expenditure;
- revenue and expenditure execution against the annual budget.

All monetary values use **million Angolan kwanza**. The fiscal balance is
reconciled as total revenue minus total expenditure.

## Data quality

The load enforces quarter completeness and uniqueness, revenue composition,
expenditure composition and budget-balance arithmetic. Three medium-severity
source exceptions are preserved and approved:

1. The 2025 Q1 expenditure components differ from the published total by Kz 1
   million due to table rounding.
2. The MINFIN catalog date for the 2025 Q4 report precedes the quarter, while
   the PDF technical sheet confirms 12 March 2026.
3. The catalog labels the 2026 Q1 PDF as 2022, while the PDF title, technical
   sheet and tables consistently identify 2026 Q1.

No official value is silently changed or imputed.

## Site experience

The module uses a blue-petrol and teal palette that differentiates it from the
red ANPG product while retaining the LAZA card, spacing, typography and tab
patterns. Its views are **Fiscal pulse**, **Budget composition** and **Key
drivers**.
