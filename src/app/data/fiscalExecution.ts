export interface FiscalExecutionQuarter {
  period: string;
  periodStart: string;
  publicationDate: string;
  sourceUrl: string;
  annualBudget: number;
  totalRevenue: number;
  currentRevenue: number;
  capitalRevenue: number;
  taxRevenue: number;
  patrimonialRevenue: number;
  petroleumRevenue: number;
  totalExpenditure: number;
  currentExpenditure: number;
  capitalExpenditure: number;
  personnelExpenditure: number;
  interestExpenditure: number;
  investmentExpenditure: number;
  budgetBalance: number;
  revenueExecutionPct: number;
  expenditureExecutionPct: number;
  qualityScore: number;
  hasAcceptedException: boolean;
}

export interface FiscalExecutionResponse {
  data: FiscalExecutionQuarter[];
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

export async function loadFiscalExecution(signal?: AbortSignal): Promise<FiscalExecutionResponse> {
  const response = await fetch('/api/analytics/fiscal-execution', { signal });
  if (!response.ok) throw new Error(`Fiscal execution API returned HTTP ${response.status}.`);
  const payload = await response.json() as FiscalExecutionResponse;
  if (!Array.isArray(payload.data) || payload.data.length !== 5) {
    throw new Error('Fiscal execution API did not return the expected five quarters.');
  }
  return payload;
}
