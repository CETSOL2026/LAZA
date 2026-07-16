/* Read-only validation of accepted IPCN 2021 DQ exceptions. */
USE [LAZA_DATA_PLATFORM_DEV];
GO
SET NOCOUNT ON;

DECLARE @series_id int =
(
    SELECT series_id FROM [silver].[indicator_series]
    WHERE series_code = N'INFLATION_RATE_AGO_INE_IPCN_YOY'
);
DECLARE @dq_execution_id bigint =
(
    SELECT MAX(e.dq_execution_id)
    FROM [dq].[execution] AS e
    INNER JOIN [control].[pipeline_run] AS pr ON pr.pipeline_run_id = e.pipeline_run_id
    INNER JOIN [control].[pipeline_definition] AS pd ON pd.pipeline_id = pr.pipeline_id
    WHERE pd.pipeline_code = N'INE_IPCN_BRONZE_TO_SILVER'
);

SELECT
    COUNT(*) AS series_observations,
    SUM(CASE WHEN quality_status = 'PASSED' THEN 1 ELSE 0 END) AS passed_observations,
    SUM(CASE WHEN quality_status = 'WARNING' THEN 1 ELSE 0 END) AS warning_observations,
    SUM(CASE WHEN publication_status = 'VALIDATED' AND is_official = 0 THEN 1 ELSE 0 END) AS awaiting_official_approval
FROM [silver].[observation]
WHERE series_id = @series_id AND is_current = 1;

SELECT
    ex.exception_status,
    COUNT(*) AS exception_count,
    MIN(o.reference_period_start) AS first_affected_month,
    MAX(o.reference_period_start) AS last_affected_month
FROM [dq].[exception] AS ex
INNER JOIN [dq].[result] AS dr ON dr.dq_result_id = ex.dq_result_id
INNER JOIN [silver].[observation] AS o ON o.observation_id = dr.observation_id
WHERE dr.dq_execution_id = @dq_execution_id
GROUP BY ex.exception_status;

SELECT
    dr.result_status AS original_dq_status,
    COUNT(*) AS result_count
FROM [dq].[result] AS dr
INNER JOIN [dq].[rule_version] AS rv ON rv.rule_version_id = dr.rule_version_id
INNER JOIN [dq].[rule] AS rul ON rul.rule_id = rv.rule_id
WHERE dr.dq_execution_id = @dq_execution_id
  AND rul.rule_code = N'IPCN_YOY_RECONCILIATION'
GROUP BY dr.result_status;

SELECT
    COUNT(*) AS official_approvals,
    (SELECT COUNT(*) FROM [gold].[fact_indicator_observation]
     WHERE publication_status = 'PUBLISHED' AND is_official = 1) AS official_gold_rows
FROM [dq].[approval] AS a
INNER JOIN [silver].[observation] AS o ON o.observation_id = a.observation_id
WHERE o.series_id = @series_id
  AND a.decision = 'APPROVE'
  AND a.decision_scope = 'OFFICIAL';
GO
