export interface OilGasMonthlyPoint {
  period: string;
  periodStart: string;
  publicationDate: string;
  sourceUrl: string;
  oilTotalBarrels: number;
  oilActualBopd: number;
  oilForecastBopd: number;
  oilVariancePct: number;
  oilMonthlyChangePct?: number;
  gasTotalMmcf: number;
  gasActualMmscfd: number;
  gasReinjectedMmscfd: number;
  gasToAlngMmscfd: number;
  gasToPowerMmscfd: number;
  gasOtherMmscfd?: number;
  alngActualBoe?: number;
  alngForecastBoe?: number;
  alngActualBoepd?: number;
  alngLngBoepd?: number;
  alngPropaneBoepd?: number;
  alngButaneBoepd?: number;
  alngCondensateBoepd?: number;
  qualityScore: number;
  hasAcceptedException: boolean;
}

export interface OilGasAnalyticsResponse {
  data: OilGasMonthlyPoint[];
  meta: {
    source: string;
    sourceName: string;
    sourceArchiveUrl: string;
    generatedAt: string;
    observationCount: number;
    firstPeriod: string;
    lastPeriod: string;
    acceptedExceptionCount: number;
  };
}

export async function loadOilGasAnalytics(signal?: AbortSignal): Promise<OilGasAnalyticsResponse> {
  const response = await fetch('/api/analytics/oil-gas-production', { signal });
  if (!response.ok) throw new Error(`Oil and gas analytics API returned HTTP ${response.status}.`);
  const payload = await response.json() as OilGasAnalyticsResponse;
  if (!Array.isArray(payload.data) || payload.data.length !== 18) {
    throw new Error('Oil and gas analytics API did not return the expected 18 months.');
  }
  return payload;
}
