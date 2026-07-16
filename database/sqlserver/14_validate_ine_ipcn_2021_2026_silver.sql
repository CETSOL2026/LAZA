/* Read-only validation of the 66-month IPCN Silver load. */
USE [LAZA_DATA_PLATFORM_DEV];
GO
SET NOCOUNT ON;

DECLARE @series_id int =
(
    SELECT series_id FROM [silver].[indicator_series]
    WHERE series_code = N'INFLATION_RATE_AGO_INE_IPCN_YOY'
);
DECLARE @batch_id bigint =
(
    SELECT ingestion_batch_id FROM [control].[ingestion_batch]
    WHERE batch_code = N'INE-IPCN-2026-06-20260716-V1'
);
DECLARE @dq_execution_id bigint =
(
    SELECT MAX(e.dq_execution_id)
    FROM [dq].[execution] AS e
    INNER JOIN [control].[pipeline_run] AS pr ON pr.pipeline_run_id = e.pipeline_run_id
    INNER JOIN [control].[pipeline_definition] AS pd ON pd.pipeline_id = pr.pipeline_id
    WHERE e.ingestion_batch_id = @batch_id
      AND pd.pipeline_code = N'INE_IPCN_BRONZE_TO_SILVER'
);

SELECT
    s.series_code,
    s.series_status,
    COUNT(*) AS silver_rows,
    COUNT(DISTINCT o.reference_period_start) AS unique_months,
    MIN(o.reference_period_start) AS first_month,
    MAX(o.reference_period_start) AS last_month,
    DATEDIFF(month, MIN(o.reference_period_start), MAX(o.reference_period_start)) + 1 AS expected_continuous_months,
    SUM(CASE WHEN o.quality_status = 'PASSED' THEN 1 ELSE 0 END) AS passed_observations,
    SUM(CASE WHEN o.quality_status = 'WARNING' THEN 1 ELSE 0 END) AS warning_observations,
    SUM(CASE WHEN o.publication_status = 'VALIDATED' AND o.is_official = 0 THEN 1 ELSE 0 END) AS awaiting_approval
FROM [silver].[indicator_series] AS s
INNER JOIN [silver].[observation] AS o ON o.series_id = s.series_id AND o.is_current = 1
WHERE s.series_id = @series_id
GROUP BY s.series_code, s.series_status;

SELECT
    r.rule_code,
    dr.result_status,
    COUNT(*) AS result_count
FROM [dq].[result] AS dr
INNER JOIN [dq].[rule_version] AS rv ON rv.rule_version_id = dr.rule_version_id
INNER JOIN [dq].[rule] AS r ON r.rule_id = rv.rule_id
WHERE dr.dq_execution_id = @dq_execution_id
GROUP BY r.rule_code, dr.result_status
ORDER BY r.rule_code, dr.result_status;

SELECT
    e.dq_execution_id,
    e.execution_status,
    COUNT(dr.dq_result_id) AS total_results,
    SUM(CASE WHEN dr.result_status = 'PASS' THEN 1 ELSE 0 END) AS pass_results,
    SUM(CASE WHEN dr.result_status = 'WARN' THEN 1 ELSE 0 END) AS warn_results,
    SUM(CASE WHEN dr.result_status = 'FAIL' THEN 1 ELSE 0 END) AS fail_results,
    COUNT(sc.indicator_score_id) AS score_rows,
    MIN(sc.quality_score) AS minimum_score,
    MAX(sc.quality_score) AS maximum_score
FROM [dq].[execution] AS e
LEFT JOIN [dq].[result] AS dr ON dr.dq_execution_id = e.dq_execution_id
LEFT JOIN [dq].[indicator_score] AS sc
    ON sc.dq_execution_id = e.dq_execution_id
    AND sc.observation_id = dr.observation_id
    AND dr.dq_result_id =
    (
        SELECT MIN(dr2.dq_result_id)
        FROM [dq].[result] AS dr2
        WHERE dr2.dq_execution_id = dr.dq_execution_id
          AND dr2.observation_id = dr.observation_id
    )
WHERE e.dq_execution_id = @dq_execution_id
GROUP BY e.dq_execution_id, e.execution_status;

SELECT
    o.reference_period_label,
    o.numeric_value AS reported_yoy,
    o.quality_status,
    o.publication_status,
    o.is_official,
    o.raw_observation_id
FROM [silver].[observation] AS o
WHERE o.series_id = @series_id
  AND o.reference_period_start IN ('2021-01-01', '2022-01-01', '2026-06-01')
ORDER BY o.reference_period_start;

SELECT
    SUM(CASE WHEN f.publication_status = 'DEMONSTRATION' AND f.is_official = 0 THEN 1 ELSE 0 END) AS demo_gold_rows,
    SUM(CASE WHEN f.publication_status = 'PUBLISHED' AND f.is_official = 1 THEN 1 ELSE 0 END) AS official_gold_rows,
    COUNT(*) AS total_gold_rows
FROM [gold].[fact_indicator_observation] AS f;
GO
