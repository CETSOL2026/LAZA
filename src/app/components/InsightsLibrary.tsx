import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Landmark,
  Scale,
  Search,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { buildAiInsightCards, type AiInsightCard, type InsightTone } from '../data/aiInsights';
import { loadFiscalExecution, type FiscalExecutionResponse } from '../data/fiscalExecution';
import { loadLatestIndicators, type IndicatorApiResponse } from '../data/indicators';
import { loadOilGasAnalytics, type OilGasAnalyticsResponse } from '../data/oilGas';
import { loadOilNonOilGdp, type OilNonOilGdpResponse } from '../data/oilNonOilGdp';
import { loadSovereignYieldCurve, type SovereignYieldCurveResponse } from '../data/sovereignYieldCurve';
import { planLabel, subscriptionRank, type SubscriptionPlan } from '../data/subscriptionAccess';

interface InsightsLibraryProps {
  subscriptionPlan?: SubscriptionPlan;
  onNavigate: (tab: string) => void;
  onIndicatorSelect: (indicatorId: string) => void;
  onUpgrade?: () => void;
}

interface InsightInputsState {
  latestIndicators?: IndicatorApiResponse;
  oilNonOil?: OilNonOilGdpResponse;
  fiscal?: FiscalExecutionResponse;
  oilGas?: OilGasAnalyticsResponse;
  yieldCurve?: SovereignYieldCurveResponse;
}

const topicFilters = ['All', 'Economy', 'Prices', 'Public Finance', 'Energy', 'Capital Markets'];
const reviewFilters = ['All', 'Rule-generated', 'Needs review'];

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

function insightTopic(insight: AiInsightCard) {
  if (insight.id.includes('inflation')) return 'Prices';
  if (insight.id.includes('fiscal')) return 'Public Finance';
  if (insight.id.includes('oil-production')) return 'Energy';
  if (insight.id.includes('sovereign')) return 'Capital Markets';
  return 'Economy';
}

function canOpenInsight(insight: AiInsightCard, subscriptionPlan: SubscriptionPlan) {
  return subscriptionRank[subscriptionPlan] >= subscriptionRank[insight.minimumPlan];
}

export function InsightsLibrary({ subscriptionPlan = 'free', onNavigate, onIndicatorSelect, onUpgrade }: InsightsLibraryProps) {
  const [inputs, setInputs] = useState<InsightInputsState>({});
  const [status, setStatus] = useState<'loading' | 'ready' | 'partial'>('loading');
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState('All');
  const [reviewStatus, setReviewStatus] = useState('All');

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
  const filteredInsights = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return insights.filter((insight) => {
      const currentTopic = insightTopic(insight);
      const reviewLabel = insight.reviewStatus === 'rule-generated' ? 'Rule-generated' : 'Needs review';
      const haystack = `${insight.title} ${insight.summary} ${insight.sourceName} ${insight.ruleId} ${currentTopic}`.toLowerCase();
      return (topic === 'All' || currentTopic === topic)
        && (reviewStatus === 'All' || reviewLabel === reviewStatus)
        && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }, [insights, query, reviewStatus, topic]);

  function openInsight(insight: AiInsightCard) {
    if (!canOpenInsight(insight, subscriptionPlan)) {
      onUpgrade?.();
      return;
    }
    if (insight.relatedTarget.type === 'indicator') onIndicatorSelect(insight.relatedTarget.id);
    else onNavigate(insight.relatedTarget.id);
  }

  return (
    <section className="space-y-8">
      <div className="rounded-3xl border border-border bg-gradient-to-br from-primary/5 via-white to-slate-50 p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-primary">Insights library</p>
            <h1 className="mt-2 text-3xl tracking-tight sm:text-4xl">All Insights</h1>
            <p className="mt-3 max-w-3xl text-muted-foreground">
              Review every rule-generated signal from Gold data, preserving source, period, quality, rule and review status.
            </p>
          </div>
          <div className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${
            status === 'ready' ? 'border-green-200 bg-green-50 text-green-800' : 'border-amber-200 bg-amber-50 text-amber-800'
          }`}>
            <Bot className="h-3.5 w-3.5" />
            {status === 'loading' ? 'Generating insights...' : status === 'ready' ? `${insights.length} source-backed insights` : 'Partial insight evidence'}
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            ['Rule-generated', insights.filter((item) => item.reviewStatus === 'rule-generated').length],
            ['Needs review', insights.filter((item) => item.reviewStatus === 'needs-review').length],
            ['Topics covered', new Set(insights.map(insightTopic)).size],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl border border-border bg-white p-4">
              <p className="text-2xl text-primary">{String(value)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{String(label)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(260px,0.9fr)_minmax(0,1.4fr)_minmax(220px,0.7fr)] lg:items-center">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search insights, rules or sources..."
            className="w-full rounded-xl border border-border bg-white py-3 pl-11 pr-4 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {topicFilters.map((filter) => (
            <button
              type="button"
              key={filter}
              onClick={() => setTopic(filter)}
              className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
                topic === filter ? 'border-primary bg-primary text-white' : 'border-border bg-white hover:border-primary/30 hover:bg-primary/5'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
        <select
          value={reviewStatus}
          onChange={(event) => setReviewStatus(event.target.value)}
          className="rounded-xl border border-border bg-white px-3 py-3 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
        >
          {reviewFilters.map((filter) => <option key={filter}>{filter}</option>)}
        </select>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {filteredInsights.map((insight) => {
          const Icon = insightIcons[insight.id] ?? Bot;
          const tone = toneStyles[insight.tone];
          const allowed = canOpenInsight(insight, subscriptionPlan);
          return (
            <article key={insight.id} className="flex h-full flex-col rounded-2xl border border-border bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div className={`rounded-xl border p-3 ${tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className={`max-w-[45%] truncate rounded-full border px-3 py-1 text-xs ${tone}`} title={insight.metric}>{insight.metric}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] uppercase tracking-[0.12em] text-primary">{insightTopic(insight)}</span>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{planLabel(insight.minimumPlan)}+</span>
              </div>
              <h2 className="mt-3 text-xl tracking-tight">{insight.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{insight.summary}</p>

              <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Period</dt>
                  <dd className="mt-1">{insight.period}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Quality</dt>
                  <dd className="mt-1">{insight.qualityScore == null ? 'n/a' : `${insight.qualityScore.toFixed(1)}/100`}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs text-muted-foreground">Source</dt>
                  <dd className="mt-1 truncate" title={insight.sourceName}>{insight.sourceName}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs text-muted-foreground">Rule</dt>
                  <dd className="mt-1 truncate font-mono text-xs" title={insight.ruleId}>{insight.ruleId}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs text-muted-foreground">Review status</dt>
                  <dd className="mt-1 inline-flex items-center gap-1 text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {insight.reviewStatus === 'rule-generated' ? 'Rule-generated' : 'Needs review'}
                  </dd>
                </div>
              </dl>

              <button
                type="button"
                onClick={() => openInsight(insight)}
                className={`mt-5 inline-flex w-fit items-center gap-2 rounded-xl px-4 py-2.5 text-sm transition-colors ${
                  allowed ? 'bg-primary text-white hover:bg-primary/90' : 'border border-border bg-muted text-muted-foreground hover:bg-slate-100'
                }`}
              >
                {allowed ? 'Open source detail' : `View ${planLabel(insight.minimumPlan)} access`}
                <ArrowRight className="h-4 w-4" />
              </button>
            </article>
          );
        })}
      </div>

      {filteredInsights.length === 0 && (
        <div className="rounded-2xl border border-border bg-white p-8 text-center text-muted-foreground">
          No insights match the current search and filters.
        </div>
      )}
    </section>
  );
}
