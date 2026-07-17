import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Database, Layers3, RefreshCw, Search, ShieldCheck, TriangleAlert } from 'lucide-react';
import {
  type BronzeAsset, type DataLayersSummary, type GoldIndicator, type SilverIndicator,
  loadBronzeLayer, loadDataLayersSummary, loadGoldLayer, loadSilverLayer,
} from '../data/adminDataLayers';

type Layer = 'bronze' | 'silver' | 'gold';
const number = new Intl.NumberFormat('en-US');
const dateTime = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

function formatDate(value?: string, includeTime = false) {
  if (!value) return '—';
  return includeTime ? dateTime.format(new Date(value)) : new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(value));
}
function formatBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}
function badgeClass(status?: string) {
  if (['ACCEPTED','PASSED','PUBLISHED','VERIFIED','SUCCEEDED','LOADED'].includes(status ?? '')) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (['WARNING','PUBLISHER_UPDATED_HTML','DEMONSTRATION'].includes(status ?? '')) return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-slate-200 bg-slate-50 text-slate-600';
}
function Badge({ status = 'NOT AVAILABLE' }: { status?: string }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${badgeClass(status)}`}>{status.replaceAll('_',' ')}</span>;
}

function LayerCard({ layer, title, primary, secondary, freshness, active, onClick }: { layer: Layer; title: string; primary: string; secondary: string; freshness?: string; active: boolean; onClick: () => void }) {
  const styles = {
    bronze: { border: 'border-orange-300', background: 'from-orange-50 to-amber-50', icon: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
    silver: { border: 'border-slate-300', background: 'from-slate-50 to-blue-50', icon: 'bg-slate-200 text-slate-700', dot: 'bg-slate-500' },
    gold: { border: 'border-yellow-300', background: 'from-yellow-50 to-amber-50', icon: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  }[layer];
  return <button onClick={onClick} className={`flex-1 rounded-2xl border bg-gradient-to-br p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${styles.border} ${styles.background} ${active ? 'ring-2 ring-primary/20 shadow-md' : ''}`}>
    <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${styles.dot}`} /><p className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">{layer} layer</p></div><h3 className="mt-3 text-xl text-foreground">{title}</h3></div><span className={`rounded-xl p-2.5 ${styles.icon}`}><Database className="h-5 w-5" /></span></div>
    <p className="mt-5 text-2xl text-foreground">{primary}</p><p className="mt-1 text-xs text-muted-foreground">{secondary}</p><p className="mt-4 text-[11px] text-muted-foreground">Freshness: {formatDate(freshness,true)}</p>
  </button>;
}

function BronzeTable({ rows, search }: { rows: BronzeAsset[]; search: string }) {
  const filtered = rows.filter((row) => `${row.assetName} ${row.sourceName} ${row.organizationName} ${row.pipelineCode} ${row.batchCode}`.toLowerCase().includes(search.toLowerCase()));
  return <DataTable footer={`${filtered.length} of ${rows.length} source assets`} headers={['Source asset','Official source','Pipeline / batch','Type','Raw records','Local mirror','Acquired']}>
    {filtered.map((row) => <tr key={row.assetId} className="border-b border-border/60 hover:bg-muted/20"><td className="px-4 py-4"><p className="max-w-[260px] truncate text-sm text-foreground" title={row.assetName}>{row.assetName}</p><p className="mt-1 text-xs text-muted-foreground">#{row.assetId} · {formatBytes(row.sourceSizeBytes)}</p></td><td className="px-4 py-4"><p className="text-sm">{row.sourceName}</p><p className="mt-1 text-xs text-muted-foreground">{row.organizationName}</p></td><td className="px-4 py-4"><p className="font-mono text-[11px]">{row.pipelineCode}</p><p className="mt-1 max-w-[180px] truncate font-mono text-[10px] text-muted-foreground">{row.batchCode}</p></td><td className="px-4 py-4"><Badge status={row.assetType} /></td><td className="px-4 py-4"><p className="text-sm">{number.format(row.rawRecords)}</p><p className={`mt-1 text-xs ${row.rejectedRecords ? 'text-red-600' : 'text-muted-foreground'}`}>{number.format(row.rejectedRecords)} rejected</p></td><td className="px-4 py-4"><Badge status={row.mirrorStatus ?? 'NOT MIRRORED'} /><p className="mt-1 text-xs text-muted-foreground">{formatBytes(row.mirrorSizeBytes)}</p></td><td className="px-4 py-4 text-xs text-muted-foreground">{formatDate(row.acquiredAt,true)}</td></tr>)}
  </DataTable>;
}

function SilverTable({ rows, search }: { rows: SilverIndicator[]; search: string }) {
  const filtered = rows.filter((row) => `${row.indicatorName} ${row.indicatorCode} ${row.domainName} ${row.accountableOwner ?? ''}`.toLowerCase().includes(search.toLowerCase()));
  return <DataTable footer={`${filtered.length} of ${rows.length} normalized indicators`} headers={['Indicator','Domain','Series','Observations','Quality','Period coverage','Owner']}>
    {filtered.map((row) => <tr key={row.indicatorId} className="border-b border-border/60 hover:bg-muted/20"><td className="px-4 py-4"><p className="text-sm text-foreground">{row.indicatorName}</p><p className="mt-1 font-mono text-[11px] text-muted-foreground">{row.indicatorCode}</p></td><td className="px-4 py-4 text-sm text-muted-foreground">{row.domainName}</td><td className="px-4 py-4"><p className="text-sm">{number.format(row.seriesCount)}</p><p className="mt-1 text-xs text-muted-foreground">{number.format(row.sourceCount)} sources</p></td><td className="px-4 py-4"><p className="text-sm">{number.format(row.observationCount)}</p><p className="mt-1 text-xs text-muted-foreground">{number.format(row.officialCount)} official</p></td><td className="px-4 py-4"><p className="text-xs text-emerald-700">{number.format(row.passedCount)} passed</p><p className={`mt-1 text-xs ${row.warningCount ? 'text-amber-700' : 'text-muted-foreground'}`}>{number.format(row.warningCount)} warnings</p></td><td className="px-4 py-4 text-xs text-muted-foreground">{formatDate(row.firstPeriod)}<br />to {formatDate(row.lastPeriod)}</td><td className="px-4 py-4 text-xs text-muted-foreground">{row.accountableOwner ?? 'LAZA Data Steward'}</td></tr>)}
  </DataTable>;
}

function GoldTable({ rows, search }: { rows: GoldIndicator[]; search: string }) {
  const filtered = rows.filter((row) => `${row.indicatorName} ${row.indicatorCode} ${row.domainName} ${row.sources ?? ''}`.toLowerCase().includes(search.toLowerCase()));
  return <DataTable footer={`${filtered.length} of ${rows.length} analytical indicators`} headers={['Indicator','Domain','Series / facts','Publication','Quality score','Latest period','Sources']}>
    {filtered.map((row) => <tr key={row.indicatorKey} className="border-b border-border/60 hover:bg-muted/20"><td className="px-4 py-4"><p className="text-sm text-foreground">{row.indicatorName}</p><p className="mt-1 font-mono text-[11px] text-muted-foreground">{row.indicatorCode}</p></td><td className="px-4 py-4 text-sm text-muted-foreground">{row.domainName}</td><td className="px-4 py-4"><p className="text-sm">{number.format(row.seriesCount)} / {number.format(row.factCount)}</p><p className="mt-1 text-xs text-muted-foreground">series / facts</p></td><td className="px-4 py-4"><p className="text-xs text-emerald-700">{number.format(row.publishedCount)} published</p><p className={`mt-1 text-xs ${row.demonstrationCount ? 'text-amber-700' : 'text-muted-foreground'}`}>{number.format(row.demonstrationCount)} demonstration</p></td><td className="px-4 py-4"><span className="text-sm">{row.averageQualityScore ?? '—'}</span><span className="text-xs text-muted-foreground"> / 100</span></td><td className="px-4 py-4 text-xs text-muted-foreground">{row.latestPeriod ?? '—'}</td><td className="px-4 py-4"><p className="max-w-[240px] text-xs text-muted-foreground" title={row.sources}>{row.sources ?? 'No published facts'}</p></td></tr>)}
  </DataTable>;
}

function DataTable({ headers, footer, children }: { headers: string[]; footer: string; children: React.ReactNode }) {
  return <div className="overflow-x-auto rounded-xl border border-border bg-white shadow-sm"><table className="w-full min-w-[1050px]"><thead><tr className="border-b border-border bg-muted/30">{headers.map((header) => <th key={header} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{header}</th>)}</tr></thead><tbody>{children}</tbody></table><div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">{footer}</div></div>;
}

export function DataLayers({ onSessionExpired }: { onSessionExpired: () => void }) {
  const [activeLayer,setActiveLayer] = useState<Layer>('bronze');
  const [summary,setSummary] = useState<DataLayersSummary | null>(null);
  const [bronze,setBronze] = useState<BronzeAsset[]>([]);
  const [silver,setSilver] = useState<SilverIndicator[]>([]);
  const [gold,setGold] = useState<GoldIndicator[]>([]);
  const [loading,setLoading] = useState(true);
  const [refreshing,setRefreshing] = useState(false);
  const [lastRefresh,setLastRefresh] = useState<Date | null>(null);
  const [error,setError] = useState('');
  const [search,setSearch] = useState('');
  const [searchResetLayer,setSearchResetLayer] = useState(activeLayer);
  if (activeLayer !== searchResetLayer) {
    setSearchResetLayer(activeLayer);
    setSearch('');
  }

  const refresh = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true); else setLoading(true);
    try {
      const [summaryResponse,bronzeResponse,silverResponse,goldResponse] = await Promise.all([loadDataLayersSummary(),loadBronzeLayer(),loadSilverLayer(),loadGoldLayer()]);
      setSummary(summaryResponse.data); setBronze(bronzeResponse.data); setSilver(silverResponse.data); setGold(goldResponse.data);
      setLastRefresh(new Date(summaryResponse.meta.generatedAt)); setError('');
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Unable to load the data layers.';
      if (message === 'ADMIN_SESSION_EXPIRED') onSessionExpired(); else setError(message);
    } finally { setLoading(false); setRefreshing(false); }
  },[onSessionExpired]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount + poll, not a derived-state mirror
  useEffect(() => { void refresh(); const timer=window.setInterval(() => void refresh(true),60000); return () => window.clearInterval(timer); },[refresh]);
  const reconciledPipelines = useMemo(() => summary?.reconciliation.filter((row) => row.bronzeRecords || row.silverObservations || row.goldFacts) ?? [],[summary]);

  return <div className="min-h-full">
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2"><h1 className="text-foreground">Data Layers</h1><span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] text-blue-700">Read only</span></div><p className="mt-1 text-sm text-muted-foreground">Medallion architecture, lineage coverage and layer-level data evidence</p></div><div className="flex items-center gap-3"><p className="text-right text-xs text-muted-foreground">Refreshes every 60 seconds<br />Last update: {lastRefresh ? dateTime.format(lastRefresh) : '—'}</p><button onClick={() => void refresh(true)} disabled={refreshing} className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />Refresh</button></div></div>
    {error && <div className="mb-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><TriangleAlert className="h-4 w-4" />{error}</div>}
    {loading || !summary ? <div className="flex h-64 items-center justify-center text-sm text-muted-foreground"><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Loading medallion evidence…</div> : <>
      <div className="mb-5 flex flex-col items-stretch gap-3 lg:flex-row lg:items-center">
        <LayerCard layer="bronze" title="Raw & governed" primary={`${number.format(summary.bronzeRawRecords)} records`} secondary={`${number.format(summary.bronzeAssets)} source assets · ${number.format(summary.bronzeMirroredAssets)} mirrored`} freshness={summary.bronzeFreshnessAt} active={activeLayer==='bronze'} onClick={() => setActiveLayer('bronze')} />
        <ArrowRight className="mx-auto h-5 w-5 rotate-90 text-muted-foreground lg:rotate-0" />
        <LayerCard layer="silver" title="Normalized & validated" primary={`${number.format(summary.silverObservations)} observations`} secondary={`${number.format(summary.silverIndicators)} indicators · ${number.format(summary.silverSeries)} series`} freshness={summary.silverFreshnessAt} active={activeLayer==='silver'} onClick={() => setActiveLayer('silver')} />
        <ArrowRight className="mx-auto h-5 w-5 rotate-90 text-muted-foreground lg:rotate-0" />
        <LayerCard layer="gold" title="Published & analytical" primary={`${number.format(summary.goldFacts)} facts`} secondary={`${number.format(summary.goldPublishedFacts)} official · ${number.format(summary.goldDemonstrationFacts)} demonstration`} freshness={summary.goldFreshnessAt} active={activeLayer==='gold'} onClick={() => setActiveLayer('gold')} />
      </div>
      <div className="mb-5 grid gap-4 md:grid-cols-4"><QualityCard title="Silver → Gold" value={`${summary.silverToGoldCoveragePct}%`} note="Fact coverage over current Silver observations" healthy={summary.silverToGoldCoveragePct===100} /><QualityCard title="Silver lineage" value={`${summary.silverLineageCoveragePct}%`} note="Observations linked to a raw Bronze record" healthy={summary.silverLineageCoveragePct===100} /><QualityCard title="Gold lineage" value={`${summary.goldLineageCoveragePct}%`} note="Facts linked to Silver and a source asset" healthy={summary.goldLineageCoveragePct===100} /><QualityCard title="Bronze → Silver yield" value={`${summary.bronzeToSilverYieldPct}%`} note="Informational yield; source grain is not always 1:1" healthy /> </div>
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-white p-4 shadow-sm"><div className="flex rounded-lg border border-border bg-muted/30 p-1">{(['bronze','silver','gold'] as Layer[]).map((layer) => <button key={layer} onClick={() => setActiveLayer(layer)} className={`rounded-md px-4 py-2 text-xs font-medium capitalize transition-colors ${activeLayer===layer ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>{layer}</button>)}</div><div className="relative min-w-[260px] flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${activeLayer} layer…`} className="w-full rounded-lg border border-border bg-muted/20 py-2 pl-9 pr-3 text-sm outline-none focus:border-primary" /></div><span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Layers3 className="h-4 w-4" />SQL Server medallion schemas</span></div>
      {activeLayer==='bronze' && <BronzeTable rows={bronze} search={search} />}{activeLayer==='silver' && <SilverTable rows={silver} search={search} />}{activeLayer==='gold' && <GoldTable rows={gold} search={search} />}
      <section className="mt-6"><div className="mb-3"><h2 className="text-lg text-foreground">Pipeline reconciliation</h2><p className="mt-1 text-xs text-muted-foreground">Layer volumes attributed to the originating ingestion pipeline. Transformation-only pipelines can legitimately show zero observations.</p></div><div className="overflow-x-auto rounded-xl border border-border bg-white shadow-sm"><table className="w-full min-w-[900px]"><thead><tr className="border-b border-border bg-muted/30">{['Pipeline','Source','Bronze records','Silver observations','Gold facts','Warnings','Silver → Gold'].map((header) => <th key={header} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{header}</th>)}</tr></thead><tbody>{reconciledPipelines.map((row) => <tr key={row.pipelineId} className="border-b border-border/60"><td className="px-4 py-3"><p className="text-sm">{row.pipelineName}</p><p className="mt-1 font-mono text-[10px] text-muted-foreground">{row.pipelineCode}</p></td><td className="px-4 py-3 text-xs text-muted-foreground">{row.sourceSystem}</td><td className="px-4 py-3 text-sm">{number.format(row.bronzeRecords)}</td><td className="px-4 py-3 text-sm">{number.format(row.silverObservations)}</td><td className="px-4 py-3 text-sm">{number.format(row.goldFacts)}</td><td className={`px-4 py-3 text-sm ${row.warnings ? 'text-amber-700' : ''}`}>{number.format(row.warnings)}</td><td className="px-4 py-3">{row.silverToGoldPct === undefined ? <span className="text-xs text-muted-foreground">Not applicable</span> : <span className={`inline-flex items-center gap-1 text-xs ${row.silverToGoldPct===100 ? 'text-emerald-700' : 'text-amber-700'}`}>{row.silverToGoldPct===100 ? <CheckCircle2 className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}{row.silverToGoldPct}%</span>}</td></tr>)}</tbody></table></div></section>
    </>}
  </div>;
}

function QualityCard({ title,value,note,healthy }: { title:string; value:string; note:string; healthy:boolean }) {
  return <div className="rounded-xl border border-border bg-white p-4 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-xs text-muted-foreground">{title}</p><p className="mt-2 text-xl text-foreground">{value}</p></div>{healthy ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <TriangleAlert className="h-5 w-5 text-amber-500" />}</div><p className="mt-2 text-[11px] leading-4 text-muted-foreground">{note}</p></div>;
}
