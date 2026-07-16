export interface OilNonOilGdpQuarter {
  period: string;
  periodStart: string;
  sourceUrl: string;
  oilNominalMillionAoa: number;
  nonOilNominalMillionAoa: number;
  oilSharePct: number;
  nonOilSharePct: number;
  oilYoyPct: number;
  nonOilYoyPct: number;
  totalYoyPct: number;
  oilContributionPp: number;
  nonOilContributionPp: number;
  totalContributionPp: number;
  qualityScore: number;
  hasAcceptedException: boolean;
}

export interface OilNonOilGdpResponse {
  data: OilNonOilGdpQuarter[];
  meta: {
    source: string;
    sourceName: string;
    generatedAt: string;
    observationCount: number;
    firstPeriod: string;
    lastPeriod: string;
    acceptedExceptionCount: number;
  };
}

export async function loadOilNonOilGdp(signal?: AbortSignal): Promise<OilNonOilGdpResponse> {
  const response = await fetch('/api/analytics/oil-non-oil-gdp', { signal });
  if (!response.ok) throw new Error(`Oil/non-oil GDP API returned HTTP ${response.status}.`);
  const payload = await response.json() as OilNonOilGdpResponse;
  if (!Array.isArray(payload.data) || payload.data.length !== 21) {
    throw new Error('Oil/non-oil GDP API did not return the expected 21 quarters.');
  }
  return payload;
}
