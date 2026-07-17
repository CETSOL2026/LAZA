import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { runJsonQuery } from '../lib/sqlClient.mjs';
import { sendJson } from '../http/respond.mjs';

const cacheTtlMs = 30_000;

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

let downloadCatalogCache = null;
let downloadCatalogCachedAt = 0;

export async function readDownloadCatalog() {
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

export async function sendSourceAsset(response, assetId) {
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
