import { runJsonQuery } from '../lib/sqlClient.mjs';

const cacheTtlMs = 30_000;

const oilGasAnalyticsQuery = `
SET NOCOUNT ON;
SELECT period,
       period_start AS periodStart,
       publication_date AS publicationDate,
       source_url AS sourceUrl,
       oil_total_barrels AS oilTotalBarrels,
       oil_actual_bopd AS oilActualBopd,
       oil_forecast_bopd AS oilForecastBopd,
       oil_variance_pct AS oilVariancePct,
       oil_monthly_change_pct AS oilMonthlyChangePct,
       gas_total_mmcf AS gasTotalMmcf,
       gas_actual_mmscfd AS gasActualMmscfd,
       gas_reinjected_mmscfd AS gasReinjectedMmscfd,
       gas_to_alng_mmscfd AS gasToAlngMmscfd,
       gas_to_power_mmscfd AS gasToPowerMmscfd,
       gas_other_mmscfd AS gasOtherMmscfd,
       alng_actual_boe AS alngActualBoe,
       alng_forecast_boe AS alngForecastBoe,
       alng_actual_boepd AS alngActualBoepd,
       alng_lng_boepd AS alngLngBoepd,
       alng_propane_boepd AS alngPropaneBoepd,
       alng_butane_boepd AS alngButaneBoepd,
       alng_condensate_boepd AS alngCondensateBoepd,
       quality_score AS qualityScore,
       CONVERT(bit, has_accepted_exception) AS hasAcceptedException
FROM api.vw_anpg_oil_gas_monthly
ORDER BY period_start
FOR JSON PATH;
`;

const fiscalExecutionQuery = `
SET NOCOUNT ON;
SELECT period,
       period_start AS periodStart,
       publication_date AS publicationDate,
       source_url AS sourceUrl,
       annual_budget AS annualBudget,
       total_revenue AS totalRevenue,
       current_revenue AS currentRevenue,
       capital_revenue AS capitalRevenue,
       tax_revenue AS taxRevenue,
       patrimonial_revenue AS patrimonialRevenue,
       petroleum_revenue AS petroleumRevenue,
       total_expenditure AS totalExpenditure,
       current_expenditure AS currentExpenditure,
       capital_expenditure AS capitalExpenditure,
       personnel_expenditure AS personnelExpenditure,
       interest_expenditure AS interestExpenditure,
       investment_expenditure AS investmentExpenditure,
       budget_balance AS budgetBalance,
       revenue_execution_pct AS revenueExecutionPct,
       expenditure_execution_pct AS expenditureExecutionPct,
       quality_score AS qualityScore,
       CONVERT(bit, has_accepted_exception) AS hasAcceptedException
FROM api.vw_minfin_fiscal_execution_quarterly
ORDER BY period_start
FOR JSON PATH;
`;

const sovereignYieldCurveQuery = `
SET NOCOUNT ON;
SELECT reference_date AS referenceDate,
       source_url AS sourceUrl,
       quality_score AS qualityScore,
       yield_3m AS yield3m,
       yield_6m AS yield6m,
       yield_1y AS yield1y,
       yield_2y AS yield2y,
       yield_3y AS yield3y,
       yield_4y AS yield4y,
       yield_5y AS yield5y,
       yield_6y AS yield6y,
       yield_7y AS yield7y,
       yield_8y AS yield8y,
       yield_9y AS yield9y,
       yield_10y AS yield10y,
       spread_5y_1y_bps AS spread5y1yBps,
       spread_10y_2y_bps AS spread10y2yBps
FROM api.vw_bodiva_sovereign_yield_curve
ORDER BY reference_date
FOR JSON PATH;
`;

const oilNonOilGdpQuery = `
SET NOCOUNT ON;
SELECT period,
       period_start AS periodStart,
       source_url AS sourceUrl,
       oil_nominal_million_aoa AS oilNominalMillionAoa,
       non_oil_nominal_million_aoa AS nonOilNominalMillionAoa,
       oil_share_pct AS oilSharePct,
       non_oil_share_pct AS nonOilSharePct,
       oil_yoy_pct AS oilYoyPct,
       non_oil_yoy_pct AS nonOilYoyPct,
       total_yoy_pct AS totalYoyPct,
       oil_contribution_pp AS oilContributionPp,
       non_oil_contribution_pp AS nonOilContributionPp,
       total_contribution_pp AS totalContributionPp,
       quality_score AS qualityScore,
       CONVERT(bit, has_accepted_exception) AS hasAcceptedException
FROM api.vw_ine_oil_non_oil_gdp_quarterly
ORDER BY period_start
FOR JSON PATH;
`;

let oilGasAnalyticsCache = null;
let oilGasAnalyticsCachedAt = 0;
let fiscalExecutionCache = null;
let fiscalExecutionCachedAt = 0;
let sovereignYieldCurveCache = null;
let sovereignYieldCurveCachedAt = 0;
let oilNonOilGdpCache = null;
let oilNonOilGdpCachedAt = 0;

export async function readOilGasAnalytics() {
  if (oilGasAnalyticsCache && Date.now() - oilGasAnalyticsCachedAt < cacheTtlMs) return oilGasAnalyticsCache;
  const history = await runJsonQuery(oilGasAnalyticsQuery);
  if (!Array.isArray(history) || history.length !== 18) {
    throw new Error(`Expected 18 published ANPG months, received ${history?.length ?? 0}.`);
  }
  oilGasAnalyticsCache = history;
  oilGasAnalyticsCachedAt = Date.now();
  return history;
}

export async function readFiscalExecution() {
  if (fiscalExecutionCache && Date.now() - fiscalExecutionCachedAt < cacheTtlMs) return fiscalExecutionCache;
  const history = await runJsonQuery(fiscalExecutionQuery);
  if (!Array.isArray(history) || history.length !== 5) {
    throw new Error(`Expected five published MINFIN quarters, received ${history?.length ?? 0}.`);
  }
  fiscalExecutionCache = history;
  fiscalExecutionCachedAt = Date.now();
  return history;
}

export async function readSovereignYieldCurve() {
  if (sovereignYieldCurveCache && Date.now() - sovereignYieldCurveCachedAt < cacheTtlMs) return sovereignYieldCurveCache;
  const snapshots = await runJsonQuery(sovereignYieldCurveQuery);
  if (!Array.isArray(snapshots) || snapshots.length !== 4) {
    throw new Error(`Expected four published BODIVA curve snapshots, received ${snapshots?.length ?? 0}.`);
  }
  sovereignYieldCurveCache = snapshots;
  sovereignYieldCurveCachedAt = Date.now();
  return snapshots;
}

export async function readOilNonOilGdp() {
  if (oilNonOilGdpCache && Date.now() - oilNonOilGdpCachedAt < cacheTtlMs) return oilNonOilGdpCache;
  const quarters = await runJsonQuery(oilNonOilGdpQuery);
  if (!Array.isArray(quarters) || quarters.length !== 21) {
    throw new Error(`Expected 21 published INE oil/non-oil GDP quarters, received ${quarters?.length ?? 0}.`);
  }
  oilNonOilGdpCache = quarters;
  oilNonOilGdpCachedAt = Date.now();
  return quarters;
}
