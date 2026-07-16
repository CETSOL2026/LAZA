import { execFile } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const port = Number(process.env.LAZA_API_PORT ?? 8790);
const sqlcmd = process.env.LAZA_SQLCMD ?? 'C:\\Program Files\\Microsoft SQL Server\\Client SDK\\ODBC\\170\\Tools\\Binn\\SQLCMD.EXE';
const instance = process.env.LAZA_SQL_INSTANCE ?? '.\\SQLEXPRESS';
const database = process.env.LAZA_SQL_DATABASE ?? 'LAZA_DATA_PLATFORM_DEV';
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = path.join(projectRoot, 'dist');

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.gif', 'image/gif'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
]);

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

const oilGasAnalyticsQuery = `
SET NOCOUNT ON;
SELECT period,
       period_start AS periodStart,
       publication_date AS publicationDate,
       source_url AS sourceUrl,
       oil_total_barrels AS oilTotalBarrels,
       oil_actual_bopd AS oilActualBopd,
       oil_forecast_bopd AS oilForecastBopd,
       oil_variance_pct AS oilVariancePct,
       oil_monthly_change_pct AS oilMonthlyChangePct,
       gas_total_mmcf AS gasTotalMmcf,
       gas_actual_mmscfd AS gasActualMmscfd,
       gas_reinjected_mmscfd AS gasReinjectedMmscfd,
       gas_to_alng_mmscfd AS gasToAlngMmscfd,
       gas_to_power_mmscfd AS gasToPowerMmscfd,
       gas_other_mmscfd AS gasOtherMmscfd,
       alng_actual_boe AS alngActualBoe,
       alng_forecast_boe AS alngForecastBoe,
       alng_actual_boepd AS alngActualBoepd,
       alng_lng_boepd AS alngLngBoepd,
       alng_propane_boepd AS alngPropaneBoepd,
       alng_butane_boepd AS alngButaneBoepd,
       alng_condensate_boepd AS alngCondensateBoepd,
       quality_score AS qualityScore,
       CONVERT(bit, has_accepted_exception) AS hasAcceptedException
FROM api.vw_anpg_oil_gas_monthly
ORDER BY period_start
FOR JSON PATH;
`;

const fiscalExecutionQuery = `
SET NOCOUNT ON;
SELECT period,
       period_start AS periodStart,
       publication_date AS publicationDate,
       source_url AS sourceUrl,
       annual_budget AS annualBudget,
       total_revenue AS totalRevenue,
       current_revenue AS currentRevenue,
       capital_revenue AS capitalRevenue,
       tax_revenue AS taxRevenue,
       patrimonial_revenue AS patrimonialRevenue,
       petroleum_revenue AS petroleumRevenue,
       total_expenditure AS totalExpenditure,
       current_expenditure AS currentExpenditure,
       capital_expenditure AS capitalExpenditure,
       personnel_expenditure AS personnelExpenditure,
       interest_expenditure AS interestExpenditure,
       investment_expenditure AS investmentExpenditure,
       budget_balance AS budgetBalance,
       revenue_execution_pct AS revenueExecutionPct,
       expenditure_execution_pct AS expenditureExecutionPct,
       quality_score AS qualityScore,
       CONVERT(bit, has_accepted_exception) AS hasAcceptedException
FROM api.vw_minfin_fiscal_execution_quarterly
ORDER BY period_start
FOR JSON PATH;
`;

const sovereignYieldCurveQuery = `
SET NOCOUNT ON;
SELECT reference_date AS referenceDate,
       source_url AS sourceUrl,
       quality_score AS qualityScore,
       yield_3m AS yield3m,
       yield_6m AS yield6m,
       yield_1y AS yield1y,
       yield_2y AS yield2y,
       yield_3y AS yield3y,
       yield_4y AS yield4y,
       yield_5y AS yield5y,
       yield_6y AS yield6y,
       yield_7y AS yield7y,
       yield_8y AS yield8y,
       yield_9y AS yield9y,
       yield_10y AS yield10y,
       spread_5y_1y_bps AS spread5y1yBps,
       spread_10y_2y_bps AS spread10y2yBps
FROM api.vw_bodiva_sovereign_yield_curve
ORDER BY reference_date
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
let oilGasAnalyticsCache = null;
let oilGasAnalyticsCachedAt = 0;
let fiscalExecutionCache = null;
let fiscalExecutionCachedAt = 0;
let sovereignYieldCurveCache = null;
let sovereignYieldCurveCachedAt = 0;
const cacheTtlMs = 30_000;

async function runJsonQuery(query) {
  const { stdout } = await execFileAsync(
    sqlcmd,
    [
      '-S', instance,
      '-E',
      '-C',
      '-b',
      '-d', database,
      '-y', '0',
      '-Q', query,
    ],
    { windowsHide: true, maxBuffer: 4 * 1024 * 1024 },
  );

  const jsonText = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join('');

  return JSON.parse(jsonText);
}

async function readLatestIndicators() {
  if (cache && Date.now() - cachedAt < cacheTtlMs) return cache;
  const indicators = await runJsonQuery(latestIndicatorsQuery);
  if (!Array.isArray(indicators) || indicators.length === 0) {
    throw new Error('The Gold API view returned no indicators.');
  }

  cache = indicators;
  cachedAt = Date.now();
  return indicators;
}

async function readInflationHistory() {
  if (historyCache && Date.now() - historyCachedAt < cacheTtlMs) return historyCache;

  const history = await runJsonQuery(inflationHistoryQuery);
  if (!Array.isArray(history) || history.length !== 66) {
    throw new Error(`Expected 66 published IPCN months, received ${history?.length ?? 0}.`);
  }

  historyCache = history;
  historyCachedAt = Date.now();
  return history;
}

async function readExchangeHistory() {
  if (exchangeHistoryCache && Date.now() - exchangeHistoryCachedAt < cacheTtlMs) return exchangeHistoryCache;
  const history = await runJsonQuery(exchangeHistoryQuery);
  if (!Array.isArray(history) || history.length !== 66) {
    throw new Error(`Expected 66 published BNA exchange-rate months, received ${history?.length ?? 0}.`);
  }
  exchangeHistoryCache = history;
  exchangeHistoryCachedAt = Date.now();
  return history;
}

async function readGdpHistory() {
  if (gdpHistoryCache && Date.now() - gdpHistoryCachedAt < cacheTtlMs) return gdpHistoryCache;
  const history = await runJsonQuery(gdpHistoryQuery);
  if (!Array.isArray(history) || history.length !== 21) {
    throw new Error(`Expected 21 published INE GDP quarters, received ${history?.length ?? 0}.`);
  }
  gdpHistoryCache = history;
  gdpHistoryCachedAt = Date.now();
  return history;
}

async function readPopulationHistory() {
  if (populationHistoryCache && Date.now() - populationHistoryCachedAt < cacheTtlMs) return populationHistoryCache;
  const history = await runJsonQuery(populationHistoryQuery);
  if (!Array.isArray(history) || history.length !== 2) {
    throw new Error(`Expected 2 published INE census observations, received ${history?.length ?? 0}.`);
  }
  populationHistoryCache = history;
  populationHistoryCachedAt = Date.now();
  return history;
}

async function readBankingAssetsHistory() {
  if (bankingAssetsHistoryCache && Date.now() - bankingAssetsHistoryCachedAt < cacheTtlMs) return bankingAssetsHistoryCache;
  const history = await runJsonQuery(bankingAssetsHistoryQuery);
  if (!Array.isArray(history) || history.length !== 65) {
    throw new Error(`Expected 65 published BNA banking-assets months, received ${history?.length ?? 0}.`);
  }
  bankingAssetsHistoryCache = history;
  bankingAssetsHistoryCachedAt = Date.now();
  return history;
}

async function readPublicDebtHistory() {
  if (publicDebtHistoryCache && Date.now() - publicDebtHistoryCachedAt < cacheTtlMs) return publicDebtHistoryCache;
  const history = await runJsonQuery(publicDebtHistoryQuery);
  if (!Array.isArray(history) || history.length !== 2) {
    throw new Error(`Expected 2 published UGD public-debt observations, received ${history?.length ?? 0}.`);
  }
  publicDebtHistoryCache = history;
  publicDebtHistoryCachedAt = Date.now();
  return history;
}

async function readOilGasAnalytics() {
  if (oilGasAnalyticsCache && Date.now() - oilGasAnalyticsCachedAt < cacheTtlMs) return oilGasAnalyticsCache;
  const history = await runJsonQuery(oilGasAnalyticsQuery);
  if (!Array.isArray(history) || history.length !== 18) {
    throw new Error(`Expected 18 published ANPG months, received ${history?.length ?? 0}.`);
  }
  oilGasAnalyticsCache = history;
  oilGasAnalyticsCachedAt = Date.now();
  return history;
}

async function readFiscalExecution() {
  if (fiscalExecutionCache && Date.now() - fiscalExecutionCachedAt < cacheTtlMs) return fiscalExecutionCache;
  const history = await runJsonQuery(fiscalExecutionQuery);
  if (!Array.isArray(history) || history.length !== 5) {
    throw new Error(`Expected five published MINFIN quarters, received ${history?.length ?? 0}.`);
  }
  fiscalExecutionCache = history;
  fiscalExecutionCachedAt = Date.now();
  return history;
}

async function readSovereignYieldCurve() {
  if (sovereignYieldCurveCache && Date.now() - sovereignYieldCurveCachedAt < cacheTtlMs) return sovereignYieldCurveCache;
  const snapshots = await runJsonQuery(sovereignYieldCurveQuery);
  if (!Array.isArray(snapshots) || snapshots.length !== 4) {
    throw new Error(`Expected four published BODIVA curve snapshots, received ${snapshots?.length ?? 0}.`);
  }
  sovereignYieldCurveCache = snapshots;
  sovereignYieldCurveCachedAt = Date.now();
  return snapshots;
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(payload));
}

async function sendSiteAsset(request, response) {
  if (!['GET', 'HEAD'].includes(request.method ?? '') || request.url?.startsWith('/api/')) return false;
  const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
  const requested = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  let filePath = path.resolve(distRoot, requested);
  if (!filePath.startsWith(`${distRoot}${path.sep}`) && filePath !== distRoot) return false;

  try {
    const details = await stat(filePath);
    if (!details.isFile()) throw new Error('Not a file');
  } catch {
    filePath = path.join(distRoot, 'index.html');
  }

  try {
    const body = await readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();
    const immutable = filePath.includes(`${path.sep}assets${path.sep}`);
    response.writeHead(200, {
      'Content-Type': contentTypes.get(extension) ?? 'application/octet-stream',
      'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch (error) {
    sendJson(response, 503, { error: 'SITE_BUILD_UNAVAILABLE', message: error.message });
  }
  return true;
}

const server = createServer(async (request, response) => {
  if (request.method === 'GET' && request.url === '/health') {
    try {
      const indicators = await readLatestIndicators();
      sendJson(response, 200, {
        status: 'ok',
        database,
        indicatorCount: indicators.length,
        officialIndicatorCount: indicators.filter((item) => item.isOfficial).length,
      });
    } catch (error) {
      sendJson(response, 503, { status: 'error', message: error.message });
    }
    return;
  }

  if (request.method === 'GET' && request.url === '/api/indicators/latest') {
    try {
      const indicators = await readLatestIndicators();
      sendJson(response, 200, {
        data: indicators,
        meta: {
          source: 'LAZA_DATA_PLATFORM_DEV.api.vw_indicator_latest',
          generatedAt: new Date().toISOString(),
          indicatorCount: indicators.length,
          officialIndicatorCount: indicators.filter((item) => item.isOfficial).length,
        },
      });
    } catch (error) {
      sendJson(response, 503, {
        error: 'SQL_SERVER_UNAVAILABLE',
        message: error.message,
      });
    }
    return;
  }

  if (request.method === 'GET' && request.url === '/api/indicators/inflation-rate/history') {
    try {
      const history = await readInflationHistory();
      sendJson(response, 200, {
        data: history,
        meta: {
          source: 'LAZA_DATA_PLATFORM_DEV.gold.fact_indicator_observation',
          seriesCode: 'INFLATION_RATE_AGO_INE_IPCN_YOY',
          generatedAt: new Date().toISOString(),
          observationCount: history.length,
          firstPeriod: history[0].period,
          lastPeriod: history.at(-1).period,
          acceptedExceptionCount: history.filter((item) => item.hasAcceptedException).length,
        },
      });
    } catch (error) {
      sendJson(response, 503, {
        error: 'SQL_SERVER_HISTORY_UNAVAILABLE',
        message: error.message,
      });
    }
    return;
  }

  if (request.method === 'GET' && request.url === '/api/indicators/exchange-rate/history') {
    try {
      const history = await readExchangeHistory();
      sendJson(response, 200, {
        data: history,
        meta: {
          source: 'LAZA_DATA_PLATFORM_DEV.gold.fact_indicator_observation',
          seriesCode: 'EXCHANGE_RATE_AGO_BNA_USD_REFERENCE_MONTHLY',
          generatedAt: new Date().toISOString(),
          observationCount: history.length,
          firstPeriod: history[0].period,
          lastPeriod: history.at(-1).period,
          sourceWarningCount: history.filter((item) => item.hasSourceWarning).length,
        },
      });
    } catch (error) {
      sendJson(response, 503, { error: 'SQL_SERVER_HISTORY_UNAVAILABLE', message: error.message });
    }
    return;
  }

  if (request.method === 'GET' && request.url === '/api/indicators/gdp-growth/history') {
    try {
      const history = await readGdpHistory();
      sendJson(response, 200, {
        data: history,
        meta: {
          source: 'LAZA_DATA_PLATFORM_DEV.gold.fact_indicator_observation',
          seriesCode: 'GDP_GROWTH_AGO_INE_QUARTERLY_YOY_2015',
          generatedAt: new Date().toISOString(),
          observationCount: history.length,
          firstPeriod: history[0].period,
          lastPeriod: history.at(-1).period,
        },
      });
    } catch (error) {
      sendJson(response, 503, { error: 'SQL_SERVER_HISTORY_UNAVAILABLE', message: error.message });
    }
    return;
  }

  if (request.method === 'GET' && request.url === '/api/indicators/population/history') {
    try {
      const history = await readPopulationHistory();
      sendJson(response, 200, {
        data: history,
        meta: {
          source: 'LAZA_DATA_PLATFORM_DEV.gold.fact_indicator_observation',
          seriesCode: 'POPULATION_AGO_INE_RGPH_CENSUS',
          generatedAt: new Date().toISOString(),
          observationCount: history.length,
          firstPeriod: history[0].period,
          lastPeriod: history.at(-1).period,
          sourceWarningCount: history.filter((item) => item.hasSourceWarning).length,
        },
      });
    } catch (error) {
      sendJson(response, 503, { error: 'SQL_SERVER_HISTORY_UNAVAILABLE', message: error.message });
    }
    return;
  }

  if (request.method === 'GET' && request.url === '/api/indicators/banking-assets/history') {
    try {
      const history = await readBankingAssetsHistory();
      sendJson(response, 200, {
        data: history,
        meta: {
          source: 'LAZA_DATA_PLATFORM_DEV.gold.fact_indicator_observation',
          seriesCode: 'BANKING_ASSETS_AGO_BNA_OSD_MONTHLY',
          generatedAt: new Date().toISOString(),
          observationCount: history.length,
          firstPeriod: history[0].period,
          lastPeriod: history.at(-1).period,
          sourceWarningCount: history.filter((item) => item.hasSourceWarning).length,
        },
      });
    } catch (error) {
      sendJson(response, 503, { error: 'SQL_SERVER_HISTORY_UNAVAILABLE', message: error.message });
    }
    return;
  }

  if (request.method === 'GET' && request.url === '/api/indicators/public-debt-gdp/history') {
    try {
      const history = await readPublicDebtHistory();
      sendJson(response, 200, {
        data: history,
        meta: {
          source: 'LAZA_DATA_PLATFORM_DEV.gold.fact_indicator_observation',
          seriesCode: 'PUBLIC_DEBT_GDP_AGO_UGD_OFFICIAL_COMPONENTS',
          generatedAt: new Date().toISOString(),
          observationCount: history.length,
          firstPeriod: history[0].period,
          lastPeriod: history.at(-1).period,
          sourceWarningCount: history.filter((item) => item.hasSourceWarning).length,
        },
      });
    } catch (error) {
      sendJson(response, 503, { error: 'SQL_SERVER_HISTORY_UNAVAILABLE', message: error.message });
    }
    return;
  }

  if (request.method === 'GET' && request.url === '/api/analytics/oil-gas-production') {
    try {
      const history = await readOilGasAnalytics();
      sendJson(response, 200, {
        data: history,
        meta: {
          source: 'LAZA_DATA_PLATFORM_DEV.api.vw_anpg_oil_gas_monthly',
          sourceName: 'Agência Nacional de Petróleo, Gás e Biocombustíveis (ANPG)',
          sourceArchiveUrl: 'https://anpg.co.ao/producao/',
          generatedAt: new Date().toISOString(),
          observationCount: history.length,
          firstPeriod: history[0].period,
          lastPeriod: history.at(-1).period,
          acceptedExceptionCount: history.filter((item) => item.hasAcceptedException).length,
        },
      });
    } catch (error) {
      sendJson(response, 503, { error: 'SQL_SERVER_ANALYTICS_UNAVAILABLE', message: error.message });
    }
    return;
  }

  if (request.method === 'GET' && request.url === '/api/analytics/fiscal-execution') {
    try {
      const history = await readFiscalExecution();
      sendJson(response, 200, {
        data: history,
        meta: {
          source: 'LAZA_DATA_PLATFORM_DEV.api.vw_minfin_fiscal_execution_quarterly',
          sourceName: 'Ministry of Finance of Angola (MINFIN)',
          sourceArchiveUrl: 'https://www.minfin.gov.ao/oge/reoge',
          generatedAt: new Date().toISOString(),
          observationCount: history.length,
          firstPeriod: history[0].period,
          lastPeriod: history.at(-1).period,
          acceptedExceptionCount: history.filter((item) => item.hasAcceptedException).length,
        },
      });
    } catch (error) {
      sendJson(response, 503, { error: 'SQL_SERVER_ANALYTICS_UNAVAILABLE', message: error.message });
    }
    return;
  }

  if (request.method === 'GET' && request.url === '/api/analytics/sovereign-yield-curve') {
    try {
      const snapshots = await readSovereignYieldCurve();
      sendJson(response, 200, {
        data: snapshots,
        meta: {
          source: 'LAZA_DATA_PLATFORM_DEV.api.vw_bodiva_sovereign_yield_curve',
          sourceName: 'Bolsa de Divida e Valores de Angola (BODIVA)',
          sourceArchiveUrl: 'https://www.bodiva.ao/estatistica',
          generatedAt: new Date().toISOString(),
          observationCount: snapshots.length * 12,
          snapshotCount: snapshots.length,
          firstPeriod: snapshots[0].referenceDate,
          lastPeriod: snapshots.at(-1).referenceDate,
          interpolationApplied: false,
        },
      });
    } catch (error) {
      sendJson(response, 503, { error: 'SQL_SERVER_ANALYTICS_UNAVAILABLE', message: error.message });
    }
    return;
  }

  if (await sendSiteAsset(request, response)) return;

  sendJson(response, 404, { error: 'NOT_FOUND' });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`LAZA indicator API listening on http://127.0.0.1:${port}`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
