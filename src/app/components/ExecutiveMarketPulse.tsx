import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3, Building2, Landmark, TrendingUp } from 'lucide-react';
import {
  loadBankingAssetsHistory,
  loadGdpHistory,
  loadInflationHistory,
  type IndicatorHistoryPoint,
} from '../data/indicators';
import { loadFiscalExecution, type FiscalExecutionQuarter } from '../data/fiscalExecution';
import { loadOilNonOilGdp, type OilNonOilGdpQuarter } from '../data/oilNonOilGdp';

interface PulseState {
  gdp?: IndicatorHistoryPoint[];
  inflation?: IndicatorHistoryPoint[];
  banking?: IndicatorHistoryPoint[];
  fiscal?: FiscalExecutionQuarter[];
  diversification?: OilNonOilGdpQuarter[];
}

const chartGrid = '#e5e7eb';
const axisStyle = { fontSize: '11px' };

function compactPeriod(period: string) {
  return period.replace('2026-', "'26 ").replace('2025-', "'25 ").replace('2024-', "'24 ");
}

function trillionAoa(value: number) {
  return Number((value / 1_000_000).toFixed(2));
}

function ChartCard({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: typeof BarChart3;
  children: ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-border bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 text-base tracking-tight">
            <Icon className="h-4 w-4 text-primary" />
            {title}
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="h-[250px]">{children}</div>
    </article>
  );
}

export function ExecutiveMarketPulse() {
  const [pulse, setPulse] = useState<PulseState>({});
  const [status, setStatus] = useState<'loading' | 'ready' | 'partial'>('loading');

  useEffect(() => {
    const controller = new AbortController();
    Promise.allSettled([
      loadGdpHistory(controller.signal),
      loadInflationHistory(controller.signal),
      loadBankingAssetsHistory(controller.signal),
      loadFiscalExecution(controller.signal),
      loadOilNonOilGdp(controller.signal),
    ]).then(([gdp, inflation, banking, fiscal, diversification]) => {
      const nextPulse: PulseState = {};
      if (gdp.status === 'fulfilled') nextPulse.gdp = gdp.value.data;
      if (inflation.status === 'fulfilled') nextPulse.inflation = inflation.value.data;
      if (banking.status === 'fulfilled') nextPulse.banking = banking.value.data;
      if (fiscal.status === 'fulfilled') nextPulse.fiscal = fiscal.value.data;
      if (diversification.status === 'fulfilled') nextPulse.diversification = diversification.value.data;
      setPulse(nextPulse);
      setStatus(Object.keys(nextPulse).length >= 3 ? 'ready' : 'partial');
    });
    return () => controller.abort();
  }, []);

  const economyTrend = useMemo(
    () => (pulse.gdp ?? []).slice(-8).map((point) => ({
      period: compactPeriod(point.period),
      growth: point.numericValue,
    })),
    [pulse.gdp],
  );

  const inflationTrend = useMemo(
    () => (pulse.inflation ?? []).slice(-12).map((point) => ({
      period: compactPeriod(point.period),
      inflation: point.numericValue,
    })),
    [pulse.inflation],
  );

  const bankingTrend = useMemo(
    () => (pulse.banking ?? []).slice(-12).map((point) => ({
      period: compactPeriod(point.period),
      assets: Number((point.numericValue / 1_000_000_000_000).toFixed(2)),
    })),
    [pulse.banking],
  );

  const fiscalTrend = useMemo(
    () => (pulse.fiscal ?? []).map((point) => ({
      period: point.period,
      revenue: trillionAoa(point.totalRevenue),
      expenditure: trillionAoa(point.totalExpenditure),
      balance: trillionAoa(point.budgetBalance),
    })),
    [pulse.fiscal],
  );

  const diversificationTrend = useMemo(
    () => (pulse.diversification ?? []).slice(-8).map((point) => ({
      period: point.period,
      oil: point.oilContributionPp,
      nonOil: point.nonOilContributionPp,
    })),
    [pulse.diversification],
  );

  const hasData = economyTrend.length > 0 || inflationTrend.length > 0 || bankingTrend.length > 0 || fiscalTrend.length > 0;

  if (status === 'loading' || !hasData) {
    return (
      <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.16em] text-primary">Executive dashboard</p>
        <h2 className="mt-1 text-2xl tracking-tight">Market Pulse</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-[310px] animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-primary">Executive dashboard</p>
          <h2 className="mt-1 text-2xl tracking-tight">Market Pulse</h2>
          <p className="mt-1 max-w-3xl text-muted-foreground">
            Fast-reading views for executives: growth, inflation, banking depth, fiscal execution and diversification momentum.
          </p>
        </div>
        <span className={`inline-flex w-fit rounded-full border px-3 py-1.5 text-xs ${
          status === 'ready' ? 'border-green-200 bg-green-50 text-green-800' : 'border-amber-200 bg-amber-50 text-amber-800'
        }`}>
          {status === 'ready' ? 'Source-backed pulse' : 'Partial source evidence'}
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard title="Economy Overview" subtitle="Quarterly GDP growth with monthly inflation context" icon={TrendingUp}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={economyTrend.map((point, index) => ({ ...point, inflation: inflationTrend.at(index - economyTrend.length)?.inflation }))} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="executiveGdpGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#bf1f27" stopOpacity={0.65} />
                  <stop offset="95%" stopColor="#bf1f27" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
              <XAxis dataKey="period" tick={axisStyle} />
              <YAxis tick={axisStyle} />
              <Tooltip />
              <Area isAnimationActive={false} type="monotone" dataKey="growth" name="GDP growth %" stroke="#bf1f27" fill="url(#executiveGdpGradient)" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Inflation Watch" subtitle="Latest 12 monthly IPCN year-over-year observations" icon={BarChart3}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={inflationTrend} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="executiveInflationGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.55} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
              <XAxis dataKey="period" tick={axisStyle} interval={1} />
              <YAxis tick={axisStyle} />
              <Tooltip />
              <Area isAnimationActive={false} type="monotone" dataKey="inflation" name="Inflation %" stroke="#d97706" fill="url(#executiveInflationGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Financial System" subtitle="Banking assets trend from BNA monetary statistics" icon={Building2}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={bankingTrend} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="executiveBankingGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
              <XAxis dataKey="period" tick={axisStyle} interval={1} />
              <YAxis tick={axisStyle} />
              <Tooltip />
              <Area isAnimationActive={false} type="monotone" dataKey="assets" name="Assets Kz tn" stroke="#0284c7" fill="url(#executiveBankingGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Public Finance" subtitle="Fiscal execution: revenue, expenditure and balance" icon={Landmark}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={fiscalTrend} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
              <XAxis dataKey="period" tick={axisStyle} />
              <YAxis tick={axisStyle} />
              <Tooltip />
              <Bar isAnimationActive={false} dataKey="revenue" name="Revenue Kz tn" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar isAnimationActive={false} dataKey="expenditure" name="Expenditure Kz tn" fill="#bf1f27" radius={[4, 4, 0, 0]} />
              <Line isAnimationActive={false} type="monotone" dataKey="balance" name="Balance Kz tn" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {diversificationTrend.length > 0 && (
        <div className="mt-5 rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-base tracking-tight">Diversification Momentum</h3>
            <p className="mt-1 text-xs text-muted-foreground">Oil and non-oil contribution to total GDP growth, latest official quarters.</p>
          </div>
          <div className="h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={diversificationTrend} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                <XAxis dataKey="period" tick={axisStyle} />
                <YAxis tick={axisStyle} />
                <Tooltip />
                <Bar isAnimationActive={false} dataKey="nonOil" name="Non-oil contribution pp" fill="#0f766e" radius={[4, 4, 0, 0]} />
                <Bar isAnimationActive={false} dataKey="oil" name="Oil contribution pp" fill="#bf1f27" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </section>
  );
}
