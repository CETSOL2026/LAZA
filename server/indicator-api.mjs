import { createServer } from 'node:http';
import { database } from './lib/sqlClient.mjs';
import { sendJson, readJsonBody } from './http/respond.mjs';
import { sendSiteAsset } from './http/staticSite.mjs';
import {
  readLatestIndicators,
  readInflationHistory,
  readExchangeHistory,
  readGdpHistory,
  readPopulationHistory,
  readBankingAssetsHistory,
  readPublicDebtHistory,
} from './data/indicators.mjs';
import {
  readOilGasAnalytics,
  readFiscalExecution,
  readSovereignYieldCurve,
  readOilNonOilGdp,
} from './data/analytics.mjs';
import {
  readAdminPipelineSummary,
  readAdminPipelines,
  readAdminPipelineDetail,
  readAdminDataQualitySummary,
  readAdminAssetSummary,
  readAdminDataLayersSummary,
  readAdminBronzeLayer,
  readAdminSilverLayer,
  readAdminGoldLayer,
} from './data/admin.mjs';
import { readDownloadCatalog, sendSourceAsset } from './data/downloads.mjs';
import {
  adminSession,
  adminCookie,
  adminClientKey,
  adminSessionTtlMs,
  isAdminAuthConfigured,
  isAdminLoginBlocked,
  registerAdminLoginFailure,
  clearAdminLoginFailures,
  verifyAdminCredentials,
  createAdminSession,
  destroyAdminSessionFromRequest,
} from './auth/adminAuth.mjs';

const port = Number(process.env.LAZA_API_PORT ?? 8790);

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
    if (!isAdminAuthConfigured()) {
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
      clearAdminLoginFailures(clientKey);
      const { token, session } = createAdminSession();
      response.setHeader('Set-Cookie', adminCookie(request, token, Math.floor(adminSessionTtlMs / 1000)));
      sendJson(response, 200, { authenticated: true, username: session.username, expiresAt: new Date(session.expiresAt).toISOString() });
    } catch (error) {
      sendJson(response, error.message === 'REQUEST_BODY_TOO_LARGE' ? 413 : 400, { error: 'INVALID_LOGIN_REQUEST' });
    }
    return;
  }

  if (request.method === 'POST' && request.url === '/api/admin/logout') {
    destroyAdminSessionFromRequest(request);
    response.setHeader('Set-Cookie', adminCookie(request, '', 0));
    sendJson(response, 200, { authenticated: false });
    return;
  }

  if (request.method === 'GET' && request.url?.startsWith('/api/admin/')) {
    const session = adminSession(request);
    if (!session) {
      sendJson(response, 401, { error: 'ADMIN_AUTH_REQUIRED', message: 'An authenticated administrator session is required.' });
      return;
    }

    try {
      if (request.url === '/api/admin/pipelines/summary') {
        const data = await readAdminPipelineSummary();
        sendJson(response, 200, { data, meta: { source: 'LAZA_DATA_PLATFORM_DEV.control.pipeline_run', generatedAt: new Date().toISOString(), readOnly: true } });
        return;
      }
      if (request.url === '/api/admin/pipelines') {
        const data = await readAdminPipelines();
        sendJson(response, 200, { data, meta: { source: 'LAZA_DATA_PLATFORM_DEV.control.pipeline_definition', generatedAt: new Date().toISOString(), pipelineCount: data.length, readOnly: true } });
        return;
      }
      const runsMatch = request.url.match(/^\/api\/admin\/pipelines\/(\d+)\/runs$/);
      if (runsMatch) {
        const pipelineId = Number(runsMatch[1]);
        if (!Number.isSafeInteger(pipelineId) || pipelineId <= 0) {
          sendJson(response, 400, { error: 'INVALID_PIPELINE_ID' });
          return;
        }
        const data = await readAdminPipelineDetail(pipelineId);
        if (!data) {
          sendJson(response, 404, { error: 'PIPELINE_NOT_FOUND' });
          return;
        }
        sendJson(response, 200, { data, meta: { source: 'LAZA_DATA_PLATFORM_DEV operational schemas', generatedAt: new Date().toISOString(), readOnly: true } });
        return;
      }
      if (request.url === '/api/admin/data-quality/summary') {
        const data = await readAdminDataQualitySummary();
        sendJson(response, 200, { data, meta: { source: 'LAZA_DATA_PLATFORM_DEV.dq', generatedAt: new Date().toISOString(), readOnly: true } });
        return;
      }
      if (request.url === '/api/admin/assets/summary') {
        const data = await readAdminAssetSummary();
        sendJson(response, 200, { data, meta: { source: 'LAZA_DATA_PLATFORM_DEV.control.source_asset_mirror', generatedAt: new Date().toISOString(), readOnly: true } });
        return;
      }
      if (request.url === '/api/admin/data-layers/summary') {
        const data = await readAdminDataLayersSummary();
        sendJson(response, 200, { data, meta: { source: 'LAZA_DATA_PLATFORM_DEV bronze, silver and gold schemas', generatedAt: new Date().toISOString(), readOnly: true } });
        return;
      }
      if (request.url === '/api/admin/data-layers/bronze') {
        const data = await readAdminBronzeLayer();
        sendJson(response, 200, { data, meta: { source: 'LAZA_DATA_PLATFORM_DEV.bronze', generatedAt: new Date().toISOString(), rowCount: data.length, readOnly: true } });
        return;
      }
      if (request.url === '/api/admin/data-layers/silver') {
        const data = await readAdminSilverLayer();
        sendJson(response, 200, { data, meta: { source: 'LAZA_DATA_PLATFORM_DEV.silver', generatedAt: new Date().toISOString(), rowCount: data.length, readOnly: true } });
        return;
      }
      if (request.url === '/api/admin/data-layers/gold') {
        const data = await readAdminGoldLayer();
        sendJson(response, 200, { data, meta: { source: 'LAZA_DATA_PLATFORM_DEV.gold', generatedAt: new Date().toISOString(), rowCount: data.length, readOnly: true } });
        return;
      }
    } catch (error) {
      sendJson(response, 503, { error: 'ADMIN_OPERATIONS_UNAVAILABLE', message: error.message });
      return;
    }

    sendJson(response, 404, { error: 'ADMIN_ENDPOINT_NOT_FOUND' });
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
