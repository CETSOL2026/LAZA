import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, Gauge, Layers3, Sprout, TrendingUp } from 'lucide-react';
import {
  Area, Bar, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { loadOilNonOilGdp, OilNonOilGdpQuarter, OilNonOilGdpResponse } from '../data/oilNonOilGdp';

const decimal = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 });

function GdpCard({ label, value, context, icon: Icon, positive }: {
  label: string; value: string; context: string; icon: typeof TrendingUp; positive?: boolean;
}) {
  return <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
    <div className="flex items-center justify-between gap-3"><p className="text-xs uppercase tracking-[0.14em] text-white/65">{label}</p><Icon className="h-4 w-4 text-emerald-100/80" /></div>
    <p className="mt-3 text-2xl text-white">{value}</p>
    <p className={`mt-1 text-xs ${positive === true ? 'text-emerald-200' : positive === false ? 'text-amber-200' : 'text-white/60'}`}>{context}</p>
  </div>;
}

function PercentTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return <div className="rounded-xl border border-emerald-100 bg-white p-3 text-xs shadow-xl"><p className="mb-2 font-medium">{label}</p>
    {payload.map((item: any) => <p key={item.dataKey} className="mt-1" style={{ color: item.color ?? item.fill }}>{item.name}: {decimal.format(item.value)}{item.dataKey.toLowerCase().includes('contribution') ? ' pp' : '%'}</p>)}
  </div>;
}

export function OilNonOilGdpIntelligence() {
  const [payload, setPayload] = useState<OilNonOilGdpResponse | null>(null);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [view, setView] = useState<'growth' | 'contribution' | 'structure'>('growth');

  useEffect(() => {
    const controller = new AbortController();
    loadOilNonOilGdp(controller.signal).then((result) => { setPayload(result); setStatus('loaded'); })
      .catch((error) => { if (error.name !== 'AbortError') setStatus('error'); });
    return () => controller.abort();
  }, []);

  const latest = payload?.data.at(-1);
  const prior = payload?.data.at(-2);
  const recent = useMemo(() => payload?.data.slice(-13) ?? [], [payload]);

  if (status === 'loading') return <section className="rounded-3xl border border-border bg-card p-8 text-sm text-muted-foreground">Loading INE diversification intelligence...</section>;
  if (status === 'error' || !payload || !latest || !prior) return <section className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-amber-800"><div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Oil and non-oil GDP analytics are temporarily unavailable.</div></section>;

  return <section className="overflow-hidden rounded-3xl border border-[#065f46]/20 bg-white shadow-xl shadow-emerald-950/5">
    <div className="bg-gradient-to-br from-[#052e2b] via-[#065f46] to-[#0f766e] p-6 sm:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl"><div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/80">Advanced Diversification Intelligence</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-300/15 px-3 py-1 text-xs text-emerald-100"><CheckCircle2 className="h-3.5 w-3.5" /> Official / published</span>
        </div>
        <h2 className="text-2xl tracking-tight text-white sm:text-3xl">Oil vs. Non-Oil GDP Momentum</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50/70">Quarterly growth, contribution and economic structure from INE national accounts, highlighting the drivers of Angola's diversification.</p></div>
        <a href={latest.sourceUrl} className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white transition-colors hover:bg-white/20">Source workbook <ExternalLink className="h-4 w-4" /></a>
      </div>
      <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <GdpCard label="Non-oil growth" value={`${decimal.format(latest.nonOilYoyPct)}%`} context={`${decimal.format(latest.nonOilYoyPct - prior.nonOilYoyPct)} pp vs ${prior.period}`} icon={TrendingUp} positive={latest.nonOilYoyPct > 0} />
        <GdpCard label="Oil growth" value={`${decimal.format(latest.oilYoyPct)}%`} context={latest.oilYoyPct < 0 ? 'Still contracting year over year' : 'Expanding year over year'} icon={Gauge} positive={latest.oilYoyPct > 0} />
        <GdpCard label="Non-oil contribution" value={`${decimal.format(latest.nonOilContributionPp)} pp`} context={`${decimal.format(latest.totalYoyPct)}% total GDP growth`} icon={Sprout} positive />
        <GdpCard label="Non-oil share" value={`${decimal.format(latest.nonOilSharePct)}%`} context={`${decimal.format(latest.oilSharePct)}% oil share`} icon={Layers3} />
      </div>
    </div>

    <div className="p-5 sm:p-7">
      <div className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3"><div className="mt-0.5 rounded-xl bg-emerald-50 p-2 text-emerald-700"><TrendingUp className="h-5 w-5" /></div>
          <div><p className="text-sm font-medium">Latest analytical signal</p><p className="mt-1 text-sm text-muted-foreground">In {latest.period}, non-oil activity contributed {decimal.format(latest.nonOilContributionPp)} pp to total growth of {decimal.format(latest.totalYoyPct)}%, while oil activity subtracted {decimal.format(Math.abs(latest.oilContributionPp))} pp.</p></div></div>
        <div className="flex w-fit rounded-xl bg-emerald-50 p-1">
          {([['growth', 'Growth momentum'], ['contribution', 'Growth drivers'], ['structure', 'GDP structure']] as const).map(([id, label]) => <button key={id} type="button" onClick={() => setView(id)} className={`rounded-lg px-3 py-2 text-xs transition-colors ${view === id ? 'bg-white text-[#065f46] shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>{label}</button>)}
        </div>
      </div>
      <div className="mt-6">
        {view === 'growth' && <GrowthMomentum data={recent} />}
        {view === 'contribution' && <GrowthContribution data={recent} />}
        {view === 'structure' && <GdpStructure data={recent} />}
      </div>
      <div className="mt-5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> The source workbook repeats “2003” in first-quarter year cells. LAZA derives each quarter year from the correctly labelled annual block; all measures reconcile to the official total GDP series.</div>
      <div className="mt-6 grid gap-4 border-t border-border pt-5 md:grid-cols-3">
        <div><p className="text-xs text-muted-foreground">Coverage</p><p className="mt-1 text-sm">{payload.meta.firstPeriod} to {payload.meta.lastPeriod} · {payload.meta.observationCount} quarters</p></div>
        <div><p className="text-xs text-muted-foreground">Quality evidence</p><p className="mt-1 text-sm">Score {decimal.format(latest.qualityScore)} · composition and contribution reconciled</p></div>
        <div><p className="text-xs text-muted-foreground">Official source</p><p className="mt-1 text-sm">INE Angola · Quarterly National Accounts</p></div>
      </div>
    </div>
  </section>;
}

function GrowthMomentum({ data }: { data: OilNonOilGdpQuarter[] }) {
  return <div><div className="mb-4"><h3 className="text-lg">Quarterly real growth momentum</h3><p className="mt-1 text-sm text-muted-foreground">Year-over-year change for oil GDP, non-oil GDP and total GDP.</p></div>
    <ResponsiveContainer width="100%" height={370}><ComposedChart data={data} margin={{ top: 8, right: 18, left: 4, bottom: 8 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#d1fae5"/><XAxis dataKey="period" tick={{ fontSize: 11 }} stroke="#64748b"/><YAxis tickFormatter={(v) => `${v}%`} width={48} tick={{ fontSize: 11 }} stroke="#64748b"/><ReferenceLine y={0} stroke="#94a3b8"/>
      <Tooltip content={<PercentTooltip />}/><Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }}/><Line type="monotone" dataKey="nonOilYoyPct" name="Non-oil GDP" stroke="#059669" strokeWidth={4} dot={{ r: 3 }}/><Line type="monotone" dataKey="oilYoyPct" name="Oil GDP" stroke="#f59e0b" strokeWidth={3} dot={{ r: 3 }}/><Line type="monotone" dataKey="totalYoyPct" name="Total GDP" stroke="#0f172a" strokeDasharray="5 4" strokeWidth={2}/>
    </ComposedChart></ResponsiveContainer></div>;
}

function GrowthContribution({ data }: { data: OilNonOilGdpQuarter[] }) {
  return <div><div className="mb-4"><h3 className="text-lg">Contribution to total GDP growth</h3><p className="mt-1 text-sm text-muted-foreground">Percentage-point contribution of oil and non-oil activity; stacked values reconcile to total growth.</p></div>
    <ResponsiveContainer width="100%" height={370}><ComposedChart data={data} margin={{ top: 8, right: 18, left: 4, bottom: 8 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#d1fae5"/><XAxis dataKey="period" tick={{ fontSize: 11 }} stroke="#64748b"/><YAxis tickFormatter={(v) => `${v}pp`} width={52} tick={{ fontSize: 11 }} stroke="#64748b"/><ReferenceLine y={0} stroke="#64748b"/>
      <Tooltip content={<PercentTooltip />}/><Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }}/><Bar dataKey="nonOilContributionPp" name="Non-oil contribution" stackId="growth" fill="#10b981"/><Bar dataKey="oilContributionPp" name="Oil contribution" stackId="growth" fill="#f59e0b"/><Line type="monotone" dataKey="totalYoyPct" name="Total GDP growth" stroke="#0f172a" strokeWidth={3}/>
    </ComposedChart></ResponsiveContainer></div>;
}

function GdpStructure({ data }: { data: OilNonOilGdpQuarter[] }) {
  return <div><div className="mb-4"><h3 className="text-lg">Quarterly GDP structure</h3><p className="mt-1 text-sm text-muted-foreground">Share of nominal GDP at current prices attributable to oil and non-oil activity.</p></div>
    <ResponsiveContainer width="100%" height={370}><ComposedChart data={data} margin={{ top: 8, right: 18, left: 4, bottom: 8 }}>
      <defs><linearGradient id="nonOilShareGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.75}/><stop offset="95%" stopColor="#10b981" stopOpacity={0.25}/></linearGradient></defs>
      <CartesianGrid strokeDasharray="3 3" stroke="#d1fae5"/><XAxis dataKey="period" tick={{ fontSize: 11 }} stroke="#64748b"/><YAxis domain={[0,100]} tickFormatter={(v) => `${v}%`} width={48} tick={{ fontSize: 11 }} stroke="#64748b"/>
      <Tooltip content={<PercentTooltip />}/><Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }}/><Area type="monotone" dataKey="nonOilSharePct" name="Non-oil share" stackId="share" stroke="#059669" fill="url(#nonOilShareGradient)"/><Area type="monotone" dataKey="oilSharePct" name="Oil share" stackId="share" stroke="#d97706" fill="#fbbf24" fillOpacity={0.65}/>
    </ComposedChart></ResponsiveContainer></div>;
}
