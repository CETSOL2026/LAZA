import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, CheckCircle2, ChevronRight, Clock3, Database,
  FileCheck2, Gauge, RefreshCw, Search, ShieldCheck, X,
} from 'lucide-react';
import {
  type AdminPipeline, type AssetSummary, type DataQualitySummary, type PipelineDetail, type PipelineSummary,
  loadAdminPipelines, loadAssetSummary, loadDataQualitySummary, loadPipelineDetail, loadPipelineSummary,
} from '../data/adminOperations';

const number = new Intl.NumberFormat('en-US');
const dateTime = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

function formatDate(value?: string) { return value ? dateTime.format(new Date(value)) : '—'; }
function formatDuration(ms?: number) {
  if (ms === undefined || ms === null) return '—';
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)} s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}
function formatBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}
function statusStyle(status?: string) {
  if (status === 'SUCCEEDED' || status === 'PASS' || status === 'PASSED' || status === 'VERIFIED') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'RUNNING' || status === 'STARTED') return 'bg-blue-50 text-blue-700 border-blue-200';
  if (status === 'WARN' || status === 'WARNING' || status === 'PUBLISHER_UPDATED_HTML') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-red-50 text-red-700 border-red-200';
}
function StatusBadge({ status = 'NOT RUN' }: { status?: string }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusStyle(status)}`}>{status.replaceAll('_', ' ')}</span>;
}

function MetricCard({ label, value, note, icon: Icon, tone = 'red' }: { label: string; value: string; note: string; icon: typeof Activity; tone?: 'red' | 'green' | 'blue' | 'amber' }) {
  const tones = { red: 'bg-red-50 text-primary', green: 'bg-emerald-50 text-emerald-600', blue: 'bg-blue-50 text-blue-600', amber: 'bg-amber-50 text-amber-600' };
  return <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-2xl text-foreground">{value}</p></div>
      <span className={`rounded-lg p-2 ${tones[tone]}`}><Icon className="h-4 w-4" /></span>
    </div>
    <p className="mt-2 text-xs text-muted-foreground">{note}</p>
  </div>;
}

function PipelineDrawer({ detail, loading, onClose }: { detail: PipelineDetail | null; loading: boolean; onClose: () => void }) {
  return <>
    <button aria-label="Close pipeline details" onClick={onClose} className="fixed inset-0 z-40 bg-black/20" />
    <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl overflow-y-auto border-l border-border bg-white shadow-2xl">
      <div className="sticky top-0 z-10 flex items-start justify-between border-b border-border bg-white/95 p-5 backdrop-blur">
        <div><p className="text-xs font-medium uppercase tracking-wider text-primary">Pipeline detail</p><h2 className="mt-1 text-xl text-foreground">{detail?.pipeline.pipelineName ?? 'Loading pipeline…'}</h2><p className="mt-1 font-mono text-xs text-muted-foreground">{detail?.pipeline.pipelineCode}</p></div>
        <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><X className="h-5 w-5" /></button>
      </div>
      {loading || !detail ? <div className="flex h-64 items-center justify-center text-sm text-muted-foreground"><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading operational evidence…</div> : <div className="space-y-6 p-5">
        <div className="grid grid-cols-3 gap-3 rounded-xl border border-border bg-muted/20 p-4 text-sm">
          <div><p className="text-xs text-muted-foreground">Source</p><p className="mt-1">{detail.pipeline.sourceSystem}</p></div>
          <div><p className="text-xs text-muted-foreground">Recent runs</p><p className="mt-1">{detail.runs.length}</p></div>
          <div><p className="text-xs text-muted-foreground">Governed assets</p><p className="mt-1">{detail.assets.length}</p></div>
        </div>
        <section><h3 className="mb-3 text-sm text-foreground">Recent runs</h3><div className="overflow-hidden rounded-xl border border-border">
          {detail.runs.length ? detail.runs.slice(0, 10).map((run) => <div key={run.runId} className="grid grid-cols-[1fr_auto] gap-3 border-b border-border/60 p-3 last:border-0">
            <div><div className="flex items-center gap-2"><StatusBadge status={run.status} /><span className="text-xs text-muted-foreground">#{run.runId} · {run.triggerType}</span></div><p className="mt-2 text-xs text-muted-foreground">{formatDate(run.startedAt)} · {formatDuration(run.durationMs)}</p></div>
            <div className="text-right text-xs"><p>{number.format(run.rowsWritten ?? 0)} written</p><p className="mt-1 text-muted-foreground">{number.format(run.rowsRejected ?? 0)} rejected</p></div>
          </div>) : <p className="p-4 text-sm text-muted-foreground">No runs registered.</p>}
        </div></section>
        <section><h3 className="mb-3 text-sm text-foreground">Data quality evidence</h3><div className="flex flex-wrap gap-2">{detail.dqResults.length ? detail.dqResults.map((item) => <span key={item.status} className={`rounded-lg border px-3 py-2 text-xs ${statusStyle(item.status)}`}>{item.status}: {number.format(item.total)}</span>) : <span className="text-sm text-muted-foreground">No DQ results associated with this pipeline.</span>}</div></section>
        <section><h3 className="mb-3 text-sm text-foreground">Latest batches</h3><div className="space-y-2">{detail.batches.slice(0, 8).map((batch) => <div key={batch.batchId} className="rounded-lg border border-border p-3"><div className="flex items-center justify-between gap-2"><p className="truncate font-mono text-xs">{batch.batchCode}</p><StatusBadge status={batch.status} /></div><p className="mt-2 text-xs text-muted-foreground">{batch.dataClassification} · {number.format(batch.acceptedRecordCount ?? 0)} accepted · {number.format(batch.rejectedRecordCount ?? 0)} rejected</p></div>)}</div></section>
        <section><h3 className="mb-3 text-sm text-foreground">Source assets</h3><div className="space-y-2">{detail.assets.slice(0, 10).map((asset) => <div key={asset.assetId} className="flex items-center justify-between gap-4 rounded-lg border border-border p-3"><div className="min-w-0"><p className="truncate text-sm">{asset.assetName}</p><p className="mt-1 text-xs text-muted-foreground">{asset.assetType} · {formatBytes(asset.mirrorSizeBytes ?? asset.registeredSizeBytes)}</p></div><StatusBadge status={asset.mirrorStatus ?? 'NOT MIRRORED'} /></div>)}</div></section>
        <section><h3 className="mb-3 text-sm text-foreground">Audit events</h3><div className="space-y-2">{detail.events.length ? detail.events.slice(0, 10).map((event) => <div key={event.eventId} className="rounded-lg border border-border p-3"><div className="flex items-center justify-between"><p className="text-xs font-medium">{event.eventType}</p><span className="text-xs text-muted-foreground">{formatDate(event.occurredAt)}</span></div><p className="mt-1 text-xs text-muted-foreground">{event.message}</p></div>) : <p className="text-sm text-muted-foreground">No audit events registered.</p>}</div></section>
      </div>}
    </aside>
  </>;
}

export function PipelineOperations({ onSessionExpired }: { onSessionExpired: () => void }) {
  const [summary, setSummary] = useState<PipelineSummary | null>(null);
  const [pipelines, setPipelines] = useState<AdminPipeline[]>([]);
  const [dq, setDq] = useState<DataQualitySummary | null>(null);
  const [assets, setAssets] = useState<AssetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [source, setSource] = useState('ALL');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<PipelineDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const refresh = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true); else setLoading(true);
    try {
      const [summaryResponse,pipelinesResponse,dqResponse,assetResponse] = await Promise.all([loadPipelineSummary(),loadAdminPipelines(),loadDataQualitySummary(),loadAssetSummary()]);
      setSummary(summaryResponse.data); setPipelines(pipelinesResponse.data); setDq(dqResponse.data); setAssets(assetResponse.data);
      setLastRefresh(new Date(summaryResponse.meta.generatedAt)); setError('');
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Unable to load pipeline operations.';
      if (message === 'ADMIN_SESSION_EXPIRED') onSessionExpired(); else setError(message);
    } finally { setLoading(false); setRefreshing(false); }
  }, [onSessionExpired]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount + poll, not a derived-state mirror
  useEffect(() => { void refresh(); const timer = window.setInterval(() => void refresh(true), 30000); return () => window.clearInterval(timer); }, [refresh]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch keyed on selectedId
  useEffect(() => { if (selectedId === null) return; setDetailLoading(true); setDetail(null); loadPipelineDetail(selectedId).then((response) => setDetail(response.data)).catch((reason) => { if (reason instanceof Error && reason.message === 'ADMIN_SESSION_EXPIRED') onSessionExpired(); else setError(reason instanceof Error ? reason.message : 'Unable to load pipeline detail.'); }).finally(() => setDetailLoading(false)); }, [selectedId,onSessionExpired]);

  const sources = useMemo(() => [...new Set(pipelines.map((item) => item.sourceSystem))].sort(), [pipelines]);
  const filtered = useMemo(() => pipelines.filter((item) => {
    const matchesText = `${item.pipelineName} ${item.pipelineCode} ${item.sourceSystem}`.toLowerCase().includes(search.toLowerCase());
    return matchesText && (status === 'ALL' || item.latestStatus === status) && (source === 'ALL' || item.sourceSystem === source);
  }), [pipelines,search,status,source]);

  return <div className="min-h-full">
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2"><h1 className="text-foreground">Pipeline Operations</h1><span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] text-blue-700">Read only</span></div><p className="mt-1 text-sm text-muted-foreground">Operational health, data quality and governed source assets</p></div><div className="flex items-center gap-3"><p className="text-right text-xs text-muted-foreground">Refreshes every 30 seconds<br />Last update: {lastRefresh ? dateTime.format(lastRefresh) : '—'}</p><button onClick={() => void refresh(true)} disabled={refreshing} className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh</button></div></div>
    {error && <div className="mb-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertTriangle className="h-4 w-4" />{error}</div>}
    {loading ? <div className="flex h-64 items-center justify-center text-sm text-muted-foreground"><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading governed operations…</div> : <>
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Active pipelines" value={number.format(summary?.activePipelines ?? 0)} note={`${number.format(summary?.totalRuns ?? 0)} runs registered`} icon={Activity} tone="red" />
        <MetricCard label="Success rate" value={`${summary?.successRatePct ?? 0}%`} note={`${number.format(summary?.failedRuns ?? 0)} failed · ${number.format(summary?.runningRuns ?? 0)} running`} icon={CheckCircle2} tone="green" />
        <MetricCard label="Rows published" value={number.format(summary?.totalRowsWritten ?? 0)} note={`${number.format(summary?.totalRowsRejected ?? 0)} rejected`} icon={Database} tone="blue" />
        <MetricCard label="DQ results" value={number.format((dq?.passedResults ?? 0) + (dq?.warningResults ?? 0) + (dq?.failedResults ?? 0))} note={`${number.format(dq?.warningResults ?? 0)} warnings · ${number.format(dq?.failedResults ?? 0)} failed`} icon={ShieldCheck} tone="amber" />
        <MetricCard label="Governed assets" value={number.format(assets?.totalAssets ?? 0)} note={`${formatBytes(assets?.totalMirrorBytes)} archived locally`} icon={FileCheck2} tone="green" />
      </div>
      <div className={`mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 ${summary?.failedRuns ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}><div className="flex items-center gap-3">{summary?.failedRuns ? <AlertTriangle className="h-5 w-5 text-red-600" /> : <CheckCircle2 className="h-5 w-5 text-emerald-600" />}<div><p className="text-sm text-foreground">{summary?.failedRuns ? 'Pipeline attention required' : 'All registered executions completed successfully'}</p><p className="text-xs text-muted-foreground">Latest run: {formatDate(summary?.lastRunAt)} · DQ average score: {dq?.averageQualityScore ?? '—'} · Open exceptions: {dq?.openExceptions ?? 0}</p></div></div><div className="flex flex-wrap gap-2">{assets?.statuses.map((item) => <span key={item.status} className={`rounded-full border px-2.5 py-1 text-[11px] ${statusStyle(item.status)}`}>{item.status.replaceAll('_',' ')}: {item.total}</span>)}</div></div>
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-white p-4 shadow-sm"><div className="relative min-w-[220px] flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search pipeline, code or source…" className="w-full rounded-lg border border-border bg-muted/20 py-2 pl-9 pr-3 text-sm outline-none focus:border-primary" /></div><select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-border bg-white px-3 py-2 text-sm"><option value="ALL">All statuses</option><option value="SUCCEEDED">Succeeded</option><option value="RUNNING">Running</option><option value="FAILED">Failed</option></select><select value={source} onChange={(event) => setSource(event.target.value)} className="rounded-lg border border-border bg-white px-3 py-2 text-sm"><option value="ALL">All sources</option>{sources.map((item) => <option key={item}>{item}</option>)}</select></div>
      <div className="overflow-x-auto rounded-xl border border-border bg-white shadow-sm"><table className="w-full min-w-[1050px]"><thead><tr className="border-b border-border bg-muted/30">{['Pipeline','Source','Status','Last run','Duration','Rows read','Written','Rejected','Trigger',''].map((label) => <th key={label} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{label}</th>)}</tr></thead><tbody>{filtered.map((pipeline) => <tr key={pipeline.pipelineId} onClick={() => setSelectedId(pipeline.pipelineId)} className="cursor-pointer border-b border-border/60 hover:bg-muted/20"><td className="px-4 py-4"><p className="text-sm text-foreground">{pipeline.pipelineName}</p><p className="mt-1 font-mono text-[11px] text-muted-foreground">{pipeline.pipelineCode}</p></td><td className="px-4 py-4 text-sm text-muted-foreground">{pipeline.sourceSystem}</td><td className="px-4 py-4"><StatusBadge status={pipeline.latestStatus} /></td><td className="px-4 py-4 text-xs text-muted-foreground">{formatDate(pipeline.startedAt)}</td><td className="px-4 py-4 text-xs text-muted-foreground"><Clock3 className="mr-1 inline h-3.5 w-3.5" />{formatDuration(pipeline.durationMs)}</td><td className="px-4 py-4 text-sm">{number.format(pipeline.rowsRead ?? 0)}</td><td className="px-4 py-4 text-sm">{number.format(pipeline.rowsWritten ?? 0)}</td><td className={`px-4 py-4 text-sm ${pipeline.rowsRejected ? 'text-red-600' : ''}`}>{number.format(pipeline.rowsRejected ?? 0)}</td><td className="px-4 py-4 text-xs text-muted-foreground">{pipeline.triggerType ?? '—'}</td><td className="px-4 py-4"><ChevronRight className="h-4 w-4 text-muted-foreground" /></td></tr>)}</tbody></table>{!filtered.length && <div className="p-10 text-center text-sm text-muted-foreground">No pipelines match the selected filters.</div>}<div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground"><span>{filtered.length} of {pipelines.length} pipelines</span><span><Gauge className="mr-1 inline h-3.5 w-3.5" />Source: SQL Server operational schemas</span></div></div>
    </>}
    {selectedId !== null && <PipelineDrawer detail={detail} loading={detailLoading} onClose={() => { setSelectedId(null); setDetail(null); }} />}
  </div>;
}
