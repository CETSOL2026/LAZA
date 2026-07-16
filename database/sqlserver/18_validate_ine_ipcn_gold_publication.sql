/* Read-only validation of official IPCN Gold publication. */
USE [LAZA_DATA_PLATFORM_DEV];
GO
SET NOCOUNT ON;

DECLARE @series_id int =
(
    SELECT series_id FROM [silver].[indicator_series]
    WHERE series_code = N'INFLATION_RATE_AGO_INE_IPCN_YOY'
);

SELECT
    COUNT(*) AS silver_rows,
    COUNT(DISTINCT reference_period_start) AS unique_months,
    MIN(reference_period_start) AS first_month,
    MAX(reference_period_start) AS last_month,
    SUM(CASE WHEN quality_status = 'PASSED' THEN 1 ELSE 0 END) AS passed_rows,
    SUM(CASE WHEN publication_status = 'PUBLISHED' AND is_official = 1 THEN 1 ELSE 0 END) AS official_published_rows
FROM [silver].[observation]
WHERE series_id = @series_id AND is_current = 1;

SELECT
    COUNT(*) AS official_approvals,
    COUNT(DISTINCT a.observation_id) AS uniquely_approved_observations
FROM [dq].[approval] AS a
INNER JOIN [silver].[observation] AS o ON o.observation_id = a.observation_id
WHERE o.series_id = @series_id
  AND a.decision = 'APPROVE'
  AND a.decision_scope = 'OFFICIAL';

SELECT
    COUNT(*) AS gold_rows,
    COUNT(DISTINCT f.silver_observation_id) AS unique_silver_observations,
    COUNT(DISTINCT f.period_start_date_key) AS unique_months,
    MIN(ds.full_date) AS first_month,
    MAX(ds.full_date) AS last_month,
    SUM(CASE WHEN f.quality_status = 'PASSED' THEN 1 ELSE 0 END) AS passed_rows,
    SUM(CASE WHEN f.publication_status = 'PUBLISHED' AND f.is_official = 1 THEN 1 ELSE 0 END) AS official_published_rows,
    MIN(f.quality_score) AS minimum_quality_score,
    MAX(f.quality_score) AS maximum_quality_score
FROM [gold].[fact_indicator_observation] AS f
INNER JOIN [gold].[dim_series] AS s ON s.series_key = f.series_key
INNER JOIN [gold].[dim_date] AS ds ON ds.date_key = f.period_start_date_key
WHERE s.silver_series_id = @series_id;

SELECT
    COUNT(*) AS broken_source_evidence_rows
FROM [gold].[fact_indicator_observation] AS f
INNER JOIN [gold].[dim_series] AS s ON s.series_key = f.series_key
LEFT JOIN [bronze].[source_asset] AS a ON a.source_asset_id = f.source_asset_id
WHERE s.silver_series_id = @series_id
  AND
  (
      a.source_asset_id IS NULL OR a.is_official <> 1 OR
      a.publication_date IS NULL OR a.content_hash IS NULL OR a.source_version IS NULL
  );

SELECT
    indicator_code,
    series_code,
    source_name,
    reference_period_label,
    numeric_value,
    display_value,
    quality_status,
    quality_score,
    publication_status,
    is_official
FROM [api].[vw_indicator_latest]
WHERE indicator_code = N'inflation-rate';

SELECT
    SUM(CASE WHEN publication_status = 'DEMONSTRATION' AND is_official = 0 THEN 1 ELSE 0 END) AS demo_gold_rows,
    SUM(CASE WHEN publication_status = 'PUBLISHED' AND is_official = 1 THEN 1 ELSE 0 END) AS official_gold_rows,
    COUNT(*) AS total_gold_rows
FROM [gold].[fact_indicator_observation];
GO
