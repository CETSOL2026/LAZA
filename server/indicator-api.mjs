import { execFile } from 'node:child_process';
import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
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
const adminAuthConfigPath = process.env.LAZA_ADMIN_AUTH_CONFIG ?? 'D:\\LAZA_DATA\\config\\laza-admin-auth.json';
const adminSessionTtlMs = 8 * 60 * 60 * 1000;
const adminLoginWindowMs = 15 * 60 * 1000;
const adminLoginMaxFailures = 5;

function loadAdminAuthConfig() {
  try {
    const config = JSON.parse(readFileSync(adminAuthConfigPath, 'utf8').replace(/^\uFEFF/, ''));
    if (typeof config.username !== 'string' || !config.username.trim()) throw new Error('username is missing');
    if (!Number.isInteger(config.iterations) || config.iterations < 100_000) throw new Error('iterations are invalid');
    if (!/^[A-Fa-f0-9]{32,}$/.test(config.saltHex)) throw new Error('saltHex is invalid');
    if (!/^[A-Fa-f0-9]{64}$/.test(config.passwordHashHex)) throw new Error('passwordHashHex is invalid');
    return {
      username: config.username,
      iterations: config.iterations,
      salt: Buffer.from(config.saltHex, 'hex'),
      passwordHash: Buffer.from(config.passwordHashHex, 'hex'),
    };
  } catch (error) {
    console.error(`LAZA admin authentication is unavailable: ${error.message}`);
    return null;
  }
}

const adminAuth = loadAdminAuthConfig();
const adminSessions = new Map();
const adminLoginFailures = new Map();

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

const oilNonOilGdpQuery = `
SET NOCOUNT ON;
SELECT period,
       period_start AS periodStart,
       source_url AS sourceUrl,
       oil_nominal_million_aoa AS oilNominalMillionAoa,
       non_oil_nominal_million_aoa AS nonOilNominalMillionAoa,
       oil_share_pct AS oilSharePct,
       non_oil_share_pct AS nonOilSharePct,
       oil_yoy_pct AS oilYoyPct,
       non_oil_yoy_pct AS nonOilYoyPct,
       total_yoy_pct AS totalYoyPct,
       oil_contribution_pp AS oilContributionPp,
       non_oil_contribution_pp AS nonOilContributionPp,
       total_contribution_pp AS totalContributionPp,
       quality_score AS qualityScore,
       CONVERT(bit, has_accepted_exception) AS hasAcceptedException
FROM api.vw_ine_oil_non_oil_gdp_quarterly
ORDER BY period_start
FOR JSON PATH;
`;

const downloadCatalogQuery = `
SET NOCOUNT ON;
SELECT a.source_asset_id AS assetId,
       p.pipeline_code AS pipelineCode,
       b.batch_code AS batchCode,
       s.source_code AS sourceCode,
       s.source_name AS sourceName,
       s.organization_name AS organizationName,
       s.homepage_url AS sourceHomepageUrl,
       a.asset_type AS assetType,
       a.asset_name AS assetName,
       CONVERT(char(10),a.publication_date,23) AS publicationDate,
       m.mirror_size_bytes AS contentSizeBytes,
       CONVERT(varchar(64),m.mirror_sha256,2) AS sha256,
       CONVERT(varchar(64),a.content_hash,2) AS registeredSha256,
       m.mirror_status AS mirrorStatus,
       N'LOCAL_ARCHIVE' AS storageMode,
       CONVERT(bit,0) AS isRemote
FROM bronze.source_asset a
JOIN control.ingestion_batch b ON b.ingestion_batch_id=a.ingestion_batch_id
JOIN control.pipeline_run run ON run.pipeline_run_id=b.pipeline_run_id
JOIN control.pipeline_definition p ON p.pipeline_id=run.pipeline_id
JOIN reference.source s ON s.source_id=a.source_id
JOIN control.source_asset_mirror m ON m.source_asset_id=a.source_asset_id
WHERE a.is_official=1
  AND b.data_classification='OFFICIAL'
  AND p.pipeline_code IN
  (N'INE_IPCN_TO_BRONZE',N'BNA_EXCHANGE_REFERENCE_MONTHLY',N'INE_GDP_QUARTERLY_YOY',N'INE_RGPH_POPULATION',
   N'BNA_OSD_BANKING_ASSETS',N'UGD_PUBLIC_DEBT_GDP',N'ANPG_OIL_GAS_MONTHLY',N'MINFIN_FISCAL_EXECUTION_QUARTERLY',
   N'BODIVA_SOVEREIGN_YIELD_CURVE',N'INE_GDP_OIL_NON_OIL_QUARTERLY')
ORDER BY p.pipeline_code,a.publication_date,a.source_asset_id
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
let oilNonOilGdpCache = null;
let oilNonOilGdpCachedAt = 0;
let downloadCatalogCache = null;
let downloadCatalogCachedAt = 0;
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

  if (!jsonText) return [];
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

async function readOilNonOilGdp() {
  if (oilNonOilGdpCache && Date.now() - oilNonOilGdpCachedAt < cacheTtlMs) return oilNonOilGdpCache;
  const quarters = await runJsonQuery(oilNonOilGdpQuery);
  if (!Array.isArray(quarters) || quarters.length !== 21) {
    throw new Error(`Expected 21 published INE oil/non-oil GDP quarters, received ${quarters?.length ?? 0}.`);
  }
  oilNonOilGdpCache = quarters;
  oilNonOilGdpCachedAt = Date.now();
  return quarters;
}

async function readDownloadCatalog() {
  if (downloadCatalogCache && Date.now() - downloadCatalogCachedAt < cacheTtlMs) return downloadCatalogCache;
  const assets = await runJsonQuery(downloadCatalogQuery);
  if (!Array.isArray(assets) || assets.length === 0) throw new Error('No official source assets are available for download.');
  downloadCatalogCache = assets;
  downloadCatalogCachedAt = Date.now();
  return assets;
}

async function readDownloadAsset(assetId) {
  const query = `
SET NOCOUNT ON;
SELECT a.source_asset_id AS assetId,a.asset_name AS assetName,a.asset_type AS assetType,m.mirror_path AS assetLocation,
       m.mirror_size_bytes AS contentSizeBytes,CONVERT(varchar(64),m.mirror_sha256,2) AS sha256,
       CONVERT(varchar(64),a.content_hash,2) AS registeredSha256,m.mirror_status AS mirrorStatus
FROM bronze.source_asset a
JOIN control.ingestion_batch b ON b.ingestion_batch_id=a.ingestion_batch_id
JOIN control.pipeline_run run ON run.pipeline_run_id=b.pipeline_run_id
JOIN control.pipeline_definition p ON p.pipeline_id=run.pipeline_id
JOIN control.source_asset_mirror m ON m.source_asset_id=a.source_asset_id
WHERE a.source_asset_id=${assetId} AND a.is_official=1 AND b.data_classification='OFFICIAL'
  AND p.pipeline_code IN
  (N'INE_IPCN_TO_BRONZE',N'BNA_EXCHANGE_REFERENCE_MONTHLY',N'INE_GDP_QUARTERLY_YOY',N'INE_RGPH_POPULATION',
   N'BNA_OSD_BANKING_ASSETS',N'UGD_PUBLIC_DEBT_GDP',N'ANPG_OIL_GAS_MONTHLY',N'MINFIN_FISCAL_EXECUTION_QUARTERLY',
   N'BODIVA_SOVEREIGN_YIELD_CURVE',N'INE_GDP_OIL_NON_OIL_QUARTERLY')
FOR JSON PATH;`;
  const assets = await runJsonQuery(query);
  return assets[0];
}

const downloadContentTypes = new Map([
  ['.csv','text/csv; charset=utf-8'],['.html','text/html; charset=utf-8'],['.json','application/json; charset=utf-8'],
  ['.pdf','application/pdf'],['.xls','application/vnd.ms-excel'],['.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
]);
const allowedLocalRoots = [path.resolve('D:\\LAZA_DATA\\archive\\official-source-assets')];

function downloadHeaders(asset, contentLength) {
  const extension = path.extname(asset.assetName).toLowerCase();
  return {
    'Content-Type': downloadContentTypes.get(extension) || 'application/octet-stream',
    'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(asset.assetName)}`,
    'Content-Length': String(contentLength),
    'Cache-Control': 'private, max-age=300',
    'X-Content-SHA256': asset.sha256,
    'X-Registered-SHA256': asset.registeredSha256,
    'X-Source-Hash-Status': asset.mirrorStatus,
    'X-Source-Storage': 'LOCAL_ARCHIVE',
    'X-Content-Type-Options': 'nosniff',
  };
}

function assetBufferIsValid(asset, buffer) {
  return createHash('sha256').update(buffer).digest('hex').toUpperCase() === asset.sha256.toUpperCase();
}

async function sendSourceAsset(response, assetId) {
  const asset = await readDownloadAsset(assetId);
  if (!asset) { sendJson(response,404,{ error:'SOURCE_ASSET_NOT_FOUND' }); return; }
  if (asset.contentSizeBytes > 20 * 1024 * 1024) { sendJson(response,413,{ error:'SOURCE_ASSET_TOO_LARGE' }); return; }

  const filePath = path.resolve(asset.assetLocation);
  if (!allowedLocalRoots.some((root) => filePath === root || filePath.startsWith(`${root}${path.sep}`))) {
    sendJson(response,403,{ error:'SOURCE_PATH_NOT_ALLOWED' }); return;
  }
  const details = await stat(filePath);
  if (!details.isFile()) { sendJson(response,404,{ error:'SOURCE_FILE_NOT_FOUND' }); return; }
  const buffer = await readFile(filePath);
  if (!assetBufferIsValid(asset,buffer)) { sendJson(response,409,{ error:'SOURCE_ASSET_HASH_MISMATCH',message:'The local archive no longer matches the file used by the indicator.' }); return; }
  response.writeHead(200,downloadHeaders(asset,details.size));
  response.end(buffer);
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(payload));
}

function readCookie(request, name) {
  const cookies = String(request.headers.cookie ?? '').split(';');
  for (const cookie of cookies) {
    const separator = cookie.indexOf('=');
    if (separator < 0) continue;
    if (cookie.slice(0, separator).trim() === name) return decodeURIComponent(cookie.slice(separator + 1).trim());
  }
  return null;
}

function adminSession(request) {
  const token = readCookie(request, 'laza_admin_session');
  if (!token || !/^[A-Fa-f0-9]{64}$/.test(token)) return null;
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const session = adminSessions.get(tokenHash);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    adminSessions.delete(tokenHash);
    return null;
  }
  return session;
}

function adminCookie(request, token, maxAgeSeconds) {
  const forwardedProto = String(request.headers['x-forwarded-proto'] ?? '').toLowerCase();
  const secure = forwardedProto === 'https' ? '; Secure' : '';
  return `laza_admin_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSeconds}${secure}`;
}

function adminClientKey(request) {
  return String(request.headers['cf-connecting-ip'] ?? request.socket.remoteAddress ?? 'unknown');
}

function isAdminLoginBlocked(clientKey) {
  const record = adminLoginFailures.get(clientKey);
  if (!record) return false;
  if (record.windowStartedAt + adminLoginWindowMs <= Date.now()) {
    adminLoginFailures.delete(clientKey);
    return false;
  }
  return record.failures >= adminLoginMaxFailures;
}

function registerAdminLoginFailure(clientKey) {
  const current = adminLoginFailures.get(clientKey);
  if (!current || current.windowStartedAt + adminLoginWindowMs <= Date.now()) {
    adminLoginFailures.set(clientKey, { failures: 1, windowStartedAt: Date.now() });
    return;
  }
  current.failures += 1;
}

async function readJsonBody(request, maxBytes = 16 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) throw new Error('REQUEST_BODY_TOO_LARGE');
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function verifyAdminCredentials(username, password) {
  if (!adminAuth || typeof username !== 'string' || typeof password !== 'string') return false;
  const suppliedUsername = Buffer.from(username);
  const configuredUsername = Buffer.from(adminAuth.username);
  const usernameMatches = suppliedUsername.length === configuredUsername.length
    && timingSafeEqual(suppliedUsername, configuredUsername);
  const candidateHash = pbkdf2Sync(password, adminAuth.salt, adminAuth.iterations, 32, 'sha256');
  return usernameMatches && timingSafeEqual(candidateHash, adminAuth.passwordHash);
}

function createAdminSession() {
  const token = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const session = { username: adminAuth.username, expiresAt: Date.now() + adminSessionTtlMs };
  adminSessions.set(tokenHash, session);
  return { token, session };
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

  if (request.method === 'GET' && request.url === '/api/admin/session') {
    const session = adminSession(request);
    sendJson(response, session ? 200 : 401, session
      ? { authenticated: true, username: session.username, expiresAt: new Date(session.expiresAt).toISOString() }
      : { authenticated: false });
    return;
  }

  if (request.method === 'POST' && request.url === '/api/admin/login') {
    if (!adminAuth) {
      sendJson(response, 503, { error: 'ADMIN_AUTH_NOT_CONFIGURED' });
      return;
    }
    const clientKey = adminClientKey(request);
    if (isAdminLoginBlocked(clientKey)) {
      sendJson(response, 429, { error: 'ADMIN_LOGIN_TEMPORARILY_BLOCKED', message: 'Too many failed attempts. Try again later.' });
      return;
    }
    try {
      const credentials = await readJsonBody(request);
      if (!verifyAdminCredentials(credentials.username, credentials.password)) {
        registerAdminLoginFailure(clientKey);
        sendJson(response, 401, { error: 'INVALID_ADMIN_CREDENTIALS', message: 'Invalid username or password.' });
        return;
      }
      adminLoginFailures.delete(clientKey);
      const { token, session } = createAdminSession();
      response.setHeader('Set-Cookie', adminCookie(request, token, Math.floor(adminSessionTtlMs / 1000)));
      sendJson(response, 200, { authenticated: true, username: session.username, expiresAt: new Date(session.expiresAt).toISOString() });
    } catch (error) {
      sendJson(response, error.message === 'REQUEST_BODY_TOO_LARGE' ? 413 : 400, { error: 'INVALID_LOGIN_REQUEST' });
    }
    return;
  }

  if (request.method === 'POST' && request.url === '/api/admin/logout') {
    const token = readCookie(request, 'laza_admin_session');
    if (token) adminSessions.delete(createHash('sha256').update(token).digest('hex'));
    response.setHeader('Set-Cookie', adminCookie(request, '', 0));
    sendJson(response, 200, { authenticated: false });
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

  if (request.method === 'GET' && request.url === '/api/analytics/oil-non-oil-gdp') {
    try {
      const quarters = await readOilNonOilGdp();
      sendJson(response, 200, {
        data: quarters,
        meta: {
          source: 'LAZA_DATA_PLATFORM_DEV.api.vw_ine_oil_non_oil_gdp_quarterly',
          sourceName: 'Instituto Nacional de Estatistica de Angola (INE)',
          generatedAt: new Date().toISOString(),
          observationCount: quarters.length,
          firstPeriod: quarters[0].period,
          lastPeriod: quarters.at(-1).period,
          acceptedExceptionCount: quarters.filter((item) => item.hasAcceptedException).length,
        },
      });
    } catch (error) {
      sendJson(response, 503, { error: 'SQL_SERVER_ANALYTICS_UNAVAILABLE', message: error.message });
    }
    return;
  }

  if (request.method === 'GET' && request.url === '/api/downloads/catalog') {
    try {
      const assets = await readDownloadCatalog();
      sendJson(response,200,{
        data: assets,
        meta: {
          source: 'LAZA_DATA_PLATFORM_DEV.bronze.source_asset',
          generatedAt: new Date().toISOString(),
          assetCount: assets.length,
          datasetCount: new Set(assets.map((asset) => asset.pipelineCode)).size,
        },
      });
    } catch (error) {
      sendJson(response,503,{ error:'DOWNLOAD_CATALOG_UNAVAILABLE',message:error.message });
    }
    return;
  }

  const downloadMatch = request.method === 'GET' ? request.url?.match(/^\/api\/downloads\/assets\/(\d+)$/) : null;
  if (downloadMatch) {
    try {
      await sendSourceAsset(response,Number(downloadMatch[1]));
    } catch (error) {
      if (!response.headersSent) sendJson(response,502,{ error:'SOURCE_DOWNLOAD_FAILED',message:error.message });
      else response.destroy(error);
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
