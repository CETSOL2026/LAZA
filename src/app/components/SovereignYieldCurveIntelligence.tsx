import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, Gauge, Landmark, LineChart as LineChartIcon, ShieldCheck, TrendingUp } from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  loadSovereignYieldCurve, sovereignTenors, SovereignYieldCurveResponse, SovereignYieldSnapshot,
} from '../data/sovereignYieldCurve';

const decimal = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const shortDate = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
const curveColors = ['#c4b5fd', '#a78bfa', '#7c3aed', '#f59e0b'];

function formatDate(value: string) {
  return shortDate.format(new Date(`${value}T00:00:00Z`));
}

function CurveCard({ label, value, context, icon: Icon }: { label: string; value: string; context: string; icon: typeof Landmark }) {
  return <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
    <div className="flex items-center justify-between gap-3"><p className="text-xs uppercase tracking-[0.14em] text-white/65">{label}</p><Icon className="h-4 w-4 text-amber-200" /></div>
    <p className="mt-3 text-2xl text-white">{value}</p><p className="mt-1 text-xs text-violet-100/65">{context}</p>
  </div>;
}

function YieldTooltip({ active, payload, label, suffix = '%' }: any) {
  if (!active || !payload?.length) return null;
  return <div className="rounded-xl border border-violet-100 bg-white p-3 text-xs shadow-xl"><p className="mb-2 font-medium">{label}</p>
    {payload.map((item: any) => <p key={`${item.dataKey}-${item.name}`} className="mt-1" style={{ color: item.color ?? item.fill }}>{item.name}: {decimal.format(item.value)}{suffix}</p>)}
  </div>;
}

export function SovereignYieldCurveIntelligence() {
  const [payload, setPayload] = useState<SovereignYieldCurveResponse | null>(null);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [view, setView] = useState<'curve' | 'spreads' | 'shift'>('curve');

  useEffect(() => {
    const controller = new AbortController();
    loadSovereignYieldCurve(controller.signal).then((result) => { setPayload(result); setStatus('loaded'); })
      .catch((error) => { if (error.name !== 'AbortError') setStatus('error'); });
    return () => controller.abort();
  }, []);

  const latest = payload?.data.at(-1);
  const curveData = useMemo(() => payload ? sovereignTenors.map(([tenor, key]) => ({
    tenor, ...Object.fromEntries(payload.data.map((snapshot) => [snapshot.referenceDate, snapshot[key]])),
  })) : [], [payload]);
  const shiftData = useMemo(() => {
    if (!payload) return [];
    const first = payload.data[0]; const last = payload.data.at(-1)!;
    return sovereignTenors.map(([tenor, key]) => ({ tenor, shiftBps: Math.round((last[key] - first[key]) * 100) }));
  }, [payload]);

  if (status === 'loading') return <section className="rounded-3xl border border-border bg-card p-8 text-sm text-muted-foreground">Loading BODIVA sovereign curve...</section>;
  if (status === 'error' || !payload || !latest) return <section className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-amber-800"><div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Sovereign yield analytics are temporarily unavailable.</div></section>;

  const peak = sovereignTenors.reduce((best, [tenor, key]) => latest[key] > best.value ? { tenor, value: latest[key] } : best, { tenor: '', value: -Infinity });
  return <section className="overflow-hidden rounded-3xl border border-[#5b21b6]/20 bg-white shadow-xl shadow-violet-950/5">
    <div className="bg-gradient-to-br from-[#24104f] via-[#5b21b6] to-[#7c3aed] p-6 sm:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl"><div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/80">Advanced Fixed-Income Intelligence</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-300/15 px-3 py-1 text-xs text-amber-100"><CheckCircle2 className="h-3.5 w-3.5" /> Official / no interpolation</span>
        </div><h2 className="text-2xl tracking-tight text-white sm:text-3xl">Domestic Sovereign Yield Curve</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-violet-100/70">Observed kwanza Treasury yields from 3 months to 10 years, with curve slope, long-end compression and historical shift analysis.</p></div>
        <a href={latest.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-2 rounded-xl border border-amber-200/25 bg-amber-300/10 px-4 py-2 text-sm text-amber-50 transition-colors hover:bg-amber-300/20">Latest BODIVA bulletin <ExternalLink className="h-4 w-4" /></a>
      </div>
      <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CurveCard label="1-year yield" value={`${decimal.format(latest.yield1y)}%`} context={`Snapshot ${formatDate(latest.referenceDate)}`} icon={Gauge} />
        <CurveCard label="5-year yield" value={`${decimal.format(latest.yield5y)}%`} context={`${decimal.format(latest.spread5y1yBps)} bps above 1Y`} icon={Landmark} />
        <CurveCard label="10-year yield" value={`${decimal.format(latest.yield10y)}%`} context={`${decimal.format(latest.spread10y2yBps)} bps above 2Y`} icon={TrendingUp} />
        <CurveCard label="Curve peak" value={`${decimal.format(peak.value)}%`} context={`Highest observed point at ${peak.tenor}`} icon={LineChartIcon} />
      </div>
    </div>

    <div className="p-5 sm:p-7">
      <div className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3"><div className="mt-0.5 rounded-xl bg-amber-50 p-2 text-amber-700"><ShieldCheck className="h-5 w-5" /></div>
          <div><p className="text-sm font-medium">Latest analytical signal</p><p className="mt-1 text-sm text-muted-foreground">The curve rises to {peak.tenor}, then compresses toward 10Y; the 5Y–1Y slope is {decimal.format(latest.spread5y1yBps)} bps.</p></div></div>
        <div className="flex w-fit rounded-xl bg-violet-50 p-1">
          {([['curve', 'Curve comparison'], ['spreads', 'Spread history'], ['shift', 'Term shift']] as const).map(([id, label]) => <button key={id} type="button" onClick={() => setView(id)} className={`rounded-lg px-3 py-2 text-xs transition-colors ${view === id ? 'bg-white text-[#5b21b6] shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>{label}</button>)}
        </div>
      </div>

      <div className="mt-6">
        {view === 'curve' && <CurveComparison data={curveData} snapshots={payload.data} />}
        {view === 'spreads' && <SpreadHistory data={payload.data} />}
        {view === 'shift' && <TermShift data={shiftData} />}
      </div>

      <div className="mt-6 grid gap-4 border-t border-border pt-5 md:grid-cols-3">
        <div><p className="text-xs text-muted-foreground">Coverage</p><p className="mt-1 text-sm">{formatDate(payload.meta.firstPeriod)} to {formatDate(payload.meta.lastPeriod)} · {payload.meta.observationCount} official points</p></div>
        <div><p className="text-xs text-muted-foreground">Methodology</p><p className="mt-1 text-sm">12 published tenors per snapshot · no interpolation or forward fill</p></div>
        <div><p className="text-xs text-muted-foreground">Official source</p><a href={payload.meta.sourceArchiveUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm text-[#6d28d9] hover:underline">BODIVA market statistics <ExternalLink className="h-3.5 w-3.5" /></a></div>
      </div>
    </div>
  </section>;
}

function CurveComparison({ data, snapshots }: { data: Record<string, string | number>[]; snapshots: SovereignYieldSnapshot[] }) {
  return <div><div className="mb-4"><h3 className="text-lg">Observed yield curves by reference date</h3><p className="mt-1 text-sm text-muted-foreground">Every line uses the 12 points published by BODIVA; no missing maturity is estimated.</p></div>
    <ResponsiveContainer width="100%" height={370}><LineChart data={data} margin={{ top: 8, right: 18, left: 4, bottom: 8 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#ede9fe"/><XAxis dataKey="tenor" tick={{ fontSize: 11 }} stroke="#6b7280"/><YAxis domain={['dataMin - 1', 'dataMax + 1']} tickFormatter={(v) => `${v}%`} width={48} tick={{ fontSize: 11 }} stroke="#6b7280"/>
      <Tooltip content={<YieldTooltip />}/><Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }}/>
      {snapshots.map((snapshot, index) => <Line key={snapshot.referenceDate} type="monotone" dataKey={snapshot.referenceDate} name={formatDate(snapshot.referenceDate)} stroke={curveColors[index]} strokeWidth={index === snapshots.length - 1 ? 4 : 2} dot={{ r: index === snapshots.length - 1 ? 4 : 2 }} />)}
    </LineChart></ResponsiveContainer></div>;
}

function SpreadHistory({ data }: { data: SovereignYieldSnapshot[] }) {
  const chart = data.map((item) => ({ ...item, label: formatDate(item.referenceDate) }));
  return <div><div className="mb-4"><h3 className="text-lg">Sovereign slope by reference date</h3><p className="mt-1 text-sm text-muted-foreground">Positive basis-point spreads indicate that the selected long maturity yields more than the short maturity.</p></div>
    <ResponsiveContainer width="100%" height={370}><BarChart data={chart} margin={{ top: 8, right: 18, left: 4, bottom: 8 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#ede9fe"/><XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#6b7280"/><YAxis tickFormatter={(v) => `${v}bp`} width={55} tick={{ fontSize: 11 }} stroke="#6b7280"/><ReferenceLine y={0} stroke="#94a3b8"/>
      <Tooltip content={<YieldTooltip suffix=" bps"/>}/><Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }}/><Bar dataKey="spread5y1yBps" name="5Y–1Y" fill="#7c3aed" radius={[5,5,0,0]}/><Bar dataKey="spread10y2yBps" name="10Y–2Y" fill="#f59e0b" radius={[5,5,0,0]}/>
    </BarChart></ResponsiveContainer></div>;
}

function TermShift({ data }: { data: { tenor: string; shiftBps: number }[] }) {
  return <div><div className="mb-4"><h3 className="text-lg">Term-by-term shift since the first snapshot</h3><p className="mt-1 text-sm text-muted-foreground">Basis-point change from 21 Feb 2025 to 25 Jun 2026. Amber marks higher yields; violet marks compression.</p></div>
    <ResponsiveContainer width="100%" height={370}><BarChart data={data} margin={{ top: 8, right: 18, left: 4, bottom: 8 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#ede9fe"/><XAxis dataKey="tenor" tick={{ fontSize: 11 }} stroke="#6b7280"/><YAxis tickFormatter={(v) => `${v}bp`} width={58} tick={{ fontSize: 11 }} stroke="#6b7280"/><ReferenceLine y={0} stroke="#64748b"/>
      <Tooltip content={<YieldTooltip suffix=" bps"/>}/><Bar dataKey="shiftBps" name="Yield shift" radius={[5,5,0,0]}>{data.map((item) => <Cell key={item.tenor} fill={item.shiftBps >= 0 ? '#f59e0b' : '#7c3aed'} />)}</Bar>
    </BarChart></ResponsiveContainer></div>;
}
