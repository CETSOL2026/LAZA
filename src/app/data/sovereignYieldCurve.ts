export const sovereignTenors = [
  ['3M', 'yield3m'], ['6M', 'yield6m'], ['1Y', 'yield1y'], ['2Y', 'yield2y'],
  ['3Y', 'yield3y'], ['4Y', 'yield4y'], ['5Y', 'yield5y'], ['6Y', 'yield6y'],
  ['7Y', 'yield7y'], ['8Y', 'yield8y'], ['9Y', 'yield9y'], ['10Y', 'yield10y'],
] as const;

export type SovereignYieldKey = typeof sovereignTenors[number][1];

export interface SovereignYieldSnapshot extends Record<SovereignYieldKey, number> {
  referenceDate: string;
  sourceUrl: string;
  qualityScore: number;
  spread5y1yBps: number;
  spread10y2yBps: number;
}

export interface SovereignYieldCurveResponse {
  data: SovereignYieldSnapshot[];
  meta: {
    source: string;
    sourceName: string;
    sourceArchiveUrl: string;
    generatedAt: string;
    observationCount: number;
    snapshotCount: number;
    firstPeriod: string;
    lastPeriod: string;
    interpolationApplied: boolean;
  };
}

export async function loadSovereignYieldCurve(signal?: AbortSignal): Promise<SovereignYieldCurveResponse> {
  const response = await fetch('/api/analytics/sovereign-yield-curve', { signal });
  if (!response.ok) throw new Error(`Sovereign yield curve API returned HTTP ${response.status}.`);
  const payload = await response.json() as SovereignYieldCurveResponse;
  if (!Array.isArray(payload.data) || payload.data.length !== 4 || payload.meta.observationCount !== 48) {
    throw new Error('Sovereign yield curve API did not return four complete 12-tenor snapshots.');
  }
  return payload;
}
