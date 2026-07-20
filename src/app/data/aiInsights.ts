import type { FiscalExecutionQuarter, FiscalExecutionResponse } from './fiscalExecution';
import type { PilotIndicator, IndicatorApiResponse } from './indicators';
import type { OilGasAnalyticsResponse, OilGasMonthlyPoint } from './oilGas';
import type { OilNonOilGdpQuarter, OilNonOilGdpResponse } from './oilNonOilGdp';
import type { SovereignYieldCurveResponse, SovereignYieldSnapshot } from './sovereignYieldCurve';
import type { SubscriptionPlan } from './subscriptionAccess';

export type InsightTone = 'emerald' | 'orange' | 'blue' | 'violet' | 'red';
export type InsightReviewStatus = 'rule-generated' | 'needs-review';

export interface AiInsightCard {
  id: string;
  title: string;
  summary: string;
  metric: string;
  period: string;
  sourceName: string;
  qualityScore: number | null;
  reviewStatus: InsightReviewStatus;
  generationMode: 'local-rule';
  ruleId: string;
  minimumPlan: SubscriptionPlan;
  tone: InsightTone;
  relatedTarget: { type: 'indicator' | 'advanced'; id: string };
}

interface InsightInputs {
  latestIndicators?: IndicatorApiResponse;
  oilNonOil?: OilNonOilGdpResponse;
  fiscal?: FiscalExecutionResponse;
  oilGas?: OilGasAnalyticsResponse;
  yieldCurve?: SovereignYieldCurveResponse;
}

function formatKz(value: number) {
  const absolute = Math.abs(value);
  const display = absolute >= 1_000_000 ? `${(absolute / 1_000_000).toFixed(2)}T Kz` : `${(absolute / 1_000).toFixed(1)}B Kz`;
  return value < 0 ? `-${display}` : display;
}

function latestIndicator(indicators: IndicatorApiResponse | undefined, id: string): PilotIndicator | undefined {
  return indicators?.data.find((item) => item.id === id);
}

function latest<T>(items: T[] | undefined): T | undefined {
  return items?.at(-1);
}

function prior<T>(items: T[] | undefined): T | undefined {
  return items && items.length > 1 ? items.at(-2) : undefined;
}

function quality(value: { qualityScore?: number | null } | undefined) {
  return value?.qualityScore ?? null;
}

function diversificationInsight(point: OilNonOilGdpQuarter | undefined): AiInsightCard | null {
  if (!point) return null;
  const driver = point.nonOilContributionPp >= point.oilContributionPp ? 'non-oil activity' : 'oil activity';
  return {
    id: 'ai-diversification-momentum',
    title: 'Growth driver shifted toward diversification',
    summary: `${driver} explains the largest share of ${point.totalYoyPct.toFixed(2)}% total GDP growth in ${point.period}, with non-oil GDP growing ${point.nonOilYoyPct.toFixed(2)}% year over year.`,
    metric: `${point.nonOilContributionPp.toFixed(2)} pp`,
    period: point.period,
    sourceName: 'INE Angola - National Accounts',
    qualityScore: quality(point),
    reviewStatus: 'rule-generated',
    generationMode: 'local-rule',
    ruleId: 'GDP_DIVERSIFICATION_CONTRIBUTION_V1',
    minimumPlan: 'professional',
    tone: 'emerald',
    relatedTarget: { type: 'advanced', id: 'advanced-gdp-diversification' },
  };
}

function inflationInsight(indicator: PilotIndicator | undefined): AiInsightCard | null {
  if (!indicator) return null;
  const trend = indicator.trend === 'down' ? 'eased' : indicator.trend === 'up' ? 'accelerated' : 'remained broadly stable';
  return {
    id: 'ai-inflation-direction',
    title: 'Inflation signal needs close monitoring',
    summary: `National IPCN inflation ${trend} to ${indicator.value} in ${indicator.period}. The latest official value should be read with the full monthly series and accepted source exceptions.`,
    metric: indicator.value,
    period: indicator.period,
    sourceName: indicator.sourceName,
    qualityScore: indicator.qualityScore ?? null,
    reviewStatus: 'rule-generated',
    generationMode: 'local-rule',
    ruleId: 'INFLATION_DIRECTION_V1',
    minimumPlan: 'free',
    tone: 'orange',
    relatedTarget: { type: 'indicator', id: 'inflation-rate' },
  };
}

function fiscalInsight(point: FiscalExecutionQuarter | undefined): AiInsightCard | null {
  if (!point) return null;
  return {
    id: 'ai-fiscal-balance',
    title: point.budgetBalance < 0 ? 'Fiscal balance remains in deficit' : 'Fiscal balance is positive',
    summary: `The latest budget balance was ${formatKz(point.budgetBalance)} in ${point.period}, while revenue execution reached ${point.revenueExecutionPct.toFixed(1)}% and expenditure execution reached ${point.expenditureExecutionPct.toFixed(1)}%.`,
    metric: formatKz(point.budgetBalance),
    period: point.period,
    sourceName: 'MINFIN - Budget Execution Reports',
    qualityScore: quality(point),
    reviewStatus: 'rule-generated',
    generationMode: 'local-rule',
    ruleId: 'FISCAL_BALANCE_EXECUTION_V1',
    minimumPlan: 'professional',
    tone: 'violet',
    relatedTarget: { type: 'advanced', id: 'advanced-fiscal-execution' },
  };
}

function oilGasInsight(current: OilGasMonthlyPoint | undefined, previous: OilGasMonthlyPoint | undefined): AiInsightCard | null {
  if (!current) return null;
  const forecastGap = current.oilVariancePct;
  const direction = forecastGap >= 0 ? 'above' : 'below';
  const monthlyChange = current.oilMonthlyChangePct ?? (previous ? ((current.oilActualBopd / previous.oilActualBopd) - 1) * 100 : null);
  return {
    id: 'ai-oil-production-forecast-gap',
    title: 'Oil output variance is visible against forecast',
    summary: `Crude production ran ${Math.abs(forecastGap).toFixed(2)}% ${direction} forecast in ${current.period}${monthlyChange == null ? '.' : `, with a month-over-month change of ${monthlyChange.toFixed(2)}%.`}`,
    metric: `${(current.oilActualBopd / 1_000_000).toFixed(2)}M BOPD`,
    period: current.period,
    sourceName: 'ANPG - Monthly Oil & Gas Publications',
    qualityScore: quality(current),
    reviewStatus: 'rule-generated',
    generationMode: 'local-rule',
    ruleId: 'OIL_FORECAST_VARIANCE_V1',
    minimumPlan: 'professional',
    tone: 'red',
    relatedTarget: { type: 'advanced', id: 'advanced-oil-gas' },
  };
}

function yieldCurveInsight(point: SovereignYieldSnapshot | undefined): AiInsightCard | null {
  if (!point) return null;
  return {
    id: 'ai-sovereign-curve-premium',
    title: 'Sovereign curve carries premium-tier signal',
    summary: `The latest observed 10-year Treasury yield was ${point.yield10y.toFixed(2)}%, with the 10Y-2Y spread at ${point.spread10y2yBps.toFixed(0)} bps. This signal is reserved for Enterprise review in the MVP.`,
    metric: `${point.yield10y.toFixed(2)}%`,
    period: point.referenceDate,
    sourceName: 'BODIVA - Market Bulletins',
    qualityScore: quality(point),
    reviewStatus: 'needs-review',
    generationMode: 'local-rule',
    ruleId: 'SOVEREIGN_CURVE_SPREAD_V1',
    minimumPlan: 'enterprise',
    tone: 'blue',
    relatedTarget: { type: 'advanced', id: 'advanced-sovereign-yield' },
  };
}

export function buildAiInsightCards(inputs: InsightInputs): AiInsightCard[] {
  return [
    diversificationInsight(latest(inputs.oilNonOil?.data)),
    inflationInsight(latestIndicator(inputs.latestIndicators, 'inflation-rate')),
    fiscalInsight(latest(inputs.fiscal?.data)),
    oilGasInsight(latest(inputs.oilGas?.data), prior(inputs.oilGas?.data)),
    yieldCurveInsight(latest(inputs.yieldCurve?.data)),
  ].filter((item): item is AiInsightCard => item !== null);
}
