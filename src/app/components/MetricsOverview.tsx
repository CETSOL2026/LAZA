import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ExternalLink, Info, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  IndicatorHistoryPoint,
  loadExchangeHistory,
  loadGdpHistory,
  loadInflationHistory,
  loadLatestIndicators,
  pilotIndicators,
} from '../data/indicators';

function InflationTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as IndicatorHistoryPoint;
  return (
    <div className="rounded-lg border border-border bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-medium">{point.period}</p>
      <p className="mt-1 text-primary">{point.displayValue}</p>
      <p className="mt-1 text-muted-foreground">Quality score {point.qualityScore.toFixed(2)}</p>
      {point.hasAcceptedException && <p className="mt-1 text-amber-700">Accepted reconciliation exception</p>}
      {point.hasSourceWarning && <p className="mt-1 text-amber-700">Exact source duplicate deduplicated</p>}
    </div>
  );
}

export function MetricsOverview() {
  const [indicators, setIndicators] = useState(pilotIndicators);
  const [selectedId, setSelectedId] = useState(pilotIndicators[0].id);
  const [connectionStatus, setConnectionStatus] = useState<'loading' | 'connected' | 'fallback'>('loading');
  const [inflationHistory, setInflationHistory] = useState<IndicatorHistoryPoint[]>([]);
  const [historyStatus, setHistoryStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [historyIndicatorId, setHistoryIndicatorId] = useState('');
  const selected = indicators.find((indicator) => indicator.id === selectedId) ?? indicators[0];
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
    const expectedHistorySize = selectedId === 'gdp-growth' ? 21 : 66;
    if (!['gdp-growth', 'inflation-rate', 'exchange-rate'].includes(selectedId) || (historyIndicatorId === selectedId && inflationHistory.length === expectedHistorySize)) return;
    const controller = new AbortController();
    setHistoryStatus('loading');
    const loader = selectedId === 'inflation-rate'
      ? loadInflationHistory
      : selectedId === 'exchange-rate'
        ? loadExchangeHistory
        : loadGdpHistory;
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
  }, [selectedId, inflationHistory.length, historyIndicatorId]);

  return (
    <section>
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="mb-1 text-2xl tracking-tight">Pilot Indicators</h2>
          <p className="text-muted-foreground">Six indicators prepared for the first staged data integration test.</p>
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
          const TrendIcon = metric.trend === 'up'
            ? TrendingUp
            : metric.trend === 'down'
              ? TrendingDown
              : Minus;

          return (
            <button
              type="button"
              key={metric.id}
              onClick={() => setSelectedId(metric.id)}
              aria-pressed={selectedId === metric.id}
              className={`group cursor-pointer rounded-xl border bg-card p-5 text-left transition-all hover:border-primary/40 hover:shadow-lg ${
                selectedId === metric.id ? 'border-primary ring-2 ring-primary/10' : 'border-border'
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
            </button>
          );
        })}
      </div>

      <div className="mt-5 rounded-xl border border-border bg-muted/40 p-5">
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

        {['gdp-growth', 'inflation-rate', 'exchange-rate'].includes(selected.id) && selected.isOfficial && (
          <div className="mt-6 border-t border-border pt-5">
            {historyStatus === 'loading' && (
                <div className="mt-4 rounded-lg bg-white p-4 text-sm text-muted-foreground">Loading official history...</div>
            )}
            {historyStatus === 'error' && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Historical series is temporarily unavailable. The latest published value remains valid.
              </div>
            )}
            {historyStatus === 'loaded' && (
              <>
                <div className="rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
                  <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h4 className="mb-1 flex items-center gap-2 text-xl">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        {selected.id === 'inflation-rate' ? 'Inflation Overview' : selected.id === 'exchange-rate' ? 'Exchange Rate Overview' : 'GDP Growth Overview'}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {selected.id === 'inflation-rate' ? 'Monthly IPCN year-over-year trend' : selected.id === 'exchange-rate' ? 'Monthly average BNA USD/AOA reference rate' : 'Quarterly real GDP year-over-year growth'}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">{selected.id === 'gdp-growth' ? '21 official observations / Q1 2021-Q1 2026' : '66 official observations / Jan 2021-Jun 2026'}</div>
                  </div>

                  <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={inflationHistory} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                      <defs>
                        <linearGradient id="inflationGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#bf1f27" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#bf1f27" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="period"
                        interval={11}
                        stroke="#6b7280"
                        style={{ fontSize: '12px' }}
                      />
                      <YAxis
                        domain={['dataMin - 2', 'dataMax + 2']}
                        tickFormatter={(value) => selected.id === 'exchange-rate' ? `${value}` : `${value}%`}
                        stroke="#6b7280"
                        style={{ fontSize: '12px' }}
                        width={48}
                      />
                      <Tooltip content={<InflationTooltip />} />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
                      <Area
                        type="monotone"
                        dataKey="numericValue"
                        name={selected.id === 'inflation-rate' ? 'Inflation YoY (%)' : selected.id === 'exchange-rate' ? 'Exchange rate (AOA/USD)' : 'Real GDP YoY (%)'}
                        stroke="#bf1f27"
                        strokeWidth={2}
                        fill="url(#inflationGradient)"
                        fillOpacity={1}
                        activeDot={{ r: 4, fill: '#bf1f27', stroke: '#ffffff', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-5 overflow-hidden rounded-lg border border-border bg-white">
                  <div className="border-b border-border px-4 py-3">
                    <h5 className="text-sm">All monthly observations</h5>
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
                          <th className="px-4 py-2.5 text-right font-medium">{selected.id === 'inflation-rate' ? 'Inflation YoY' : selected.id === 'exchange-rate' ? 'Monthly average' : 'GDP YoY'}</th>
                          <th className="hidden px-4 py-2.5 text-right font-medium sm:table-cell">Quality score</th>
                          <th className="px-4 py-2.5 font-medium">Evidence</th>
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
                                {point.hasAcceptedException ? 'Accepted exception' : point.hasSourceWarning ? 'Source duplicate handled' : 'Validated'}
                              </span>
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
      </div>
    </section>
  );
}
