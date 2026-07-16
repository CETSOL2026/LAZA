export type IndicatorTrend = 'up' | 'down' | 'stable';
export type IndicatorStatus = 'demonstration' | 'validated' | 'published';

export interface PilotIndicator {
  id: string;
  label: string;
  value: string;
  numericValue: number;
  unit: string;
  period: string;
  comparisonLabel: string;
  change: string;
  trend: IndicatorTrend;
  favorableDirection: 'up' | 'down' | 'neutral';
  domain: string;
  definition: string;
  frequency: string;
  sourceName: string;
  sourceUrl: string;
  qualityStatus: string;
  status: IndicatorStatus;
  isOfficial?: boolean;
  qualityScore?: number | null;
}

export interface IndicatorApiResponse {
  data: PilotIndicator[];
  meta: {
    source: string;
    generatedAt: string;
    indicatorCount: number;
    officialIndicatorCount: number;
  };
}

export interface IndicatorHistoryPoint {
  period: string;
  periodStart: string;
  numericValue: number;
  displayValue: string;
  qualityStatus: string;
  qualityScore: number;
  isOfficial: boolean;
  hasAcceptedException: boolean;
}

export interface IndicatorHistoryResponse {
  data: IndicatorHistoryPoint[];
  meta: {
    source: string;
    seriesCode: string;
    generatedAt: string;
    observationCount: number;
    firstPeriod: string;
    lastPeriod: string;
    acceptedExceptionCount: number;
  };
}

// Stage 1 fixture data. Values are inherited from the original visual prototype
// and must not be treated as current official statistics until source validation.
export const pilotIndicators: PilotIndicator[] = [
  {
    id: 'gdp-growth',
    label: 'GDP Growth',
    value: '+3.2%',
    numericValue: 3.2,
    unit: '% year over year',
    period: '2024',
    comparisonLabel: 'vs previous year',
    change: '+0.8 pp',
    trend: 'up',
    favorableDirection: 'up',
    domain: 'Economic activity',
    definition: 'Annual percentage change in real gross domestic product.',
    frequency: 'Annual / quarterly',
    sourceName: 'INE Angola - National Accounts',
    sourceUrl: 'https://www.ine.gov.ao',
    qualityStatus: 'Pending official source validation',
    status: 'demonstration',
  },
  {
    id: 'inflation-rate',
    label: 'Inflation Rate',
    value: '13.8%',
    numericValue: 13.8,
    unit: '% year over year',
    period: '2024',
    comparisonLabel: 'vs previous period',
    change: '-2.1 pp',
    trend: 'down',
    favorableDirection: 'down',
    domain: 'Prices and inflation',
    definition: 'Year-over-year percentage change in the national consumer price index.',
    frequency: 'Monthly',
    sourceName: 'INE Angola - National CPI',
    sourceUrl: 'https://www.ine.gov.ao',
    qualityStatus: 'Pending official source validation',
    status: 'demonstration',
  },
  {
    id: 'exchange-rate',
    label: 'Exchange Rate',
    value: '825 AOA/USD',
    numericValue: 825,
    unit: 'AOA per USD',
    period: 'Q2 2024',
    comparisonLabel: 'Q2 vs Q1',
    change: '+1.5%',
    trend: 'up',
    favorableDirection: 'neutral',
    domain: 'Monetary and foreign exchange',
    definition: 'Reference exchange rate expressed as Angolan kwanza per US dollar.',
    frequency: 'Daily / monthly',
    sourceName: 'Banco Nacional de Angola',
    sourceUrl: 'https://www.bna.ao',
    qualityStatus: 'Pending official source validation',
    status: 'demonstration',
  },
  {
    id: 'population',
    label: 'Population',
    value: '35.6M',
    numericValue: 35.6,
    unit: 'million people',
    period: '2024',
    comparisonLabel: 'vs previous year',
    change: '+2.9%',
    trend: 'up',
    favorableDirection: 'neutral',
    domain: 'Population and society',
    definition: 'Estimated resident population for the reference year.',
    frequency: 'Annual',
    sourceName: 'INE Angola - Population Statistics',
    sourceUrl: 'https://www.ine.gov.ao',
    qualityStatus: 'Pending official source validation',
    status: 'demonstration',
  },
  {
    id: 'banking-assets',
    label: 'Banking Assets',
    value: '$48.2B',
    numericValue: 48.2,
    unit: 'USD billion',
    period: '2024',
    comparisonLabel: 'vs previous year',
    change: '+5.4%',
    trend: 'up',
    favorableDirection: 'neutral',
    domain: 'Banking and financial system',
    definition: 'Aggregate total assets reported by the banking sector.',
    frequency: 'Annual / quarterly',
    sourceName: 'BNA and official bank reports',
    sourceUrl: 'https://www.bna.ao',
    qualityStatus: 'Pending reconciliation across official reports',
    status: 'demonstration',
  },
  {
    id: 'public-debt-gdp',
    label: 'Public Debt/GDP',
    value: '68.4%',
    numericValue: 68.4,
    unit: '% of GDP',
    period: '2024',
    comparisonLabel: 'vs previous year',
    change: '-3.2 pp',
    trend: 'down',
    favorableDirection: 'down',
    domain: 'Public finance',
    definition: 'Gross public debt as a percentage of nominal gross domestic product.',
    frequency: 'Annual / quarterly',
    sourceName: 'Ministry of Finance and BNA',
    sourceUrl: 'https://www.minfin.gov.ao',
    qualityStatus: 'Pending methodology and source validation',
    status: 'demonstration',
  },
];

export function getIndicatorById(id: string) {
  return pilotIndicators.find((indicator) => indicator.id === id);
}

export async function loadLatestIndicators(signal?: AbortSignal): Promise<IndicatorApiResponse> {
  const response = await fetch('/api/indicators/latest', { signal });
  if (!response.ok) {
    throw new Error(`Indicator API returned HTTP ${response.status}.`);
  }

  const payload = await response.json() as IndicatorApiResponse;
  if (!Array.isArray(payload.data) || payload.data.length === 0) {
    throw new Error('Indicator API returned no data.');
  }

  const byId = new Map(payload.data.map((indicator) => [indicator.id, indicator]));
  payload.data = pilotIndicators.map((fixture) => byId.get(fixture.id) ?? fixture);
  return payload;
}

export async function loadInflationHistory(signal?: AbortSignal): Promise<IndicatorHistoryResponse> {
  const response = await fetch('/api/indicators/inflation-rate/history', { signal });
  if (!response.ok) {
    throw new Error(`Inflation history API returned HTTP ${response.status}.`);
  }

  const payload = await response.json() as IndicatorHistoryResponse;
  if (!Array.isArray(payload.data) || payload.data.length !== 66) {
    throw new Error('Inflation history API did not return the expected 66 months.');
  }
  return payload;
}
