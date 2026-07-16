import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';
import { loadOilNonOilGdp, OilNonOilGdpQuarter } from '../data/oilNonOilGdp';

export function FeaturedInsights({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const [gdp, setGdp] = useState<OilNonOilGdpQuarter | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    loadOilNonOilGdp(controller.signal).then((payload) => setGdp(payload.data.at(-1) ?? null)).catch(() => undefined);
    return () => controller.abort();
  }, []);

  const insights = [
    {
      title: 'Non-Oil Growth Momentum',
      description: gdp
        ? `Non-oil activity generated ${gdp.nonOilContributionPp.toFixed(2)} pp of ${gdp.totalYoyPct.toFixed(2)}% total GDP growth in ${gdp.period}.`
        : 'Loading the latest official INE diversification signal.',
      icon: TrendingUp,
      metric: gdp ? `${gdp.nonOilYoyPct >= 0 ? '+' : ''}${gdp.nonOilYoyPct.toFixed(2)}%` : '—',
      color: 'text-green-600 bg-green-50',
      target: 'advanced-gdp-diversification',
    },
    {
      title: 'Laza Equity Index', description: 'Laza Equity Index fell by 2.1% in today\'s trading', icon: TrendingDown,
      metric: '-2.1%', color: 'text-blue-600 bg-blue-50', target: undefined,
    },
    {
      title: 'Banking Sector Growth', description: 'Total banking assets increase by 5.4% reaching $48.2B', icon: CheckCircle,
      metric: '+5.4%', color: 'text-purple-600 bg-purple-50', target: undefined,
    },
    {
      title: 'Fiscal Deficit Narrows', description: 'Government budget deficit improves to 2.7% of GDP', icon: AlertCircle,
      metric: '2.7%', color: 'text-orange-600 bg-orange-50', target: undefined,
    },
  ];

  return <section>
    <div className="mb-6 flex items-center justify-between"><div><h2 className="mb-1 text-2xl tracking-tight">Featured Insights</h2><p className="text-muted-foreground">Check our Insights on the economy and financial markets</p></div></div>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {insights.map((insight) => { const Icon = insight.icon; return <button type="button" key={insight.title} onClick={() => insight.target && onNavigate?.(insight.target)} disabled={!insight.target}
        className={`group rounded-xl border border-border bg-card p-5 text-left transition-all ${insight.target ? 'cursor-pointer hover:border-primary/20 hover:shadow-lg' : 'cursor-default'}`}>
        <div className="mb-3 flex items-start justify-between"><div className={`rounded-lg p-2 ${insight.color}`}><Icon className="h-5 w-5" /></div><span className={`rounded-full px-2 py-1 text-sm ${insight.color}`}>{insight.metric}</span></div>
        <h3 className="mb-2 text-base transition-colors group-hover:text-primary">{insight.title}</h3><p className="text-sm leading-relaxed text-muted-foreground">{insight.description}</p>
      </button>; })}
    </div>
  </section>;
}
