export interface SourceDownloadAsset {
  assetId: number;
  pipelineCode: string;
  batchCode: string;
  sourceCode: string;
  sourceName: string;
  organizationName: string;
  sourceHomepageUrl: string;
  assetType: string;
  assetName: string;
  publicationDate?: string;
  contentSizeBytes: number;
  sha256: string;
  registeredSha256: string;
  mirrorStatus: 'VERIFIED' | 'PUBLISHER_UPDATED_HTML';
  storageMode: 'LOCAL_ARCHIVE' | 'STATIC_DEMO_ARCHIVE';
  isRemote: boolean;
  staticUrl?: string;
  staticExportStatus?: 'EXPORTED' | 'MISSING_LOCATION' | 'EXPORT_FAILED';
  staticExportError?: string;
}

export interface SourceDownloadCatalogResponse {
  data: SourceDownloadAsset[];
  meta: {
    source: string;
    generatedAt: string;
    assetCount: number;
    datasetCount: number;
  };
}

export async function loadSourceDownloadCatalog(signal?: AbortSignal): Promise<SourceDownloadCatalogResponse> {
  const response = await fetch('/api/downloads/catalog', { signal });
  if (!response.ok) throw new Error(`Download catalog API returned HTTP ${response.status}.`);
  const payload = await response.json() as SourceDownloadCatalogResponse;
  if (!Array.isArray(payload.data) || payload.data.length === 0) throw new Error('Download catalog returned no official assets.');
  return payload;
}

export function sourceDownloadUrl(asset: Pick<SourceDownloadAsset, 'assetId' | 'staticUrl'> | number) {
  if (typeof asset === 'number') return `/api/downloads/assets/${asset}`;
  return asset.staticUrl ?? `/api/downloads/assets/${asset.assetId}`;
}
