import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, Factory, Fuel, Gauge, TrendingDown, TrendingUp } from 'lucide-react';
import {
  Bar, CartesianGrid, ComposedChart, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { loadOilGasAnalytics, OilGasAnalyticsResponse, OilGasMonthlyPoint } from '../data/oilGas';

const integer = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function MetricCard({ label, value, context, icon: Icon, tone = 'default' }: {
  label: string;
  value: string;
  context: string;
  icon: typeof Fuel;
  tone?: 'default' | 'positive' | 'negative';
}) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.14em] text-white/65">{label}</p>
        <Icon className="h-4 w-4 text-white/70" />
      </div>
      <p className="mt-3 text-2xl text-white">{value}</p>
      <p className={`mt-1 text-xs ${tone === 'positive' ? 'text-emerald-300' : tone === 'negative' ? 'text-amber-300' : 'text-white/60'}`}>
        {context}
      </p>
    </div>
  );
}

function AnalysisTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-white p-3 text-xs shadow-xl">
      <p className="mb-2 font-medium">{label}</p>
      {payload.map((item: any) => (
        <p key={item.dataKey} className="mt-1" style={{ color: item.color }}>
          {item.name}: {integer.format(item.value ?? 0)}
        </p>
      ))}
    </div>
  );
}

export function OilGasIntelligence() {
  const [payload, setPayload] = useState<OilGasAnalyticsResponse | null>(null);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [view, setView] = useState<'production' | 'gas' | 'alng'>('production');

  useEffect(() => {
    const controller = new AbortController();
    loadOilGasAnalytics(controller.signal)
      .then((response) => {
        setPayload(response);
        setStatus('loaded');
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setStatus('error');
      });
    return () => controller.abort();
  }, []);

  const latest = payload?.data.at(-1);
  const exceptionMonths = useMemo(
    () => payload?.data.filter((point) => point.hasAcceptedException).map((point) => point.period) ?? [],
    [payload],
  );

  if (status === 'loading') {
    return <section className="rounded-3xl border border-border bg-card p-8 text-sm text-muted-foreground">Loading ANPG market intelligence...</section>;
  }
  if (status === 'error' || !payload || !latest) {
    return (
      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-8">
        <div className="flex items-center gap-2 text-amber-800"><AlertTriangle className="h-5 w-5" /> Oil and gas analytics are temporarily unavailable.</div>
      </section>
    );
  }

  const performance = 100 + latest.oilVariancePct;
  const performanceTone = latest.oilVariancePct >= 0 ? 'positive' : 'negative';
  const TrendIcon = latest.oilVariancePct >= 0 ? TrendingUp : TrendingDown;
  const narrative = latest.oilVariancePct >= 0
    ? `Oil output finished ${decimal.format(latest.oilVariancePct)}% above ANPG's forecast in ${latest.period}.`
    : `Oil output finished ${decimal.format(Math.abs(latest.oilVariancePct))}% below ANPG's forecast in ${latest.period}.`;

  return (
    <section className="overflow-hidden rounded-3xl border border-[#7f151b]/20 bg-white shadow-xl shadow-[#7f151b]/5">
      <div className="bg-gradient-to-br from-[#70151b] via-[#981b23] to-[#bf1f27] p-6 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/80">Advanced Market Intelligence</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-3 py-1 text-xs text-emerald-200"><CheckCircle2 className="h-3.5 w-3.5" /> Official / published</span>
            </div>
            <h2 className="text-2xl tracking-tight text-white sm:text-3xl">Oil & Gas Production Intelligence</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
              Actual-versus-forecast oil performance, associated-gas allocation and Angola LNG product mix from official ANPG monthly publications.
            </p>
          </div>
          <a href={latest.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white transition-colors hover:bg-white/20">
            Latest ANPG publication <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Actual oil output" value={`${decimal.format(latest.oilActualBopd / 1_000_000)}M BOPD`} context={`${latest.period} official average`} icon={Fuel} />
          <MetricCard label="Forecast performance" value={`${decimal.format(performance)}%`} context={`${latest.oilVariancePct >= 0 ? '+' : ''}${decimal.format(latest.oilVariancePct)}% variance`} icon={TrendIcon} tone={performanceTone} />
          <MetricCard label="Associated gas" value={`${integer.format(latest.gasActualMmscfd)} MMSCFD`} context={`${decimal.format(latest.gasReinjectedMmscfd / latest.gasActualMmscfd * 100)}% reinjected`} icon={Gauge} />
          <MetricCard label="Angola LNG" value={`${decimal.format((latest.alngActualBoepd ?? 0) / 1_000)}k BOEPD`} context={`${latest.alngActualBoe ? decimal.format(latest.alngActualBoe / 1_000_000) : '—'}M BOE in month`} icon={Factory} />
        </div>
      </div>

      <div className="p-5 sm:p-7">
        <div className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 rounded-xl p-2 ${latest.oilVariancePct >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}><TrendIcon className="h-5 w-5" /></div>
            <div>
              <p className="text-sm font-medium">Latest analytical signal</p>
              <p className="mt-1 text-sm text-muted-foreground">{narrative}</p>
            </div>
          </div>
          <div className="flex w-fit rounded-xl bg-muted p-1">
            {([
              ['production', 'Oil performance'], ['gas', 'Gas allocation'], ['alng', 'Angola LNG'],
            ] as const).map(([id, label]) => (
              <button key={id} type="button" onClick={() => setView(id)} className={`rounded-lg px-3 py-2 text-xs transition-colors ${view === id ? 'bg-white text-[#981b23] shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>{label}</button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          {view === 'production' && <ProductionView data={payload.data} />}
          {view === 'gas' && <GasView data={payload.data} exceptionMonths={exceptionMonths} />}
          {view === 'alng' && <AlngView data={payload.data} />}
        </div>

        <div className="mt-6 grid gap-4 border-t border-border pt-5 md:grid-cols-3">
          <div><p className="text-xs text-muted-foreground">Coverage</p><p className="mt-1 text-sm">{payload.meta.firstPeriod} to {payload.meta.lastPeriod} · {payload.meta.observationCount} months</p></div>
          <div><p className="text-xs text-muted-foreground">Quality evidence</p><p className="mt-1 text-sm">Minimum score {Math.min(...payload.data.map((point) => point.qualityScore)).toFixed(2)} · {payload.meta.acceptedExceptionCount} accepted exceptions</p></div>
          <div><p className="text-xs text-muted-foreground">Official source</p><a href={payload.meta.sourceArchiveUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline">ANPG production archive <ExternalLink className="h-3.5 w-3.5" /></a></div>
        </div>
      </div>
    </section>
  );
}

function ProductionView({ data }: { data: OilGasMonthlyPoint[] }) {
  return (
    <div>
      <div className="mb-4"><h3 className="text-lg">Actual versus forecast production</h3><p className="mt-1 text-sm text-muted-foreground">Monthly average barrels of oil per day. The shaded gap is not interpolated.</p></div>
      <ResponsiveContainer width="100%" height={360}>
        <LineChart data={data} margin={{ top: 8, right: 12, left: 12, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="period" interval={2} tick={{ fontSize: 11 }} stroke="#6b7280" />
          <YAxis domain={['dataMin - 30000', 'dataMax + 30000']} tickFormatter={(value) => `${decimal.format(value / 1_000_000)}M`} width={58} tick={{ fontSize: 11 }} stroke="#6b7280" />
          <Tooltip content={<AnalysisTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
          <Line type="monotone" dataKey="oilActualBopd" name="Actual BOPD" stroke="#bf1f27" strokeWidth={3} dot={{ r: 2 }} activeDot={{ r: 5 }} />
          <Line type="monotone" dataKey="oilForecastBopd" name="Forecast BOPD" stroke="#64748b" strokeWidth={2} strokeDasharray="6 5" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function GasView({ data, exceptionMonths }: { data: OilGasMonthlyPoint[]; exceptionMonths: string[] }) {
  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div><h3 className="text-lg">Associated-gas allocation</h3><p className="mt-1 text-sm text-muted-foreground">Published daily averages by destination, compared with total associated gas.</p></div>
        {exceptionMonths.length > 0 && <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"><AlertTriangle className="h-4 w-4" /> Source reconciliation exception: {exceptionMonths.join(', ')}</div>}
      </div>
      <ResponsiveContainer width="100%" height={360}>
        <ComposedChart data={data} margin={{ top: 8, right: 12, left: 12, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="period" interval={2} tick={{ fontSize: 11 }} stroke="#6b7280" />
          <YAxis tickFormatter={(value) => `${integer.format(value)}`} width={55} tick={{ fontSize: 11 }} stroke="#6b7280" />
          <Tooltip content={<AnalysisTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
          <Bar dataKey="gasReinjectedMmscfd" stackId="gas" name="Reinjected" fill="#7f1d1d" />
          <Bar dataKey="gasToAlngMmscfd" stackId="gas" name="To Angola LNG" fill="#dc2626" />
          <Bar dataKey="gasToPowerMmscfd" stackId="gas" name="Facility power" fill="#f97316" />
          <Bar dataKey="gasOtherMmscfd" stackId="gas" name="Other / unallocated" fill="#cbd5e1" />
          <Line type="monotone" dataKey="gasActualMmscfd" name="Total gas" stroke="#0f172a" strokeWidth={2.5} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function AlngView({ data }: { data: OilGasMonthlyPoint[] }) {
  return (
    <div>
      <div className="mb-4"><h3 className="text-lg">Angola LNG product mix</h3><p className="mt-1 text-sm text-muted-foreground">Daily BOE output by product. January and February 2025 product detail was not available as source text.</p></div>
      <ResponsiveContainer width="100%" height={360}>
        <ComposedChart data={data} margin={{ top: 8, right: 12, left: 12, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="period" interval={2} tick={{ fontSize: 11 }} stroke="#6b7280" />
          <YAxis tickFormatter={(value) => `${decimal.format(value / 1_000)}k`} width={55} tick={{ fontSize: 11 }} stroke="#6b7280" />
          <Tooltip content={<AnalysisTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
          <Bar dataKey="alngLngBoepd" stackId="alng" name="LNG" fill="#991b1b" />
          <Bar dataKey="alngPropaneBoepd" stackId="alng" name="Propane" fill="#dc2626" />
          <Bar dataKey="alngButaneBoepd" stackId="alng" name="Butane" fill="#f97316" />
          <Bar dataKey="alngCondensateBoepd" stackId="alng" name="Condensate" fill="#fbbf24" />
          <Line type="monotone" dataKey="alngActualBoepd" name="Total ALNG" stroke="#0f172a" strokeWidth={2.5} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
