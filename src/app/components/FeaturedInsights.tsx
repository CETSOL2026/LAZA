import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Bot, CheckCircle2, Landmark, Scale, ShieldCheck, TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';
import { buildAiInsightCards, type AiInsightCard, type InsightTone } from '../data/aiInsights';
import { loadFiscalExecution, type FiscalExecutionResponse } from '../data/fiscalExecution';
import { loadLatestIndicators, type IndicatorApiResponse } from '../data/indicators';
import { loadOilGasAnalytics, type OilGasAnalyticsResponse } from '../data/oilGas';
import { loadOilNonOilGdp, type OilNonOilGdpResponse } from '../data/oilNonOilGdp';
import { loadSovereignYieldCurve, type SovereignYieldCurveResponse } from '../data/sovereignYieldCurve';
import { planLabel, subscriptionRank, type SubscriptionPlan } from '../data/subscriptionAccess';

interface FeaturedInsightsProps {
  onNavigate: (tab: string) => void;
  onIndicatorSelect: (indicatorId: string) => void;
  subscriptionPlan?: SubscriptionPlan;
  onUpgrade?: () => void;
}

interface InsightInputsState {
  latestIndicators?: IndicatorApiResponse;
  oilNonOil?: OilNonOilGdpResponse;
  fiscal?: FiscalExecutionResponse;
  oilGas?: OilGasAnalyticsResponse;
  yieldCurve?: SovereignYieldCurveResponse;
}

const toneStyles: Record<InsightTone, string> = {
  emerald: 'text-emerald-700 bg-emerald-50 border-emerald-100',
  orange: 'text-amber-800 bg-amber-50 border-amber-100',
  blue: 'text-blue-700 bg-blue-50 border-blue-100',
  violet: 'text-violet-700 bg-violet-50 border-violet-100',
  red: 'text-rose-800 bg-rose-50 border-rose-100',
};

const insightIcons: Record<string, LucideIcon> = {
  'ai-diversification-momentum': TrendingUp,
  'ai-inflation-direction': TrendingDown,
  'ai-fiscal-balance': Scale,
  'ai-oil-production-forecast-gap': Landmark,
  'ai-sovereign-curve-premium': ShieldCheck,
};

function canOpenInsight(insight: AiInsightCard, subscriptionPlan: SubscriptionPlan) {
  return subscriptionRank[subscriptionPlan] >= subscriptionRank[insight.minimumPlan];
}

export function FeaturedInsights({ onNavigate, onIndicatorSelect, subscriptionPlan = 'free', onUpgrade }: FeaturedInsightsProps) {
  const [inputs, setInputs] = useState<InsightInputsState>({});
  const [status, setStatus] = useState<'loading' | 'ready' | 'partial'>('loading');

  useEffect(() => {
    const controller = new AbortController();
    Promise.allSettled([
      loadLatestIndicators(controller.signal),
      loadOilNonOilGdp(controller.signal),
      loadFiscalExecution(controller.signal),
      loadOilGasAnalytics(controller.signal),
      loadSovereignYieldCurve(controller.signal),
    ]).then(([latestIndicators, oilNonOil, fiscal, oilGas, yieldCurve]) => {
      const nextInputs: InsightInputsState = {};
      if (latestIndicators.status === 'fulfilled') nextInputs.latestIndicators = latestIndicators.value;
      if (oilNonOil.status === 'fulfilled') nextInputs.oilNonOil = oilNonOil.value;
      if (fiscal.status === 'fulfilled') nextInputs.fiscal = fiscal.value;
      if (oilGas.status === 'fulfilled') nextInputs.oilGas = oilGas.value;
      if (yieldCurve.status === 'fulfilled') nextInputs.yieldCurve = yieldCurve.value;
      setInputs(nextInputs);
      setStatus(Object.keys(nextInputs).length >= 3 ? 'ready' : 'partial');
    });
    return () => controller.abort();
  }, []);

  const insights = useMemo(() => buildAiInsightCards(inputs), [inputs]);
  const featuredInsights = insights.slice(0, 4);

  function openInsight(insight: AiInsightCard) {
    if (!canOpenInsight(insight, subscriptionPlan)) {
      onUpgrade?.();
      return;
    }
    if (insight.relatedTarget.type === 'indicator') onIndicatorSelect(insight.relatedTarget.id);
    else onNavigate(insight.relatedTarget.id);
  }

  return <section>
    <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-primary">Featured executive insights</p>
        <h2 className="mt-1 text-2xl tracking-tight">Featured Insights</h2>
        <p className="mt-1 text-muted-foreground">Fast-reading signals generated from Gold data, with source, quality and review evidence preserved.</p>
        <button type="button" onClick={() => onNavigate('data-quality')} className="mt-2 text-xs text-primary underline-offset-4 hover:underline">Rule-generated means deterministic, source-backed logic — see methodology.</button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${status === 'ready' ? 'border-green-200 bg-green-50 text-green-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
          <Bot className="h-3.5 w-3.5" />
          {status === 'loading' ? 'Generating local insights...' : status === 'ready' ? `${featuredInsights.length} featured signals` : 'Partial insight evidence'}
        </div>
        <button
          type="button"
          onClick={() => onNavigate('insights')}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs text-white shadow-sm transition-colors hover:bg-primary/90"
        >
          View all insights
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>

    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
      {(featuredInsights.length ? featuredInsights : Array.from({ length: 4 }, () => null)).map((insight, index) => {
        if (!insight) return <div key={`loading-${index}`} className="min-h-[260px] animate-pulse rounded-xl border border-border bg-card p-5"><div className="mb-4 h-10 w-10 rounded-lg bg-muted" /><div className="h-4 w-3/4 rounded bg-muted" /><div className="mt-4 h-20 rounded bg-muted" /></div>;
        const Icon = insightIcons[insight.id] ?? Bot;
        const tone = toneStyles[insight.tone];
        const allowed = canOpenInsight(insight, subscriptionPlan);
        return <button type="button" key={insight.id} onClick={() => openInsight(insight)} className={`group flex min-h-[300px] flex-col rounded-xl border border-border bg-card p-5 text-left transition-all ${allowed ? 'hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-lg' : 'cursor-default opacity-90'}`}>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className={`rounded-lg border p-2 ${tone}`}><Icon className="h-5 w-5" /></div>
            <span className={`max-w-[45%] truncate rounded-full border px-2 py-1 text-xs ${tone}`} title={insight.metric}>{insight.metric}</span>
          </div>
          <h3 className="mb-2 text-base transition-colors group-hover:text-primary">{insight.title}</h3>
          <p className="overflow-hidden text-sm leading-relaxed text-muted-foreground [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:4]">{insight.summary}</p>
          <div className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
            <div className="flex items-center justify-between gap-3">
              <span className="truncate" title={insight.sourceName}>{insight.sourceName}</span>
              <span className="shrink-0 text-foreground">Q {insight.qualityScore == null ? 'n/a' : insight.qualityScore.toFixed(1)}</span>
            </div>
            <div className="mt-2 inline-flex items-center gap-1 text-emerald-700">
              <CheckCircle2 className="h-3 w-3" />
              {insight.reviewStatus === 'rule-generated' ? 'Rule-generated' : 'Needs review'}
            </div>
          </div>
          <div className="mt-auto flex items-center justify-between gap-4 pt-4 text-xs">
            <span className="min-w-0 flex-1 truncate font-mono text-muted-foreground" title={insight.ruleId}>{insight.ruleId}</span>
            <span className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap ${allowed ? 'text-primary' : 'text-muted-foreground'}`}>
              {allowed ? 'Open details' : `View ${planLabel(insight.minimumPlan)} access`}
              <ArrowRight className={`h-3.5 w-3.5 transition-transform ${allowed ? 'group-hover:translate-x-1' : ''}`} />
            </span>
          </div>
        </button>;
      })}
    </div>
  </section>;
}
