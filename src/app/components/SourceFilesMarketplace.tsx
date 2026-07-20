import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, BarChart3, Building2, CalendarDays, ChevronDown, ChevronUp, Database, Download,
  FileArchive, FileJson, FileSpreadsheet, FileText, Fuel, Landmark, LockKeyhole, Search, TrendingUp, Users, WalletCards,
  type LucideIcon,
} from 'lucide-react';
import { loadSourceDownloadCatalog, type SourceDownloadAsset, sourceDownloadUrl } from '../data/sourceDownloads';
import {
  accessLabel,
  minimumPlanForFullAccess,
  planLabel,
  sourceDatasetAccess,
  type SubscriptionPlan,
} from '../data/subscriptionAccess';

interface DatasetDefinition {
  title: string;
  category: string;
  description: string;
  frequency: string;
  icon: LucideIcon;
}

const definitions: Record<string, DatasetDefinition> = {
  INE_IPCN_TO_BRONZE: { title: 'National Consumer Price Index', category: 'Economy', description: 'Official IPCN publication, methodology and structured source workbook used for the inflation indicator.', frequency: 'Monthly', icon: TrendingUp },
  BNA_EXCHANGE_REFERENCE_MONTHLY: { title: 'BNA Exchange Rate Reference', category: 'Finance', description: 'Official BNA daily USD/AOA response used to calculate the monthly average reference exchange rate.', frequency: 'Daily / Monthly', icon: Database },
  INE_GDP_QUARTERLY_YOY: { title: 'Quarterly GDP Growth', category: 'Economy', description: 'Revised INE Quarterly National Accounts publication used for the official real GDP growth series.', frequency: 'Quarterly', icon: BarChart3 },
  INE_RGPH_POPULATION: { title: 'Population Census', category: 'Society', description: 'INE population census summary used for the official resident-population observations.', frequency: 'Census', icon: Users },
  BNA_OSD_BANKING_ASSETS: { title: 'Banking Sector Assets', category: 'Finance', description: 'BNA balance sheet of other depository corporations used for the banking-assets series.', frequency: 'Monthly', icon: Building2 },
  UGD_PUBLIC_DEBT_GDP: { title: 'Public Debt Bulletins', category: 'Public Finance', description: 'Official UGD annual and quarterly debt bulletins used to calculate public debt as a share of GDP.', frequency: 'Quarterly / Annual', icon: WalletCards },
  ANPG_OIL_GAS_MONTHLY: { title: 'Oil & Gas Production', category: 'Energy', description: 'Every ANPG monthly publication used for oil production, forecast, associated gas and Angola LNG analytics.', frequency: 'Monthly', icon: Fuel },
  MINFIN_FISCAL_EXECUTION_QUARTERLY: { title: 'Fiscal Execution Reports', category: 'Public Finance', description: 'Official MINFIN General State Budget Execution Reports used for quarterly fiscal intelligence.', frequency: 'Quarterly', icon: FileArchive },
  BODIVA_SOVEREIGN_YIELD_CURVE: { title: 'Sovereign Yield Curve', category: 'Capital Markets', description: 'BODIVA daily bulletins containing the observed Treasury yields used to construct the sovereign curve.', frequency: 'Market snapshots', icon: Landmark },
  INE_GDP_OIL_NON_OIL_QUARTERLY: { title: 'Oil vs. Non-Oil GDP', category: 'Economy', description: 'INE structured national-accounts workbook used for growth, contribution and GDP-composition analysis.', frequency: 'Quarterly', icon: FileSpreadsheet },
};

function bytes(value: number) {
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(value / 1024))} KB`;
}

function dateLabel(value?: string) {
  if (!value) return 'Methodology / undated';
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
}

function AssetIcon({ type }: { type: string }) {
  if (type.includes('XLS')) return <FileSpreadsheet className="h-4 w-4" />;
  if (type.includes('JSON') || type.includes('API')) return <FileJson className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
}

export function SourceFilesMarketplace({ subscriptionPlan = 'free' }: { subscriptionPlan?: SubscriptionPlan }) {
  const [assets, setAssets] = useState<SourceDownloadAsset[]>([]);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All Data');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    loadSourceDownloadCatalog(controller.signal).then((payload) => { setAssets(payload.data); setStatus('loaded'); })
      .catch((error) => { if (error.name !== 'AbortError') setStatus('error'); });
    return () => controller.abort();
  }, []);

  const datasets = useMemo(() => {
    const grouped = new Map<string, SourceDownloadAsset[]>();
    assets.forEach((asset) => grouped.set(asset.pipelineCode, [...(grouped.get(asset.pipelineCode) ?? []), asset]));
    return [...grouped.entries()].map(([pipelineCode, files]) => {
      const definition = definitions[pipelineCode];
      const sorted = [...files].sort((a, b) => (a.publicationDate ?? '').localeCompare(b.publicationDate ?? '') || a.assetId - b.assetId);
      return { pipelineCode, definition, files: sorted, primary: sorted.at(-1)! };
    }).filter((dataset) => dataset.definition)
      .filter((dataset) => category === 'All Data' || dataset.definition.category === category)
      .filter((dataset) => `${dataset.definition.title} ${dataset.definition.description} ${dataset.primary.organizationName}`.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => a.definition.title.localeCompare(b.definition.title));
  }, [assets, category, query]);

  const categories = ['All Data', 'Economy', 'Society', 'Finance', 'Public Finance', 'Energy', 'Capital Markets'];

  return <div className="space-y-8">
    <div><h1 className="text-3xl tracking-tight">Official Source Marketplace</h1><p className="mt-2 text-muted-foreground">Download the original official files used to build LAZA indicators and advanced analytical products.</p></div>

    <div className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm text-blue-900">
      <div className="flex items-start gap-3"><LockKeyhole className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-medium">Current subscription simulation: {planLabel(subscriptionPlan)}</p><p className="mt-1 text-blue-800/80">Download buttons are enabled only for datasets included in the selected plan. Restricted datasets remain visible as catalog previews so users understand what is available in higher tiers.</p></div></div>
    </div>

    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900">
      <div className="flex items-start gap-3"><FileArchive className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-medium">Governed local source archive</p><p className="mt-1 text-emerald-800/80">Every download is served from LAZA's governed local archive and linked to its official Bronze source asset. Files retain source organisation, publication date, size and SHA-256 evidence; no remote source is contacted when a user clicks Download.</p></div></div>
    </div>

    <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
      <div className="relative min-w-0 flex-1"><Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search official datasets or sources..." className="w-full rounded-xl border border-border bg-white py-3.5 pl-12 pr-4 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10" /></div>
      <div className="flex flex-wrap gap-2">{categories.map((item) => <button type="button" key={item} onClick={() => setCategory(item)} className={`rounded-xl px-4 py-3 text-sm transition-colors ${category === item ? 'bg-primary text-white' : 'bg-muted text-foreground hover:bg-muted/70'}`}>{item}</button>)}</div>
    </div>

    {status === 'loading' && <div className="rounded-2xl border border-border bg-white p-10 text-center text-sm text-muted-foreground">Loading governed source assets...</div>}
    {status === 'error' && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900"><div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> The official download catalog is temporarily unavailable.</div></div>}
    {status === 'loaded' && <div className="grid items-start gap-6 lg:grid-cols-2">{datasets.map(({ pipelineCode, definition, files, primary }) => {
      const Icon = definition.icon;
      const isExpanded = expanded === pipelineCode;
      const formats = [...new Set(files.map((file) => file.assetType))].join(', ');
      const access = sourceDatasetAccess[pipelineCode]?.[subscriptionPlan] ?? 'locked';
      const canDownload = access === 'full';
      return <article key={pipelineCode} className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-shadow hover:shadow-md">
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4"><div className="rounded-xl bg-primary/10 p-3 text-primary"><Icon className="h-6 w-6" /></div><div><h2 className="text-xl">{definition.title}</h2><div className="mt-2 flex flex-wrap gap-2"><span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{definition.category}</span><span className="rounded-md bg-emerald-50 px-2 py-1 text-xs text-emerald-700">Official source</span><span className="rounded-md bg-blue-50 px-2 py-1 text-xs text-blue-700">{files.length} {files.length === 1 ? 'file' : 'files'}</span><span className={`rounded-md px-2 py-1 text-xs ${canDownload ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{accessLabel(access)}</span></div></div></div>
          </div>
          <p className="mt-5 text-sm leading-6 text-muted-foreground">{definition.description}</p>
          <dl className="mt-5 grid grid-cols-2 gap-4 text-sm"><div><dt className="text-xs text-muted-foreground">Formats</dt><dd className="mt-1">{formats}</dd></div><div><dt className="text-xs text-muted-foreground">Update frequency</dt><dd className="mt-1">{definition.frequency}</dd></div><div><dt className="text-xs text-muted-foreground">Latest publication</dt><dd className="mt-1 flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{dateLabel(primary.publicationDate)}</dd></div><div><dt className="text-xs text-muted-foreground">Official organisation</dt><dd className="mt-1 line-clamp-1" title={primary.organizationName}>{primary.organizationName}</dd></div></dl>
          <div className="mt-6 flex gap-2">
            {canDownload
              ? <a href={sourceDownloadUrl(primary.assetId)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm text-white transition-colors hover:bg-primary/90"><Download className="h-4 w-4" />{files.length === 1 ? 'Download source file' : 'Download latest file'}</a>
              : <button type="button" disabled className="flex flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-500"><LockKeyhole className="h-4 w-4" />Requires {minimumPlanForFullAccess(sourceDatasetAccess[pipelineCode])}</button>}
            <button type="button" onClick={() => setExpanded(isExpanded ? null : pipelineCode)} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm transition-colors hover:bg-muted">{isExpanded ? 'Hide files' : 'View files'}{isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button>
          </div>
        </div>
        {isExpanded && <div className="border-t border-border bg-slate-50/70"><div className="max-h-80 divide-y divide-border overflow-y-auto">{[...files].reverse().map((file) => <div key={file.assetId} className="flex items-center gap-3 px-5 py-3"><div className="rounded-lg bg-white p-2 text-muted-foreground shadow-sm"><AssetIcon type={file.assetType} /></div><div className="min-w-0 flex-1"><p className="truncate text-sm" title={file.assetName}>{file.assetName}</p><p className="mt-0.5 text-xs text-muted-foreground">{dateLabel(file.publicationDate)} · {bytes(file.contentSizeBytes)} · SHA-256 {file.sha256.slice(0, 12)}...</p></div>{canDownload ? <a href={sourceDownloadUrl(file.assetId)} title={`Download ${file.assetName}`} className="rounded-lg border border-border bg-white p-2 text-primary transition-colors hover:bg-primary hover:text-white"><Download className="h-4 w-4" /></a> : <span title="Download restricted by subscription" className="rounded-lg border border-border bg-white p-2 text-muted-foreground"><LockKeyhole className="h-4 w-4" /></span>}</div>)}</div></div>}
      </article>;
    })}</div>}
    {status === 'loaded' && datasets.length === 0 && <div className="rounded-2xl border border-border bg-white p-10 text-center text-sm text-muted-foreground">No official source products match the current filters.</div>}
  </div>;
}
