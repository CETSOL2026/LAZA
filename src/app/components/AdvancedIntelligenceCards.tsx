import { useEffect, useState } from 'react';
import { ArrowRight, BarChart3, Fuel, Landmark, LockKeyhole, Scale } from 'lucide-react';
import { loadFiscalExecution } from '../data/fiscalExecution';
import { loadOilGasAnalytics } from '../data/oilGas';
import { loadOilNonOilGdp } from '../data/oilNonOilGdp';
import { loadSovereignYieldCurve } from '../data/sovereignYieldCurve';
import {
  accessLabel,
  advancedProductAccess,
  minimumPlanForFullAccess,
  type SubscriptionPlan,
} from '../data/subscriptionAccess';

interface AdvancedIntelligenceCardsProps {
  onNavigate: (tab: string) => void;
  subscriptionPlan?: SubscriptionPlan;
  onUpgrade?: () => void;
}

interface LatestMetrics {
  diversification?: string;
  energy?: string;
  fiscal?: string;
  yield?: string;
}

function formatBalance(value: number) {
  const absolute = Math.abs(value);
  const display = absolute >= 1_000_000 ? `${(absolute / 1_000_000).toFixed(2)}T Kz` : `${(absolute / 1_000).toFixed(1)}B Kz`;
  return value < 0 ? `-${display}` : display;
}

export function AdvancedIntelligenceCards({ onNavigate, subscriptionPlan = 'free', onUpgrade }: AdvancedIntelligenceCardsProps) {
  const [latest, setLatest] = useState<LatestMetrics>({});

  useEffect(() => {
    const controller = new AbortController();
    Promise.allSettled([
      loadOilNonOilGdp(controller.signal), loadOilGasAnalytics(controller.signal),
      loadFiscalExecution(controller.signal), loadSovereignYieldCurve(controller.signal),
    ]).then(([gdp, oil, fiscal, curve]) => setLatest({
      diversification: gdp.status === 'fulfilled' ? `+${gdp.value.data.at(-1)!.nonOilYoyPct.toFixed(2)}%` : undefined,
      energy: oil.status === 'fulfilled' ? `${(oil.value.data.at(-1)!.oilActualBopd / 1_000_000).toFixed(2)}M BOPD` : undefined,
      fiscal: fiscal.status === 'fulfilled' ? formatBalance(fiscal.value.data.at(-1)!.budgetBalance) : undefined,
      yield: curve.status === 'fulfilled' ? `${curve.value.data.at(-1)!.yield10y.toFixed(2)}%` : undefined,
    }));
    return () => controller.abort();
  }, []);

  const cards = [
    { id: 'advanced-gdp-diversification', topic: 'Macroeconomy & Diversification', title: 'Oil vs. Non-Oil GDP', description: 'Understand which side of the economy is driving quarterly growth and how the GDP structure is changing.', metric: latest.diversification, metricLabel: 'Non-oil growth', icon: BarChart3, tone: 'from-[#052e2b] to-[#0f766e]', accent: 'text-emerald-700 bg-emerald-50' },
    { id: 'advanced-oil-gas', topic: 'Energy', title: 'Oil & Gas Production', description: 'Track crude output against forecast, associated gas allocation and Angola LNG production.', metric: latest.energy, metricLabel: 'Latest oil production', icon: Fuel, tone: 'from-[#450a0a] to-[#b91c1c]', accent: 'text-rose-800 bg-rose-50' },
    { id: 'advanced-fiscal-execution', topic: 'Public Finance', title: 'Fiscal Execution', description: 'Compare revenue, expenditure, execution rates and the evolving quarterly budget balance.', metric: latest.fiscal, metricLabel: 'Latest budget balance', icon: Scale, tone: 'from-[#082f49] to-[#0f766e]', accent: 'text-cyan-700 bg-cyan-50' },
    { id: 'advanced-sovereign-yield', topic: 'Capital Markets', title: 'Sovereign Yield Curve', description: 'Explore observed Treasury yields, sovereign spreads and shifts across the maturity curve.', metric: latest.yield, metricLabel: 'Latest 10-year yield', icon: Landmark, tone: 'from-[#24104f] to-[#7c3aed]', accent: 'text-violet-700 bg-violet-50' },
  ];

  return <section>
    <div className="mb-6"><p className="text-xs uppercase tracking-[0.16em] text-primary">Advanced Market Intelligence</p><h2 className="mt-1 text-2xl tracking-tight">Focused analytical products</h2><p className="mt-1 text-muted-foreground">Open a dedicated page for deeper analysis, source evidence and interactive views.</p></div>
    <div className="grid gap-5 md:grid-cols-2">
      {cards.map((card) => {
        const Icon = card.icon;
        const access = advancedProductAccess[card.id][subscriptionPlan];
        const canOpen = access === 'full';
        return <button key={card.id} type="button" onClick={() => { if (canOpen) onNavigate(card.id); else onUpgrade?.(); }} className={`group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-white text-left shadow-sm transition-all ${canOpen || onUpgrade ? 'hover:-translate-y-0.5 hover:shadow-xl' : 'cursor-default opacity-95'}`}>
          <div className={`w-full bg-gradient-to-br ${card.tone} p-5 text-white`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[11px] uppercase tracking-[0.15em] text-white/60">{card.topic}</p>
                  <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] text-white/80">{accessLabel(access)}</span>
                </div>
                <h3 className="mt-2 text-xl">{card.title}</h3>
              </div>
              <div className="rounded-xl border border-white/15 bg-white/10 p-2.5">{canOpen ? <Icon className="h-5 w-5" /> : <LockKeyhole className="h-5 w-5" />}</div>
            </div>
            <div className="mt-5"><p className="text-2xl">{card.metric ?? 'Loading...'}</p><p className="mt-1 text-xs text-white/60">{card.metricLabel}</p></div>
          </div>
          <div className="flex w-full flex-1 flex-col items-start p-5">
            <p className="text-sm leading-6 text-muted-foreground">{card.description}</p>
            <span className={`mt-4 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${card.accent}`}>
              {canOpen ? 'Open analysis' : `View ${minimumPlanForFullAccess(advancedProductAccess[card.id])} access`}
              <ArrowRight className={`h-3.5 w-3.5 transition-transform ${canOpen ? 'group-hover:translate-x-1' : ''}`} />
            </span>
          </div>
        </button>;
      })}
    </div>
  </section>;
}
