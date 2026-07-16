# BNA USD/AOA initial load

The first official exchange-rate load uses the Banco Nacional de Angola REST
service behind its exchange-rate table. The governed series contract is:

- series: `EXCHANGE_RATE_AGO_BNA_USD_REFERENCE_MONTHLY`
- source grain: official daily USD/AOA average reference rate (`tipoCambio=M`)
- published grain: calendar-month arithmetic mean
- period: January 2021 through June 2026 (66 complete months)
- duplicate policy: preserve source rows in Bronze; deduplicate exact
  date/value/currency/rate-type repetitions before monthly aggregation; record
  a DQ warning

Run the initial load once from the repository root:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\bna\Invoke-LazaBnaExchangeInitialLoad.ps1
```

The command extracts the official JSON to
`D:\LAZA_DATA\landing\bna\exchange-rate`, writes a SHA-256 manifest, deploys
the stored procedure, validates the source contract, and publishes Bronze,
Silver, DQ, and Gold records in one SQL transaction.

The site consumes the monthly history at
`/api/indicators/exchange-rate/history`.
