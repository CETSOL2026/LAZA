import { execFile } from 'node:child_process';
import { createServer } from 'node:http';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const port = Number(process.env.LAZA_API_PORT ?? 8790);
const sqlcmd = process.env.LAZA_SQLCMD ?? 'sqlcmd.exe';
const instance = process.env.LAZA_SQL_INSTANCE ?? '.\\SQLEXPRESS';
const database = process.env.LAZA_SQL_DATABASE ?? 'LAZA_DATA_PLATFORM_DEV';

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

let cache = null;
let cachedAt = 0;
let historyCache = null;
let historyCachedAt = 0;
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

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(payload));
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
