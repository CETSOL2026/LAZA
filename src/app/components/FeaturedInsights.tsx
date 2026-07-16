import { useEffect, useState } from 'react';
import { ArrowRight, Landmark, Scale, TrendingDown, TrendingUp } from 'lucide-react';
import { loadFiscalExecution, FiscalExecutionQuarter } from '../data/fiscalExecution';
import { loadLatestIndicators, PilotIndicator } from '../data/indicators';
import { loadOilNonOilGdp, OilNonOilGdpQuarter } from '../data/oilNonOilGdp';

interface FeaturedInsightsProps {
  onNavigate: (tab: string) => void;
  onIndicatorSelect: (indicatorId: string) => void;
}

function formatKz(value: number) {
  const absolute = Math.abs(value);
  const display = absolute >= 1_000_000 ? `${(absolute / 1_000_000).toFixed(2)}T Kz` : `${(absolute / 1_000).toFixed(1)}B Kz`;
  return value < 0 ? `-${display}` : display;
}

export function FeaturedInsights({ onNavigate, onIndicatorSelect }: FeaturedInsightsProps) {
  const [indicators, setIndicators] = useState<PilotIndicator[]>([]);
  const [gdp, setGdp] = useState<OilNonOilGdpQuarter | null>(null);
  const [fiscal, setFiscal] = useState<FiscalExecutionQuarter | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    Promise.allSettled([loadLatestIndicators(controller.signal), loadOilNonOilGdp(controller.signal), loadFiscalExecution(controller.signal)])
      .then(([latest, oilNonOil, fiscalExecution]) => {
        if (latest.status === 'fulfilled') setIndicators(latest.value.data);
        if (oilNonOil.status === 'fulfilled') setGdp(oilNonOil.value.data.at(-1) ?? null);
        if (fiscalExecution.status === 'fulfilled') setFiscal(fiscalExecution.value.data.at(-1) ?? null);
      });
    return () => controller.abort();
  }, []);

  const inflation = indicators.find((item) => item.id === 'inflation-rate');
  const banking = indicators.find((item) => item.id === 'banking-assets');
  const insights = [
    { title: 'Non-Oil Growth Momentum', description: gdp ? `Non-oil activity contributed ${gdp.nonOilContributionPp.toFixed(2)} pp to ${gdp.totalYoyPct.toFixed(2)}% total GDP growth in ${gdp.period}.` : 'Loading the latest official INE diversification signal.', metric: gdp ? `${gdp.nonOilYoyPct >= 0 ? '+' : ''}${gdp.nonOilYoyPct.toFixed(2)}%` : '—', period: gdp?.period, icon: TrendingUp, tone: 'text-emerald-700 bg-emerald-50', action: () => onNavigate('advanced-gdp-diversification') },
    { title: 'National Inflation', description: inflation ? `National IPCN inflation reached ${inflation.value} in ${inflation.period}, based on the official INE monthly publication.` : 'Loading the latest official INE inflation value.', metric: inflation?.value ?? '—', period: inflation?.period, icon: TrendingDown, tone: 'text-orange-700 bg-orange-50', action: () => onIndicatorSelect('inflation-rate') },
    { title: 'Banking Sector Assets', description: banking ? `Other depository corporations reported ${banking.value} in total assets for ${banking.period}.` : 'Loading the latest official BNA banking-assets value.', metric: banking?.change || banking?.value || '—', period: banking?.period, icon: Landmark, tone: 'text-blue-700 bg-blue-50', action: () => onIndicatorSelect('banking-assets') },
    { title: 'Fiscal Balance', description: fiscal ? `The reported budget balance was ${formatKz(fiscal.budgetBalance)} in ${fiscal.period}, with revenue execution at ${fiscal.revenueExecutionPct.toFixed(1)}%.` : 'Loading the latest official MINFIN fiscal-execution result.', metric: fiscal ? formatKz(fiscal.budgetBalance) : '—', period: fiscal?.period, icon: Scale, tone: 'text-violet-700 bg-violet-50', action: () => onNavigate('advanced-fiscal-execution') },
  ];

  return <section>
    <div className="mb-6"><p className="text-xs uppercase tracking-[0.16em] text-primary">Source-backed signals</p><h2 className="mt-1 text-2xl tracking-tight">Featured official insights</h2><p className="mt-1 text-muted-foreground">Calculated from the latest published values in the LAZA governed data platform.</p></div>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">{insights.map((insight) => { const Icon = insight.icon; return <button type="button" key={insight.title} onClick={insight.action} className="group rounded-xl border border-border bg-card p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-lg"><div className="mb-4 flex items-start justify-between gap-3"><div className={`rounded-lg p-2 ${insight.tone}`}><Icon className="h-5 w-5" /></div><span className={`rounded-full px-2 py-1 text-xs ${insight.tone}`}>{insight.metric}</span></div><h3 className="mb-2 text-base transition-colors group-hover:text-primary">{insight.title}</h3><p className="text-sm leading-relaxed text-muted-foreground">{insight.description}</p><div className="mt-4 flex items-center justify-between text-xs"><span className="text-muted-foreground">{insight.period ?? 'Official data'}</span><span className="inline-flex items-center gap-1 text-primary">Open details <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" /></span></div></button>; })}</div>
  </section>;
}
