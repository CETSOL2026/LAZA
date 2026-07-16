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

async function getAdminData<T>(url: string): Promise<ApiResponse<T>> {
  const response = await fetch(url, { credentials: 'same-origin', headers: { Accept: 'application/json' } });
  if (response.status === 401) throw new Error('ADMIN_SESSION_EXPIRED');
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || payload.error || `Request failed (${response.status})`);
  }
  return response.json();
}

export const loadPipelineSummary = () => getAdminData<PipelineSummary>('/api/admin/pipelines/summary');
export const loadAdminPipelines = () => getAdminData<AdminPipeline[]>('/api/admin/pipelines');
export const loadDataQualitySummary = () => getAdminData<DataQualitySummary>('/api/admin/data-quality/summary');
export const loadAssetSummary = () => getAdminData<AssetSummary>('/api/admin/assets/summary');
export const loadPipelineDetail = (pipelineId: number) => getAdminData<PipelineDetail>(`/api/admin/pipelines/${pipelineId}/runs`);
