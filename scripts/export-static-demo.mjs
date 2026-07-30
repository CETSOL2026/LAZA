import { mkdir, copyFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  readLatestIndicators,
  readInflationHistory,
  readExchangeHistory,
  readGdpHistory,
  readPopulationHistory,
  readBankingAssetsHistory,
  readPublicDebtHistory,
} from '../server/data/indicators.mjs';
import {
  readOilGasAnalytics,
  readFiscalExecution,
  readSovereignYieldCurve,
  readOilNonOilGdp,
} from '../server/data/analytics.mjs';
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
} from '../server/data/admin.mjs';
import { readDownloadCatalog } from '../server/data/downloads.mjs';
import { runJsonQuery } from '../server/lib/sqlClient.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = path.join(projectRoot, 'public');
const generatedAt = new Date().toISOString();

const jsonSpaces = 2;

async function writeJson(relativePath, payload) {
  const outputPath = path.join(publicRoot, ...relativePath.split('/'));
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(payload, null, jsonSpaces)}\n`, 'utf8');
  return outputPath;
}

function indicatorHistoryPayload(data, meta) {
  return {
    data,
    meta: {
      source: 'LAZA_DATA_PLATFORM_DEV.gold.fact_indicator_observation',
      generatedAt,
      observationCount: data.length,
      firstPeriod: data[0]?.period,
      lastPeriod: data.at(-1)?.period,
      ...meta,
    },
  };
}

function analyticsPayload(data, meta) {
  return {
    data,
    meta: {
      generatedAt,
      observationCount: data.length,
      firstPeriod: data[0]?.period ?? data[0]?.periodStart ?? data[0]?.referenceDate,
      lastPeriod: data.at(-1)?.period ?? data.at(-1)?.periodStart ?? data.at(-1)?.referenceDate,
      ...meta,
    },
  };
}

async function readDownloadAssetLocations(assetIds) {
  if (!assetIds.length) return new Map();
  const query = `
SET NOCOUNT ON;
SELECT a.source_asset_id AS assetId,
       a.asset_name AS assetName,
       m.mirror_path AS assetLocation
FROM bronze.source_asset a
JOIN control.source_asset_mirror m ON m.source_asset_id=a.source_asset_id
WHERE a.source_asset_id IN (${assetIds.map((id) => Number(id)).join(',')})
FOR JSON PATH;`;
  const rows = await runJsonQuery(query);
  return new Map(rows.map((row) => [Number(row.assetId), row]));
}

async function exportDownloadAssets(catalog) {
  const assetLocations = await readDownloadAssetLocations(catalog.map((asset) => asset.assetId));
  const exported = [];

  for (const asset of catalog) {
    const location = assetLocations.get(Number(asset.assetId));
    if (!location?.assetLocation) {
      exported.push({ ...asset, staticExportStatus: 'MISSING_LOCATION' });
      continue;
    }

    const safeAssetName = String(asset.assetName)
      .replace(/[<>:"/\\|?*]/g, '_')
      .split('')
      .map((character) => (character.charCodeAt(0) < 32 ? '_' : character))
      .join('');
    const relativeUrl = `/downloads/source-assets/${asset.assetId}/${encodeURIComponent(safeAssetName)}`;
    const outputPath = path.join(publicRoot, 'downloads', 'source-assets', String(asset.assetId), safeAssetName);

    try {
      await mkdir(path.dirname(outputPath), { recursive: true });
      await copyFile(location.assetLocation, outputPath);
      exported.push({
        ...asset,
        staticUrl: relativeUrl,
        storageMode: 'STATIC_DEMO_ARCHIVE',
        staticExportStatus: 'EXPORTED',
      });
    } catch (error) {
      exported.push({
        ...asset,
        staticExportStatus: 'EXPORT_FAILED',
        staticExportError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return exported;
}

async function main() {
  const latestIndicators = await readLatestIndicators();
  const inflationHistory = await readInflationHistory();
  const exchangeHistory = await readExchangeHistory();
  const gdpHistory = await readGdpHistory();
  const populationHistory = await readPopulationHistory();
  const bankingAssetsHistory = await readBankingAssetsHistory();
  const publicDebtHistory = await readPublicDebtHistory();

  const oilGas = await readOilGasAnalytics();
  const fiscalExecution = await readFiscalExecution();
  const sovereignYieldCurve = await readSovereignYieldCurve();
  const oilNonOilGdp = await readOilNonOilGdp();

  const pipelineSummary = await readAdminPipelineSummary();
  const pipelines = await readAdminPipelines();
  const pipelineDetails = await Promise.all(
    pipelines.map((pipeline) => readAdminPipelineDetail(pipeline.pipelineId)),
  );
  const dataQualitySummary = await readAdminDataQualitySummary();
  const assetSummary = await readAdminAssetSummary();
  const dataLayersSummary = await readAdminDataLayersSummary();
  const bronzeLayer = await readAdminBronzeLayer();
  const silverLayer = await readAdminSilverLayer();
  const goldLayer = await readAdminGoldLayer();

  const catalog = await readDownloadCatalog();
  const exportedCatalog = await exportDownloadAssets(catalog);

  const outputs = [];

  outputs.push(await writeJson('api/indicators/latest', {
    data: latestIndicators,
    meta: {
      source: 'LAZA_DATA_PLATFORM_DEV.api.vw_indicator_latest',
      generatedAt,
      indicatorCount: latestIndicators.length,
      officialIndicatorCount: latestIndicators.filter((item) => item.isOfficial).length,
      staticDemo: true,
    },
  }));

  outputs.push(await writeJson('api/indicators/inflation-rate/history', indicatorHistoryPayload(inflationHistory, {
    seriesCode: 'INFLATION_RATE_AGO_INE_IPCN_YOY',
    acceptedExceptionCount: inflationHistory.filter((item) => item.hasAcceptedException).length,
    staticDemo: true,
  })));
  outputs.push(await writeJson('api/indicators/exchange-rate/history', indicatorHistoryPayload(exchangeHistory, {
    seriesCode: 'EXCHANGE_RATE_AGO_BNA_USD_REFERENCE_MONTHLY',
    sourceWarningCount: exchangeHistory.filter((item) => item.hasSourceWarning).length,
    staticDemo: true,
  })));
  outputs.push(await writeJson('api/indicators/gdp-growth/history', indicatorHistoryPayload(gdpHistory, {
    seriesCode: 'GDP_GROWTH_AGO_INE_QUARTERLY_YOY_2015',
    staticDemo: true,
  })));
  outputs.push(await writeJson('api/indicators/population/history', indicatorHistoryPayload(populationHistory, {
    seriesCode: 'POPULATION_AGO_INE_RGPH_CENSUS',
    sourceWarningCount: populationHistory.filter((item) => item.hasSourceWarning).length,
    staticDemo: true,
  })));
  outputs.push(await writeJson('api/indicators/banking-assets/history', indicatorHistoryPayload(bankingAssetsHistory, {
    seriesCode: 'BANKING_ASSETS_AGO_BNA_OSD_MONTHLY',
    sourceWarningCount: bankingAssetsHistory.filter((item) => item.hasSourceWarning).length,
    staticDemo: true,
  })));
  outputs.push(await writeJson('api/indicators/public-debt-gdp/history', indicatorHistoryPayload(publicDebtHistory, {
    seriesCode: 'PUBLIC_DEBT_GDP_AGO_UGD_OFFICIAL_COMPONENTS',
    sourceWarningCount: publicDebtHistory.filter((item) => item.hasSourceWarning).length,
    staticDemo: true,
  })));

  outputs.push(await writeJson('api/analytics/oil-gas-production', analyticsPayload(oilGas, {
    source: 'LAZA_DATA_PLATFORM_DEV.api.vw_anpg_oil_gas_monthly',
    sourceName: 'Agência Nacional de Petróleo, Gás e Biocombustíveis (ANPG)',
    sourceArchiveUrl: 'https://anpg.co.ao/producao/',
    acceptedExceptionCount: oilGas.filter((item) => item.hasAcceptedException).length,
    staticDemo: true,
  })));
  outputs.push(await writeJson('api/analytics/fiscal-execution', analyticsPayload(fiscalExecution, {
    source: 'LAZA_DATA_PLATFORM_DEV.api.vw_minfin_fiscal_execution_quarterly',
    sourceName: 'Ministry of Finance of Angola (MINFIN)',
    sourceArchiveUrl: 'https://www.minfin.gov.ao/oge/reoge',
    acceptedExceptionCount: fiscalExecution.filter((item) => item.hasAcceptedException).length,
    staticDemo: true,
  })));
  outputs.push(await writeJson('api/analytics/sovereign-yield-curve', {
    data: sovereignYieldCurve,
    meta: {
      source: 'LAZA_DATA_PLATFORM_DEV.api.vw_bodiva_sovereign_yield_curve',
      sourceName: 'Bolsa de Divida e Valores de Angola (BODIVA)',
      sourceArchiveUrl: 'https://www.bodiva.ao/estatistica',
      generatedAt,
      observationCount: sovereignYieldCurve.length * 12,
      snapshotCount: sovereignYieldCurve.length,
      firstPeriod: sovereignYieldCurve[0]?.referenceDate,
      lastPeriod: sovereignYieldCurve.at(-1)?.referenceDate,
      interpolationApplied: false,
      staticDemo: true,
    },
  }));
  outputs.push(await writeJson('api/analytics/oil-non-oil-gdp', analyticsPayload(oilNonOilGdp, {
    source: 'LAZA_DATA_PLATFORM_DEV.api.vw_ine_oil_non_oil_gdp_quarterly',
    sourceName: 'Instituto Nacional de Estatistica de Angola (INE)',
    acceptedExceptionCount: oilNonOilGdp.filter((item) => item.hasAcceptedException).length,
    staticDemo: true,
  })));

  outputs.push(await writeJson('api/downloads/catalog', {
    data: exportedCatalog,
    meta: {
      source: 'LAZA_DATA_PLATFORM_DEV.bronze.source_asset',
      generatedAt,
      assetCount: exportedCatalog.length,
      exportedAssetCount: exportedCatalog.filter((asset) => asset.staticExportStatus === 'EXPORTED').length,
      datasetCount: new Set(exportedCatalog.map((asset) => asset.pipelineCode)).size,
      staticDemo: true,
    },
  }));

  outputs.push(await writeJson('static-api/admin/session', {
    authenticated: true,
    username: 'demo-admin',
    displayName: 'LAZA Demo Administrator',
    role: 'admin',
    scope: 'Static demo operations console',
    expiresAt: '2099-12-31T23:59:59.000Z',
    staticDemo: true,
  }));
  outputs.push(await writeJson('static-api/admin/pipelines-summary', { data: pipelineSummary, meta: { source: 'LAZA_DATA_PLATFORM_DEV.control.pipeline_run', generatedAt, readOnly: true, staticDemo: true } }));
  outputs.push(await writeJson('static-api/admin/pipelines', { data: pipelines, meta: { source: 'LAZA_DATA_PLATFORM_DEV.control.pipeline_definition', generatedAt, pipelineCount: pipelines.length, readOnly: true, staticDemo: true } }));
  for (const detail of pipelineDetails.filter(Boolean)) {
    outputs.push(await writeJson(`static-api/admin/pipeline-runs/${detail.pipeline.pipelineId}`, {
      data: detail,
      meta: { source: 'LAZA_DATA_PLATFORM_DEV operational schemas', generatedAt, readOnly: true, staticDemo: true },
    }));
  }
  outputs.push(await writeJson('static-api/admin/data-quality-summary', { data: dataQualitySummary, meta: { source: 'LAZA_DATA_PLATFORM_DEV.dq', generatedAt, readOnly: true, staticDemo: true } }));
  outputs.push(await writeJson('static-api/admin/assets-summary', { data: assetSummary, meta: { source: 'LAZA_DATA_PLATFORM_DEV.control.source_asset_mirror', generatedAt, readOnly: true, staticDemo: true } }));
  outputs.push(await writeJson('static-api/admin/data-layers-summary', { data: dataLayersSummary, meta: { source: 'LAZA_DATA_PLATFORM_DEV bronze, silver and gold schemas', generatedAt, readOnly: true, staticDemo: true } }));
  outputs.push(await writeJson('static-api/admin/data-layers-bronze', { data: bronzeLayer, meta: { source: 'LAZA_DATA_PLATFORM_DEV.bronze', generatedAt, rowCount: bronzeLayer.length, readOnly: true, staticDemo: true } }));
  outputs.push(await writeJson('static-api/admin/data-layers-silver', { data: silverLayer, meta: { source: 'LAZA_DATA_PLATFORM_DEV.silver', generatedAt, rowCount: silverLayer.length, readOnly: true, staticDemo: true } }));
  outputs.push(await writeJson('static-api/admin/data-layers-gold', { data: goldLayer, meta: { source: 'LAZA_DATA_PLATFORM_DEV.gold', generatedAt, rowCount: goldLayer.length, readOnly: true, staticDemo: true } }));

  outputs.push(await writeJson('api/static-demo/manifest', {
    generatedAt,
    sourceDatabase: 'LAZA_DATA_PLATFORM_DEV',
    publicApiFiles: outputs.length + 1,
    downloadAssets: {
      catalogCount: exportedCatalog.length,
      exportedCount: exportedCatalog.filter((asset) => asset.staticExportStatus === 'EXPORTED').length,
      failedCount: exportedCatalog.filter((asset) => asset.staticExportStatus !== 'EXPORTED').length,
    },
  }));

  console.log(`Static demo export completed at ${generatedAt}`);
  console.log(`Generated ${outputs.length} public API files.`);
  console.log(`Exported ${exportedCatalog.filter((asset) => asset.staticExportStatus === 'EXPORTED').length}/${exportedCatalog.length} source assets.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
