export interface LayerReconciliation {
  pipelineId: number;
  pipelineCode: string;
  pipelineName: string;
  sourceSystem: string;
  bronzeAssets: number;
  bronzeRecords: number;
  silverObservations: number;
  goldFacts: number;
  warnings: number;
  publishedFacts: number;
  demonstrationFacts: number;
  silverToGoldPct?: number;
}

export interface DataLayersSummary {
  bronzeAssets: number;
  bronzeMirroredAssets: number;
  bronzeRawRecords: number;
  bronzeAcceptedRecords: number;
  bronzeRejectedRecords: number;
  bronzeFreshnessAt?: string;
  silverIndicators: number;
  silverSeries: number;
  silverObservations: number;
  silverPassedObservations: number;
  silverWarningObservations: number;
  silverLineageRecords: number;
  silverFreshnessAt?: string;
  goldIndicators: number;
  goldSeries: number;
  goldFacts: number;
  goldPublishedFacts: number;
  goldDemonstrationFacts: number;
  goldLineageRecords: number;
  goldFreshnessAt?: string;
  bronzeToSilverYieldPct: number;
  silverToGoldCoveragePct: number;
  silverLineageCoveragePct: number;
  goldLineageCoveragePct: number;
  reconciliation: LayerReconciliation[];
}

export interface BronzeAsset {
  assetId: number;
  assetName: string;
  assetType: string;
  sourceName: string;
  organizationName: string;
  pipelineCode: string;
  batchCode: string;
  batchStatus: string;
  publicationDate?: string;
  acquiredAt: string;
  sourceSizeBytes?: number;
  isOfficial: boolean;
  rawRecords: number;
  acceptedRecords: number;
  rejectedRecords: number;
  mirrorStatus?: string;
  mirrorSizeBytes?: number;
  hashMatchesRegistered?: boolean;
  lastVerifiedAt?: string;
}

export interface SilverIndicator {
  indicatorId: number;
  indicatorCode: string;
  indicatorName: string;
  domainName: string;
  accountableOwner?: string;
  isActive: boolean;
  seriesCount: number;
  observationCount: number;
  sourceCount: number;
  passedCount: number;
  warningCount: number;
  officialCount: number;
  firstPeriod?: string;
  lastPeriod?: string;
  refreshedAt?: string;
}

export interface GoldIndicator {
  indicatorKey: number;
  indicatorCode: string;
  indicatorName: string;
  domainName: string;
  isActive: boolean;
  seriesCount: number;
  factCount: number;
  sourceCount: number;
  publishedCount: number;
  demonstrationCount: number;
  averageQualityScore?: number;
  latestPeriod?: string;
  publishedAt?: string;
  sources?: string;
}

interface ApiResponse<T> { data: T; meta: { source: string; generatedAt: string } }

const adminLayerApi = {
  summary: import.meta.env.VITE_LAZA_STATIC_DEMO === 'true' ? '/static-api/admin/data-layers-summary' : '/api/admin/data-layers/summary',
  bronze: import.meta.env.VITE_LAZA_STATIC_DEMO === 'true' ? '/static-api/admin/data-layers-bronze' : '/api/admin/data-layers/bronze',
  silver: import.meta.env.VITE_LAZA_STATIC_DEMO === 'true' ? '/static-api/admin/data-layers-silver' : '/api/admin/data-layers/silver',
  gold: import.meta.env.VITE_LAZA_STATIC_DEMO === 'true' ? '/static-api/admin/data-layers-gold' : '/api/admin/data-layers/gold',
};

async function getLayerData<T>(url: string): Promise<ApiResponse<T>> {
  const response = await fetch(url, { credentials: 'same-origin', headers: { Accept: 'application/json' } });
  if (response.status === 401) throw new Error('ADMIN_SESSION_EXPIRED');
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || payload.error || `Request failed (${response.status})`);
  }
  return response.json();
}

export const loadDataLayersSummary = () => getLayerData<DataLayersSummary>(adminLayerApi.summary);
export const loadBronzeLayer = () => getLayerData<BronzeAsset[]>(adminLayerApi.bronze);
export const loadSilverLayer = () => getLayerData<SilverIndicator[]>(adminLayerApi.silver);
export const loadGoldLayer = () => getLayerData<GoldIndicator[]>(adminLayerApi.gold);
