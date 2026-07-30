export interface PipelineSummary {
  activePipelines: number;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  runningRuns: number;
  successRatePct: number;
  totalRowsRead: number;
  totalRowsWritten: number;
  totalRowsRejected: number;
  lastRunAt?: string;
  lastCompletedAt?: string;
}

export interface AdminPipeline {
  pipelineId: number;
  pipelineCode: string;
  pipelineName: string;
  sourceSystem: string;
  isActive: boolean;
  latestRunId?: number;
  latestStatus?: string;
  triggerType?: string;
  startedAt?: string;
  endedAt?: string;
  durationMs?: number;
  rowsRead: number;
  rowsWritten: number;
  rowsRejected: number;
  errorMessage?: string;
  initiatedBy?: string;
  batchCount: number;
  dqPassCount: number;
  dqWarningCount: number;
  dqFailCount: number;
}

export interface DataQualitySummary {
  totalExecutions: number;
  passedExecutions: number;
  warningExecutions: number;
  passedResults: number;
  warningResults: number;
  failedResults: number;
  averageQualityScore?: number;
  approvedExceptions: number;
  openExceptions: number;
  approvals: number;
}

export interface AssetSummary {
  totalAssets: number;
  totalMirrorBytes: number;
  hashVerifiedAssets: number;
  hashMismatchAssets: number;
  lastVerifiedAt?: string;
  statuses: Array<{ status: string; total: number; totalBytes: number }>;
}

export interface PipelineDetail {
  pipeline: Pick<AdminPipeline, 'pipelineId' | 'pipelineCode' | 'pipelineName' | 'sourceSystem' | 'isActive'> & { createdAt: string };
  runs: Array<{ runId: number; correlationId: string; status: string; triggerType: string; startedAt: string; endedAt?: string; durationMs: number; rowsRead: number; rowsWritten: number; rowsRejected: number; errorMessage?: string; initiatedBy?: string }>;
  batches: Array<{ batchId: number; batchCode: string; dataClassification: string; status: string; acquiredAt: string; loadedAt?: string; sourceRecordCount: number; acceptedRecordCount: number; rejectedRecordCount: number }>;
  dqResults: Array<{ status: string; total: number }>;
  events: Array<{ eventId: number; eventType: string; eventLevel: string; message: string; occurredAt: string }>;
  assets: Array<{ assetId: number; assetName: string; assetType: string; publicationDate?: string; registeredSizeBytes?: number; mirrorSizeBytes?: number; mirrorStatus?: string; hashMatchesRegistered?: boolean; lastVerifiedAt?: string }>;
}

interface ApiResponse<T> { data: T; meta: { generatedAt: string; source: string } }

const adminApi = {
  pipelineSummary: import.meta.env.VITE_LAZA_STATIC_DEMO === 'true' ? '/static-api/admin/pipelines-summary' : '/api/admin/pipelines/summary',
  pipelines: import.meta.env.VITE_LAZA_STATIC_DEMO === 'true' ? '/static-api/admin/pipelines' : '/api/admin/pipelines',
  dataQualitySummary: import.meta.env.VITE_LAZA_STATIC_DEMO === 'true' ? '/static-api/admin/data-quality-summary' : '/api/admin/data-quality/summary',
  assetSummary: import.meta.env.VITE_LAZA_STATIC_DEMO === 'true' ? '/static-api/admin/assets-summary' : '/api/admin/assets/summary',
  pipelineDetail: (pipelineId: number) => import.meta.env.VITE_LAZA_STATIC_DEMO === 'true' ? `/static-api/admin/pipeline-runs/${pipelineId}` : `/api/admin/pipelines/${pipelineId}/runs`,
};

async function getAdminData<T>(url: string): Promise<ApiResponse<T>> {
  const response = await fetch(url, { credentials: 'same-origin', headers: { Accept: 'application/json' } });
  if (response.status === 401) throw new Error('ADMIN_SESSION_EXPIRED');
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || payload.error || `Request failed (${response.status})`);
  }
  return response.json();
}

export const loadPipelineSummary = () => getAdminData<PipelineSummary>(adminApi.pipelineSummary);
export const loadAdminPipelines = () => getAdminData<AdminPipeline[]>(adminApi.pipelines);
export const loadDataQualitySummary = () => getAdminData<DataQualitySummary>(adminApi.dataQualitySummary);
export const loadAssetSummary = () => getAdminData<AssetSummary>(adminApi.assetSummary);
export const loadPipelineDetail = (pipelineId: number) => getAdminData<PipelineDetail>(adminApi.pipelineDetail(pipelineId));
