/*
LAZA SQL Server POC - post-deployment validation
This script performs SELECT statements only.
*/
USE [LAZA_DATA_PLATFORM_DEV];
GO
SET NOCOUNT ON;
GO

-- 1. Expected schemas and object counts.
SELECT
    s.name AS schema_name,
    COUNT(o.object_id) AS object_count
FROM sys.schemas AS s
LEFT JOIN sys.objects AS o
    ON o.schema_id = s.schema_id
    AND o.is_ms_shipped = 0
WHERE s.name IN (N'control', N'audit', N'reference', N'bronze', N'silver', N'dq', N'gold', N'api')
GROUP BY s.name
ORDER BY s.name;

-- 2. Layer counts expected after the controlled demo seed.
SELECT N'control.ingestion_batch' AS object_name, COUNT_BIG(*) AS row_count FROM [control].[ingestion_batch]
UNION ALL SELECT N'bronze.source_asset', COUNT_BIG(*) FROM [bronze].[source_asset]
UNION ALL SELECT N'bronze.raw_indicator_observation', COUNT_BIG(*) FROM [bronze].[raw_indicator_observation]
UNION ALL SELECT N'silver.indicator', COUNT_BIG(*) FROM [silver].[indicator]
UNION ALL SELECT N'silver.indicator_series', COUNT_BIG(*) FROM [silver].[indicator_series]
UNION ALL SELECT N'silver.observation', COUNT_BIG(*) FROM [silver].[observation]
UNION ALL SELECT N'dq.result', COUNT_BIG(*) FROM [dq].[result]
UNION ALL SELECT N'dq.approval', COUNT_BIG(*) FROM [dq].[approval]
UNION ALL SELECT N'gold.fact_indicator_observation', COUNT_BIG(*) FROM [gold].[fact_indicator_observation]
UNION ALL SELECT N'api.vw_indicator_latest', COUNT_BIG(*) FROM [api].[vw_indicator_latest];

-- 3. End-to-end lineage for each Gold record.
SELECT
    i.indicator_code,
    b.batch_code,
    a.asset_name,
    CONVERT(varchar(64), a.content_hash, 2) AS asset_sha256,
    r.source_record_key,
    o.observation_id,
    f.fact_observation_id,
    f.publication_status,
    f.is_official
FROM [gold].[fact_indicator_observation] AS f
INNER JOIN [gold].[dim_indicator] AS i ON i.indicator_key = f.indicator_key
INNER JOIN [silver].[observation] AS o ON o.observation_id = f.silver_observation_id
INNER JOIN [bronze].[raw_indicator_observation] AS r ON r.raw_observation_id = o.raw_observation_id
INNER JOIN [bronze].[source_asset] AS a ON a.source_asset_id = o.source_asset_id
INNER JOIN [control].[ingestion_batch] AS b ON b.ingestion_batch_id = o.ingestion_batch_id
ORDER BY i.indicator_code;

-- 4. DQ summary by rule and result.
SELECT
    dq_rule.rule_code,
    result.result_status,
    COUNT_BIG(*) AS result_count
FROM [dq].[result] AS result
INNER JOIN [dq].[rule_version] AS version ON version.rule_version_id = result.rule_version_id
INNER JOIN [dq].[rule] AS dq_rule ON dq_rule.rule_id = version.rule_id
GROUP BY dq_rule.rule_code, result.result_status
ORDER BY dq_rule.rule_code, result.result_status;

-- 5. Guardrail: this must return zero rows.
SELECT N'OFFICIAL_WITHOUT_PUBLISHED_STATUS' AS violation, o.observation_id
FROM [silver].[observation] AS o
WHERE o.is_official = 1 AND o.publication_status NOT IN ('APPROVED','PUBLISHED')
UNION ALL
SELECT N'DEMO_MARKED_OFFICIAL', f.fact_observation_id
FROM [gold].[fact_indicator_observation] AS f
WHERE f.publication_status = 'DEMONSTRATION' AND f.is_official = 1
UNION ALL
SELECT N'PUBLISHED_WITHOUT_OFFICIAL_FLAG', f.fact_observation_id
FROM [gold].[fact_indicator_observation] AS f
WHERE f.publication_status = 'PUBLISHED' AND f.is_official = 0
UNION ALL
SELECT N'GOLD_WITHOUT_APPROVAL', f.fact_observation_id
FROM [gold].[fact_indicator_observation] AS f
WHERE NOT EXISTS
(
    SELECT 1
    FROM [dq].[approval] AS a
    WHERE a.observation_id = f.silver_observation_id
      AND a.decision = 'APPROVE'
);

-- 6. API contract preview. After the seed this should return six DEMO rows.
SELECT
    indicator_code,
    indicator_name,
    numeric_value,
    display_value,
    unit_name,
    reference_period_label,
    source_name,
    quality_status,
    quality_score,
    publication_status,
    is_official
FROM [api].[vw_indicator_latest]
ORDER BY indicator_code;
GO
