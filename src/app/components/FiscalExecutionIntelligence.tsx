import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BadgeDollarSign, CheckCircle2, ExternalLink, Landmark, ReceiptText, Scale, TrendingUp, WalletCards } from 'lucide-react';
import {
  Area, Bar, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { FiscalExecutionQuarter, FiscalExecutionResponse, loadFiscalExecution } from '../data/fiscalExecution';

const decimal = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function money(value: number) {
  const absolute = Math.abs(value);
  const formatted = absolute >= 1_000_000 ? `${decimal.format(absolute / 1_000_000)}T Kz` : `${decimal.format(absolute / 1_000)}B Kz`;
  return value < 0 ? `-${formatted}` : formatted;
}

function FiscalCard({ label, value, context, icon: Icon, positive }: {
  label: string; value: string; context: string; icon: typeof Landmark; positive?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.14em] text-white/65">{label}</p>
        <Icon className="h-4 w-4 text-cyan-100/80" />
      </div>
      <p className="mt-3 text-2xl text-white">{value}</p>
      <p className={`mt-1 text-xs ${positive === true ? 'text-emerald-200' : positive === false ? 'text-amber-200' : 'text-white/60'}`}>{context}</p>
    </div>
  );
}

interface FiscalTooltipItem {
  dataKey: string;
  name: string;
  value: number;
  color?: string;
}

function FiscalTooltip({ active, payload, label }: { active?: boolean; payload?: FiscalTooltipItem[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-white p-3 text-xs shadow-xl">
      <p className="mb-2 font-medium">{label}</p>
      {payload.map((item) => (
        <p key={item.dataKey} className="mt-1" style={{ color: item.color }}>
          {item.name}: {item.dataKey.toLowerCase().includes('pct') ? `${decimal.format(item.value)}%` : money(item.value)}
        </p>
      ))}
    </div>
  );
}

export function FiscalExecutionIntelligence() {
  const [payload, setPayload] = useState<FiscalExecutionResponse | null>(null);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [view, setView] = useState<'pulse' | 'composition' | 'drivers'>('pulse');

  useEffect(() => {
    const controller = new AbortController();
    loadFiscalExecution(controller.signal)
      .then((response) => { setPayload(response); setStatus('loaded'); })
      .catch((error) => { if (error.name !== 'AbortError') setStatus('error'); });
    return () => controller.abort();
  }, []);

  const latest = payload?.data.at(-1);
  const priorYear = payload?.data.find((point) => point.period === '2025-Q1');
  const exceptionPeriods = useMemo(
    () => payload?.data.filter((point) => point.hasAcceptedException).map((point) => point.period) ?? [],
    [payload],
  );

  if (status === 'loading') return <section className="rounded-3xl border border-border bg-card p-8 text-sm text-muted-foreground">Loading MINFIN fiscal intelligence...</section>;
  if (status === 'error' || !payload || !latest || !priorYear) {
    return <section className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-amber-800"><div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Fiscal execution analytics are temporarily unavailable.</div></section>;
  }

  const revenueYoy = (latest.totalRevenue / priorYear.totalRevenue - 1) * 100;
  const expenditureYoy = (latest.totalExpenditure / priorYear.totalExpenditure - 1) * 100;
  const balanceImprovement = latest.budgetBalance - priorYear.budgetBalance;

  return (
    <section className="overflow-hidden rounded-3xl border border-[#075985]/20 bg-white shadow-xl shadow-cyan-950/5">
      <div className="bg-gradient-to-br from-[#082f49] via-[#075985] to-[#0f766e] p-6 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/80">Advanced Fiscal Intelligence</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-300/15 px-3 py-1 text-xs text-emerald-100"><CheckCircle2 className="h-3.5 w-3.5" /> Official / published</span>
            </div>
            <h2 className="text-2xl tracking-tight text-white sm:text-3xl">Fiscal Execution &amp; Budget Balance</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-cyan-50/70">
              Quarterly revenue, expenditure, budget balance and fiscal composition from official MINFIN General State Budget Execution Reports.
            </p>
          </div>
          <a href={latest.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white transition-colors hover:bg-white/20">
            Latest MINFIN report <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <FiscalCard label="Quarterly revenue" value={money(latest.totalRevenue)} context={`+${decimal.format(revenueYoy)}% vs 2025-Q1`} icon={BadgeDollarSign} positive />
          <FiscalCard label="Quarterly expenditure" value={money(latest.totalExpenditure)} context={`+${decimal.format(expenditureYoy)}% vs 2025-Q1`} icon={ReceiptText} />
          <FiscalCard label="Budget balance" value={money(latest.budgetBalance)} context={`${money(balanceImprovement)} improvement YoY`} icon={Scale} positive={latest.budgetBalance >= 0} />
          <FiscalCard label="Budget execution" value={`${decimal.format(latest.expenditureExecutionPct)}%`} context={`${decimal.format(latest.revenueExecutionPct)}% revenue execution`} icon={WalletCards} />
        </div>
      </div>

      <div className="p-5 sm:p-7">
        <div className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-xl bg-emerald-50 p-2 text-emerald-700"><TrendingUp className="h-5 w-5" /></div>
            <div><p className="text-sm font-medium">Latest analytical signal</p><p className="mt-1 text-sm text-muted-foreground">The balance moved from a {money(Math.abs(priorYear.budgetBalance))} deficit to a {money(latest.budgetBalance)} surplus between 2025-Q1 and 2026-Q1.</p></div>
          </div>
          <div className="flex w-fit rounded-xl bg-slate-100 p-1">
            {([['pulse', 'Fiscal pulse'], ['composition', 'Budget composition'], ['drivers', 'Key drivers']] as const).map(([id, label]) => (
              <button key={id} type="button" onClick={() => setView(id)} className={`rounded-lg px-3 py-2 text-xs transition-colors ${view === id ? 'bg-white text-[#075985] shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>{label}</button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          {view === 'pulse' && <FiscalPulse data={payload.data} />}
          {view === 'composition' && <BudgetComposition data={payload.data} />}
          {view === 'drivers' && <FiscalDrivers data={payload.data} />}
        </div>

        {exceptionPeriods.length > 0 && (
          <div className="mt-5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> Source metadata or rounding exceptions are documented for {exceptionPeriods.join(', ')}; official PDF values remain unchanged.
          </div>
        )}

        <div className="mt-6 grid gap-4 border-t border-border pt-5 md:grid-cols-3">
          <div><p className="text-xs text-muted-foreground">Coverage</p><p className="mt-1 text-sm">{payload.meta.firstPeriod} to {payload.meta.lastPeriod} · {payload.meta.observationCount} quarters</p></div>
          <div><p className="text-xs text-muted-foreground">Quality evidence</p><p className="mt-1 text-sm">Minimum score {Math.min(...payload.data.map((point) => point.qualityScore)).toFixed(2)} · {payload.meta.acceptedExceptionCount} affected quarters</p></div>
          <div><p className="text-xs text-muted-foreground">Official source</p><a href={payload.meta.sourceArchiveUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm text-[#075985] hover:underline">MINFIN execution reports <ExternalLink className="h-3.5 w-3.5" /></a></div>
        </div>
      </div>
    </section>
  );
}

function FiscalPulse({ data }: { data: FiscalExecutionQuarter[] }) {
  return <div><div className="mb-4"><h3 className="text-lg">Revenue, expenditure and quarterly balance</h3><p className="mt-1 text-sm text-muted-foreground">Official quarterly flows in million kwanza. Balance is revenue minus expenditure.</p></div>
    <ResponsiveContainer width="100%" height={360}><ComposedChart data={data} margin={{ top: 8, right: 12, left: 12, bottom: 8 }}>
      <defs><linearGradient id="fiscalRevenue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0891b2" stopOpacity={0.3}/><stop offset="95%" stopColor="#0891b2" stopOpacity={0.03}/></linearGradient></defs>
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/><XAxis dataKey="period" tick={{ fontSize: 11 }} stroke="#64748b"/>
      <YAxis yAxisId="flow" tickFormatter={(value) => `${decimal.format(value / 1_000_000)}T`} width={55} tick={{ fontSize: 11 }} stroke="#64748b"/>
      <YAxis yAxisId="balance" orientation="right" tickFormatter={(value) => `${decimal.format(value / 1_000)}B`} width={55} tick={{ fontSize: 11 }} stroke="#d97706"/>
      <Tooltip content={<FiscalTooltip />}/><Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }}/><ReferenceLine yAxisId="balance" y={0} stroke="#94a3b8"/>
      <Area yAxisId="flow" type="monotone" dataKey="totalRevenue" name="Revenue" stroke="#0891b2" fill="url(#fiscalRevenue)" strokeWidth={3}/>
      <Line yAxisId="flow" type="monotone" dataKey="totalExpenditure" name="Expenditure" stroke="#0f766e" strokeWidth={3} dot={{ r: 3 }}/>
      <Bar yAxisId="balance" dataKey="budgetBalance" name="Budget balance" fill="#f59e0b" barSize={24}/>
    </ComposedChart></ResponsiveContainer></div>;
}

function BudgetComposition({ data }: { data: FiscalExecutionQuarter[] }) {
  return <div><div className="mb-4"><h3 className="text-lg">Current and capital composition</h3><p className="mt-1 text-sm text-muted-foreground">Two stacked columns per quarter compare the composition of revenue and expenditure.</p></div>
    <ResponsiveContainer width="100%" height={360}><ComposedChart data={data} margin={{ top: 8, right: 12, left: 12, bottom: 8 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/><XAxis dataKey="period" tick={{ fontSize: 11 }} stroke="#64748b"/><YAxis tickFormatter={(value) => `${decimal.format(value / 1_000_000)}T`} width={55} tick={{ fontSize: 11 }} stroke="#64748b"/>
      <Tooltip content={<FiscalTooltip />}/><Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }}/>
      <Bar dataKey="currentRevenue" stackId="revenue" name="Current revenue" fill="#0891b2"/><Bar dataKey="capitalRevenue" stackId="revenue" name="Capital revenue" fill="#67e8f9"/>
      <Bar dataKey="currentExpenditure" stackId="expenditure" name="Current expenditure" fill="#0f766e"/><Bar dataKey="capitalExpenditure" stackId="expenditure" name="Capital expenditure" fill="#5eead4"/>
    </ComposedChart></ResponsiveContainer></div>;
}

function FiscalDrivers({ data }: { data: FiscalExecutionQuarter[] }) {
  return <div><div className="mb-4"><h3 className="text-lg">Revenue and spending drivers</h3><p className="mt-1 text-sm text-muted-foreground">Petroleum revenue against personnel, interest and investment expenditure.</p></div>
    <ResponsiveContainer width="100%" height={360}><ComposedChart data={data} margin={{ top: 8, right: 12, left: 12, bottom: 8 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/><XAxis dataKey="period" tick={{ fontSize: 11 }} stroke="#64748b"/><YAxis tickFormatter={(value) => `${decimal.format(value / 1_000_000)}T`} width={55} tick={{ fontSize: 11 }} stroke="#64748b"/>
      <Tooltip content={<FiscalTooltip />}/><Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }}/>
      <Bar dataKey="personnelExpenditure" name="Personnel" fill="#0e7490"/><Bar dataKey="interestExpenditure" name="Interest" fill="#14b8a6"/><Bar dataKey="investmentExpenditure" name="Investment" fill="#f59e0b"/>
      <Line type="monotone" dataKey="petroleumRevenue" name="Petroleum revenue" stroke="#1e3a8a" strokeWidth={3} dot={{ r: 4 }}/>
    </ComposedChart></ResponsiveContainer></div>;
}
