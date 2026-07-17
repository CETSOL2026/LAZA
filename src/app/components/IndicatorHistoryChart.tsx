import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { IndicatorHistoryPoint } from '../data/indicators';

function HistoryTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: IndicatorHistoryPoint }> }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return <div className="rounded-lg border border-border bg-white px-3 py-2 text-xs shadow-lg"><p className="font-medium">{point.period}</p><p className="mt-1 text-primary">{point.displayValue}</p><p className="mt-1 text-muted-foreground">Quality score {point.qualityScore.toFixed(2)}</p>{point.hasAcceptedException && <p className="mt-1 text-amber-700">Accepted reconciliation exception</p>}{point.hasSourceWarning && <p className="mt-1 text-amber-700">{point.sourceWarningMessage ?? 'Source warning documented'}</p>}</div>;
}

export function IndicatorHistoryChart({ indicatorId, history }: { indicatorId: string; history: IndicatorHistoryPoint[] }) {
  const seriesName = indicatorId === 'inflation-rate' ? 'Inflation YoY (%)' : indicatorId === 'exchange-rate' ? 'Exchange rate (AOA/USD)' : indicatorId === 'gdp-growth' ? 'Real GDP YoY (%)' : indicatorId === 'population' ? 'Resident population (millions)' : indicatorId === 'banking-assets' ? 'Banking assets (Kz trillion)' : 'Public debt (% GDP)';
  return <ResponsiveContainer width="100%" height={320}>
    <AreaChart data={history} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
      <defs><linearGradient id={`indicator-gradient-${indicatorId}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#bf1f27" stopOpacity={0.8} /><stop offset="95%" stopColor="#bf1f27" stopOpacity={0} /></linearGradient></defs>
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
      <XAxis dataKey="period" interval={['population', 'public-debt-gdp'].includes(indicatorId) ? 0 : indicatorId === 'gdp-growth' ? 3 : 11} stroke="#6b7280" style={{ fontSize: '12px' }} />
      <YAxis domain={['dataMin - 2', 'dataMax + 2']} tickFormatter={(value) => indicatorId === 'exchange-rate' ? `${value}` : indicatorId === 'population' ? `${value}M` : indicatorId === 'banking-assets' ? `Kz ${value}tn` : `${value}%`} stroke="#6b7280" style={{ fontSize: '12px' }} width={48} />
      <Tooltip content={<HistoryTooltip />} />
      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
      <Area type="monotone" dataKey="numericValue" name={seriesName} stroke="#bf1f27" strokeWidth={2} fill={`url(#indicator-gradient-${indicatorId})`} fillOpacity={1} activeDot={{ r: 4, fill: '#bf1f27', stroke: '#ffffff', strokeWidth: 2 }} />
    </AreaChart>
  </ResponsiveContainer>;
}
