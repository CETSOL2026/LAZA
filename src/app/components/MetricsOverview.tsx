import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ExternalLink, Info, LockKeyhole, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import {
  IndicatorHistoryPoint,
  loadBankingAssetsHistory,
  loadExchangeHistory,
  loadGdpHistory,
  loadInflationHistory,
  loadLatestIndicators,
  loadPopulationHistory,
  loadPublicDebtHistory,
  pilotIndicators,
} from '../data/indicators';
import {
  accessLabel,
  minimumPlanForFullAccess,
  officialIndicatorAccess,
  planLabel,
  type SubscriptionPlan,
} from '../data/subscriptionAccess';

const IndicatorHistoryChart = lazy(() => import('./IndicatorHistoryChart').then((module) => ({ default: module.IndicatorHistoryChart })));

interface MetricsOverviewProps {
  summaryOnly?: boolean;
  initialSelectedId?: string;
  onIndicatorSelect?: (indicatorId: string) => void;
  subscriptionPlan?: SubscriptionPlan;
}

export function MetricsOverview({ summaryOnly = false, initialSelectedId, onIndicatorSelect, subscriptionPlan = 'free' }: MetricsOverviewProps) {
  const [indicators, setIndicators] = useState(pilotIndicators);
  const [selectedId, setSelectedId] = useState(initialSelectedId ?? pilotIndicators[0].id);
  const [connectionStatus, setConnectionStatus] = useState<'loading' | 'connected' | 'fallback'>('loading');
  const [inflationHistory, setInflationHistory] = useState<IndicatorHistoryPoint[]>([]);
  const [historyStatus, setHistoryStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [historyIndicatorId, setHistoryIndicatorId] = useState('');
  const [appliedInitialSelectedId, setAppliedInitialSelectedId] = useState(initialSelectedId);
  if (initialSelectedId !== appliedInitialSelectedId) {
    setAppliedInitialSelectedId(initialSelectedId);
    if (initialSelectedId) setSelectedId(initialSelectedId);
  }
  const selected = indicators.find((indicator) => indicator.id === selectedId) ?? indicators[0];
  const selectedAccess = officialIndicatorAccess[selected.id]?.[subscriptionPlan] ?? 'full';
  const selectedNeedsUpgrade = selectedAccess !== 'full';
  const officialCount = useMemo(
    () => indicators.filter((indicator) => indicator.isOfficial).length,
    [indicators],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadLatestIndicators(controller.signal)
      .then((payload) => {
        setIndicators(payload.data);
        setConnectionStatus('connected');
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setConnectionStatus('fallback');
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (summaryOnly) return;
    const access = officialIndicatorAccess[selectedId]?.[subscriptionPlan] ?? 'full';
    if (access !== 'full') {
      return;
    }
    const expectedHistorySize = selectedId === 'gdp-growth'
      ? 21
      : selectedId === 'banking-assets'
        ? 65
        : ['population', 'public-debt-gdp'].includes(selectedId)
          ? 2
          : 66;
    if (!['gdp-growth', 'inflation-rate', 'exchange-rate', 'population', 'banking-assets', 'public-debt-gdp'].includes(selectedId) || (historyIndicatorId === selectedId && inflationHistory.length === expectedHistorySize)) return;
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch: mark loading before the async call starts
    setHistoryStatus('loading');
    const loader = selectedId === 'inflation-rate'
      ? loadInflationHistory
      : selectedId === 'exchange-rate'
        ? loadExchangeHistory
        : selectedId === 'gdp-growth'
          ? loadGdpHistory
          : selectedId === 'population'
            ? loadPopulationHistory
            : selectedId === 'banking-assets'
              ? loadBankingAssetsHistory
              : loadPublicDebtHistory;
    loader(controller.signal)
      .then((payload) => {
        setInflationHistory(payload.data);
        setHistoryIndicatorId(selectedId);
        setHistoryStatus('loaded');
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setHistoryStatus('error');
      });
    return () => controller.abort();
  }, [selectedId, inflationHistory.length, historyIndicatorId, summaryOnly, subscriptionPlan]);

  return (
    <section>
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="mb-1 text-2xl tracking-tight">Official Indicators</h2>
          <p className="text-muted-foreground">Six source-backed indicators published through the governed LAZA data platform.</p>
        </div>
        <div className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${
          connectionStatus === 'connected'
            ? 'border-green-200 bg-green-50 text-green-800'
            : 'border-amber-200 bg-amber-50 text-amber-800'
        }`}>
          {connectionStatus === 'connected' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Info className="h-3.5 w-3.5" />}
          {connectionStatus === 'loading' && 'Loading validated indicators...'}
          {connectionStatus === 'connected' && `${officialCount} official / ${indicators.length - officialCount} demonstration`}
          {connectionStatus === 'fallback' && 'SQL unavailable / showing demonstration fallback'}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {indicators.map((metric) => {
          const metricAccess = officialIndicatorAccess[metric.id]?.[subscriptionPlan] ?? 'full';
          const TrendIcon = metric.trend === 'up'
            ? TrendingUp
            : metric.trend === 'down'
              ? TrendingDown
              : Minus;

          return (
            <button
              type="button"
              key={metric.id}
              onClick={() => {
                if (summaryOnly) onIndicatorSelect?.(metric.id);
                else setSelectedId(metric.id);
              }}
              disabled={summaryOnly && !onIndicatorSelect}
              aria-pressed={!summaryOnly && selectedId === metric.id}
              aria-label={summaryOnly ? `Open ${metric.label} details` : undefined}
              className={`group rounded-xl border bg-card p-5 text-left transition-all hover:border-primary/40 hover:shadow-lg ${summaryOnly && !onIndicatorSelect ? 'cursor-default' : 'cursor-pointer'} ${
                !summaryOnly && selectedId === metric.id ? 'border-primary ring-2 ring-primary/10' : 'border-border'
              }`}
            >
              <div className="mb-4 flex items-start justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  <div className="whitespace-nowrap rounded-lg bg-muted px-2 py-1 text-xs text-muted-foreground">
                    {metric.period}
                  </div>
                {metric.isOfficial && (
                  <div className="rounded-lg bg-green-50 px-2 py-1 text-xs text-green-700">Official</div>
                )}
                <div className={`rounded-lg px-2 py-1 text-xs ${
                  metricAccess === 'full'
                    ? 'bg-blue-50 text-blue-700'
                    : metricAccess === 'preview'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-slate-100 text-slate-600'
                }`}>
                  {accessLabel(metricAccess)}
                </div>
              </div>
                {metric.change && <div className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs ${
                  metric.trend === 'up' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'
                }`}>
                  <TrendIcon className="h-3 w-3" />
                  <span>{metric.change}</span>
                </div>}
              </div>
              <div className="space-y-1">
                <p className="text-2xl tracking-tight transition-colors group-hover:text-primary">{metric.value}</p>
                <p className="text-xs text-muted-foreground">{metric.label}</p>
              </div>
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3 text-[11px] text-muted-foreground">
                <span className="truncate" title={metric.sourceName}>{metric.sourceName}</span>
                <span className="shrink-0">{metric.qualityScore != null ? `Q ${metric.qualityScore.toFixed(1)}` : metric.qualityStatus}</span>
              </div>
            </button>
          );
        })}
      </div>

      {!summaryOnly && <div className="mt-5 rounded-xl border border-border bg-muted/40 p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h3 className="text-lg">{selected.label}</h3>
              <span className="rounded-full border border-border bg-white px-2.5 py-1 text-xs text-muted-foreground">
                {selected.domain}
              </span>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">{selected.definition}</p>
          </div>

          <a
            href={selected.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            {selected.sourceName}
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-4 md:grid-cols-4">
          <div>
            <dt className="text-xs text-muted-foreground">Period</dt>
            <dd className="mt-1 text-sm">{selected.period}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Frequency</dt>
            <dd className="mt-1 text-sm">{selected.frequency}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Unit</dt>
            <dd className="mt-1 text-sm">{selected.unit}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Quality status</dt>
            <dd className={`mt-1 text-sm ${selected.isOfficial ? 'text-green-700' : 'text-amber-700'}`}>
              {selected.qualityStatus}
              {selected.qualityScore != null && ` / score ${selected.qualityScore.toFixed(2)}`}
            </dd>
          </div>
        </dl>

        {['gdp-growth', 'inflation-rate', 'exchange-rate', 'population', 'banking-assets', 'public-debt-gdp'].includes(selected.id) && selected.isOfficial && (
          <div className="mt-6 border-t border-border pt-5">
            {selectedNeedsUpgrade && (
              <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
                <div className="flex items-start gap-3">
                  <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-medium">{selected.label} full history is not included in the {planLabel(subscriptionPlan)} plan.</p>
                    <p className="mt-1 text-amber-800">This plan shows the latest published value and source evidence. Upgrade to {minimumPlanForFullAccess(officialIndicatorAccess[selected.id])} to access the full historical table, chart and downloadable analytical depth.</p>
                  </div>
                </div>
              </div>
            )}
            {historyStatus === 'loading' && (
                <div className="mt-4 rounded-lg bg-white p-4 text-sm text-muted-foreground">Loading official history...</div>
            )}
            {historyStatus === 'error' && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Historical series is temporarily unavailable. The latest published value remains valid.
              </div>
            )}
            {historyStatus === 'loaded' && !selectedNeedsUpgrade && (
              <>
                <div className="rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
                  <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h4 className="mb-1 flex items-center gap-2 text-xl">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        {selected.id === 'inflation-rate' ? 'Inflation Overview' : selected.id === 'exchange-rate' ? 'Exchange Rate Overview' : selected.id === 'gdp-growth' ? 'GDP Growth Overview' : selected.id === 'population' ? 'Population Overview' : selected.id === 'banking-assets' ? 'Banking Assets Overview' : 'Public Debt Overview'}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {selected.id === 'inflation-rate' ? 'Monthly IPCN year-over-year trend' : selected.id === 'exchange-rate' ? 'Monthly average BNA USD/AOA reference rate' : selected.id === 'gdp-growth' ? 'Quarterly real GDP year-over-year growth' : selected.id === 'population' ? 'Resident population counted at official census moments' : selected.id === 'banking-assets' ? 'Month-end total assets of other depository corporations' : 'Public debt as a share of nominal GDP'}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">{selected.id === 'gdp-growth' ? '21 official observations / Q1 2021-Q1 2026' : selected.id === 'population' ? '2 official censuses / 2014 and 2024' : selected.id === 'banking-assets' ? '65 official observations / Jan 2021-May 2026' : selected.id === 'public-debt-gdp' ? '2 official periods / 2025 and Q1 2026' : '66 official observations / Jan 2021-Jun 2026'}</div>
                  </div>

                  <Suspense fallback={<div className="flex h-80 items-center justify-center text-sm text-muted-foreground" role="status">Loading chart...</div>}><IndicatorHistoryChart indicatorId={selected.id} history={inflationHistory} /></Suspense>
                </div>

                <div className="mt-5 overflow-hidden rounded-lg border border-border bg-white">
                  <div className="border-b border-border px-4 py-3">
                    <h5 className="text-sm">All official observations</h5>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {selected.id === 'inflation-rate'
                        ? 'Exact published values and quality evidence. The 2021 records retain accepted exceptions.'
                        : 'Exact published values and quality evidence from the official source.'}
                    </p>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
                        <tr>
                          <th className="px-4 py-2.5 font-medium">Period</th>
                          <th className="px-4 py-2.5 text-right font-medium">{selected.id === 'inflation-rate' ? 'Inflation YoY' : selected.id === 'exchange-rate' ? 'Monthly average' : selected.id === 'gdp-growth' ? 'GDP YoY' : selected.id === 'population' ? 'Resident population' : selected.id === 'banking-assets' ? 'Total assets' : 'Public debt/GDP'}</th>
                          <th className="hidden px-4 py-2.5 text-right font-medium sm:table-cell">Quality score</th>
                          <th className="px-4 py-2.5 font-medium">Evidence</th>
                          <th className="hidden px-4 py-2.5 font-medium md:table-cell">Source</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {inflationHistory.map((point) => (
                          <tr key={point.period} className="hover:bg-muted/40">
                            <td className="px-4 py-2.5 font-mono text-xs">{point.period}</td>
                            <td className="px-4 py-2.5 text-right font-medium">{point.displayValue}</td>
                            <td className="hidden px-4 py-2.5 text-right text-muted-foreground sm:table-cell">
                              {point.qualityScore.toFixed(2)}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={`rounded-full px-2 py-1 text-xs ${
                                point.hasAcceptedException
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-green-50 text-green-700'
                              }`}>
                                {point.hasAcceptedException ? 'Accepted exception' : point.hasSourceWarning ? 'Documented warning' : 'Validated'}
                              </span>
                            </td>
                            <td className="hidden px-4 py-2.5 md:table-cell">
                              <a
                                href={selected.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                title={`Open official source: ${selected.sourceName}`}
                              >
                                {selected.sourceName}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>}
    </section>
  );
}
