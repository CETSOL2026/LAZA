import { runJsonQuery } from '../lib/sqlClient.mjs';

const cacheTtlMs = 30_000;

const latestIndicatorsQuery = `
SET NOCOUNT ON;
SELECT
    indicator_code AS id,
    indicator_name AS label,
    display_value AS value,
    CONVERT(float, numeric_value) AS numericValue,
    unit_name AS unit,
    reference_period_label AS period,
    ISNULL(comparison_label, N'') AS comparisonLabel,
    ISNULL(comparison_display_value, N'') AS change,
    LOWER(ISNULL(trend_direction, 'STABLE')) AS trend,
    LOWER(favorable_direction) AS favorableDirection,
    domain_name AS domain,
    business_definition AS definition,
    frequency_name AS frequency,
    source_name AS sourceName,
    source_url AS sourceUrl,
    quality_status AS qualityStatus,
    LOWER(publication_status) AS status,
    CONVERT(bit, is_official) AS isOfficial,
    quality_score AS qualityScore
FROM [api].[vw_indicator_latest]
WHERE indicator_code IN
(
    N'gdp-growth', N'inflation-rate', N'exchange-rate',
    N'population', N'banking-assets', N'public-debt-gdp'
)
ORDER BY indicator_code
FOR JSON PATH;
`;

const inflationHistoryQuery = `
SET NOCOUNT ON;
SELECT
    f.reference_period_label AS period,
    CONVERT(char(10), period_start.full_date, 23) AS periodStart,
    CONVERT(float, f.numeric_value) AS numericValue,
    f.display_value AS displayValue,
    f.quality_status AS qualityStatus,
    f.quality_score AS qualityScore,
    CONVERT(bit, f.is_official) AS isOfficial,
    CONVERT(bit, CASE WHEN EXISTS
    (
        SELECT 1
        FROM [dq].[result] AS result
        INNER JOIN [dq].[exception] AS exception
            ON exception.dq_result_id = result.dq_result_id
        WHERE result.observation_id = f.silver_observation_id
          AND exception.exception_status = 'APPROVED'
    ) THEN 1 ELSE 0 END) AS hasAcceptedException
FROM [gold].[fact_indicator_observation] AS f
INNER JOIN [gold].[dim_series] AS series ON series.series_key = f.series_key
INNER JOIN [gold].[dim_date] AS period_start ON period_start.date_key = f.period_start_date_key
WHERE series.series_code = N'INFLATION_RATE_AGO_INE_IPCN_YOY'
  AND f.publication_status = 'PUBLISHED'
  AND f.is_official = 1
ORDER BY period_start.full_date
FOR JSON PATH;
`;

const exchangeHistoryQuery = `
SET NOCOUNT ON;
SELECT
    f.reference_period_label AS period,
    CONVERT(char(10), period_start.full_date, 23) AS periodStart,
    CONVERT(float, f.numeric_value) AS numericValue,
    f.display_value AS displayValue,
    f.quality_status AS qualityStatus,
    f.quality_score AS qualityScore,
    CONVERT(bit, f.is_official) AS isOfficial,
    CONVERT(bit, CASE WHEN f.quality_score < 100 THEN 1 ELSE 0 END) AS hasSourceWarning,
    CASE WHEN f.quality_score < 100 THEN N'Exact source duplicate deduplicated' END AS sourceWarningMessage
FROM [gold].[fact_indicator_observation] AS f
INNER JOIN [gold].[dim_series] AS series ON series.series_key = f.series_key
INNER JOIN [gold].[dim_date] AS period_start ON period_start.date_key = f.period_start_date_key
WHERE series.series_code = N'EXCHANGE_RATE_AGO_BNA_USD_REFERENCE_MONTHLY'
  AND f.publication_status = 'PUBLISHED' AND f.is_official = 1
ORDER BY period_start.full_date
FOR JSON PATH;
`;

const gdpHistoryQuery = `
SET NOCOUNT ON;
SELECT f.reference_period_label AS period,
       CONVERT(char(10), d.full_date, 23) AS periodStart,
       CONVERT(float, f.numeric_value) AS numericValue,
       f.display_value AS displayValue,
       f.quality_status AS qualityStatus,
       f.quality_score AS qualityScore,
       CONVERT(bit, f.is_official) AS isOfficial,
       CONVERT(bit, 0) AS hasAcceptedException,
       CONVERT(bit, 0) AS hasSourceWarning
FROM gold.fact_indicator_observation f
JOIN gold.dim_series s ON s.series_key=f.series_key
JOIN gold.dim_date d ON d.date_key=f.period_start_date_key
WHERE s.series_code=N'GDP_GROWTH_AGO_INE_QUARTERLY_YOY_2015'
  AND f.publication_status='PUBLISHED' AND f.is_official=1
ORDER BY d.full_date
FOR JSON PATH;
`;

const populationHistoryQuery = `
SET NOCOUNT ON;
SELECT f.reference_period_label AS period,
       CONVERT(char(10), d.full_date, 23) AS periodStart,
       CONVERT(float, f.numeric_value) AS numericValue,
       f.display_value AS displayValue,
       f.quality_status AS qualityStatus,
       f.quality_score AS qualityScore,
       CONVERT(bit, f.is_official) AS isOfficial,
       CONVERT(bit, 0) AS hasAcceptedException,
       CONVERT(bit, CASE WHEN f.quality_score < 100 THEN 1 ELSE 0 END) AS hasSourceWarning,
       CASE WHEN f.quality_score < 100 THEN N'One-person narrative arithmetic discrepancy documented' END AS sourceWarningMessage
FROM gold.fact_indicator_observation f
JOIN gold.dim_series s ON s.series_key=f.series_key
JOIN gold.dim_date d ON d.date_key=f.period_start_date_key
WHERE s.series_code=N'POPULATION_AGO_INE_RGPH_CENSUS'
  AND f.publication_status='PUBLISHED' AND f.is_official=1
ORDER BY d.full_date
FOR JSON PATH;
`;

const bankingAssetsHistoryQuery = `
SET NOCOUNT ON;
SELECT f.reference_period_label AS period,
       CONVERT(char(10), d.full_date, 23) AS periodStart,
       CONVERT(float, f.numeric_value) AS numericValue,
       f.display_value AS displayValue,
       f.quality_status AS qualityStatus,
       f.quality_score AS qualityScore,
       CONVERT(bit, f.is_official) AS isOfficial,
       CONVERT(bit, 0) AS hasAcceptedException,
       CONVERT(bit, CASE WHEN f.quality_score < 100 THEN 1 ELSE 0 END) AS hasSourceWarning,
       CASE WHEN f.quality_score < 100 THEN N'BNA marks 2026 values as preliminary' END AS sourceWarningMessage
FROM gold.fact_indicator_observation f
JOIN gold.dim_series s ON s.series_key=f.series_key
JOIN gold.dim_date d ON d.date_key=f.period_start_date_key
WHERE s.series_code=N'BANKING_ASSETS_AGO_BNA_OSD_MONTHLY'
  AND f.publication_status='PUBLISHED' AND f.is_official=1
ORDER BY d.full_date
FOR JSON PATH;
`;

const publicDebtHistoryQuery = `
SET NOCOUNT ON;
SELECT f.reference_period_label AS period,
       CONVERT(char(10), d.full_date, 23) AS periodStart,
       CONVERT(float, f.numeric_value) AS numericValue,
       f.display_value AS displayValue,
       f.quality_status AS qualityStatus,
       f.quality_score AS qualityScore,
       CONVERT(bit, f.is_official) AS isOfficial,
       CONVERT(bit, 0) AS hasAcceptedException,
       CONVERT(bit, CASE WHEN f.quality_score < 100 THEN 1 ELSE 0 END) AS hasSourceWarning,
       CASE WHEN f.quality_score < 100 THEN N'Derived from official government and public-enterprise debt components' END AS sourceWarningMessage
FROM gold.fact_indicator_observation f
JOIN gold.dim_series s ON s.series_key=f.series_key
JOIN gold.dim_date d ON d.date_key=f.period_start_date_key
WHERE s.series_code=N'PUBLIC_DEBT_GDP_AGO_UGD_OFFICIAL_COMPONENTS'
  AND f.publication_status='PUBLISHED' AND f.is_official=1
ORDER BY d.full_date
FOR JSON PATH;
`;

let cache = null;
let cachedAt = 0;
let historyCache = null;
let historyCachedAt = 0;
let exchangeHistoryCache = null;
let exchangeHistoryCachedAt = 0;
let gdpHistoryCache = null;
let gdpHistoryCachedAt = 0;
let populationHistoryCache = null;
let populationHistoryCachedAt = 0;
let bankingAssetsHistoryCache = null;
let bankingAssetsHistoryCachedAt = 0;
let publicDebtHistoryCache = null;
let publicDebtHistoryCachedAt = 0;

export async function readLatestIndicators() {
  if (cache && Date.now() - cachedAt < cacheTtlMs) return cache;
  const indicators = await runJsonQuery(latestIndicatorsQuery);
  if (!Array.isArray(indicators) || indicators.length === 0) {
    throw new Error('The Gold API view returned no indicators.');
  }

  cache = indicators;
  cachedAt = Date.now();
  return indicators;
}

export async function readInflationHistory() {
  if (historyCache && Date.now() - historyCachedAt < cacheTtlMs) return historyCache;

  const history = await runJsonQuery(inflationHistoryQuery);
  if (!Array.isArray(history) || history.length !== 66) {
    throw new Error(`Expected 66 published IPCN months, received ${history?.length ?? 0}.`);
  }

  historyCache = history;
  historyCachedAt = Date.now();
  return history;
}

export async function readExchangeHistory() {
  if (exchangeHistoryCache && Date.now() - exchangeHistoryCachedAt < cacheTtlMs) return exchangeHistoryCache;
  const history = await runJsonQuery(exchangeHistoryQuery);
  if (!Array.isArray(history) || history.length !== 66) {
    throw new Error(`Expected 66 published BNA exchange-rate months, received ${history?.length ?? 0}.`);
  }
  exchangeHistoryCache = history;
  exchangeHistoryCachedAt = Date.now();
  return history;
}

export async function readGdpHistory() {
  if (gdpHistoryCache && Date.now() - gdpHistoryCachedAt < cacheTtlMs) return gdpHistoryCache;
  const history = await runJsonQuery(gdpHistoryQuery);
  if (!Array.isArray(history) || history.length !== 21) {
    throw new Error(`Expected 21 published INE GDP quarters, received ${history?.length ?? 0}.`);
  }
  gdpHistoryCache = history;
  gdpHistoryCachedAt = Date.now();
  return history;
}

export async function readPopulationHistory() {
  if (populationHistoryCache && Date.now() - populationHistoryCachedAt < cacheTtlMs) return populationHistoryCache;
  const history = await runJsonQuery(populationHistoryQuery);
  if (!Array.isArray(history) || history.length !== 2) {
    throw new Error(`Expected 2 published INE census observations, received ${history?.length ?? 0}.`);
  }
  populationHistoryCache = history;
  populationHistoryCachedAt = Date.now();
  return history;
}

export async function readBankingAssetsHistory() {
  if (bankingAssetsHistoryCache && Date.now() - bankingAssetsHistoryCachedAt < cacheTtlMs) return bankingAssetsHistoryCache;
  const history = await runJsonQuery(bankingAssetsHistoryQuery);
  if (!Array.isArray(history) || history.length !== 65) {
    throw new Error(`Expected 65 published BNA banking-assets months, received ${history?.length ?? 0}.`);
  }
  bankingAssetsHistoryCache = history;
  bankingAssetsHistoryCachedAt = Date.now();
  return history;
}

export async function readPublicDebtHistory() {
  if (publicDebtHistoryCache && Date.now() - publicDebtHistoryCachedAt < cacheTtlMs) return publicDebtHistoryCache;
  const history = await runJsonQuery(publicDebtHistoryQuery);
  if (!Array.isArray(history) || history.length !== 2) {
    throw new Error(`Expected 2 published UGD public-debt observations, received ${history?.length ?? 0}.`);
  }
  publicDebtHistoryCache = history;
  publicDebtHistoryCachedAt = Date.now();
  return history;
}
