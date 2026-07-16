/*
LAZA SQL Server - read-only validation for the first official Bronze load
*/
USE [LAZA_DATA_PLATFORM_DEV];
GO
SET NOCOUNT ON;
GO

DECLARE @batch_id bigint =
(
    SELECT ingestion_batch_id
    FROM [control].[ingestion_batch]
    WHERE batch_code = N'INE-IPCN-2026-06-20260716-V1'
);

SELECT
    batch.ingestion_batch_id,
    batch.batch_code,
    batch.data_classification,
    batch.batch_status,
    batch.source_record_count,
    batch.accepted_record_count,
    batch.rejected_record_count,
    run.run_status,
    run.rows_read,
    run.rows_written,
    run.rows_rejected
FROM [control].[ingestion_batch] AS batch
INNER JOIN [control].[pipeline_run] AS run
    ON run.pipeline_run_id = batch.pipeline_run_id
WHERE batch.ingestion_batch_id = @batch_id;

SELECT
    asset.source_asset_id,
    asset.asset_type,
    asset.asset_name,
    asset.asset_location,
    asset.source_version,
    asset.publication_date,
    asset.content_size_bytes,
    CONVERT(varchar(64), asset.content_hash, 2) AS sha256,
    asset.is_official,
    ISJSON(asset.metadata_json) AS metadata_is_json
FROM [bronze].[source_asset] AS asset
WHERE asset.ingestion_batch_id = @batch_id
ORDER BY asset.source_asset_id;

SELECT
    raw.source_record_key,
    raw.indicator_code_raw,
    raw.value_raw,
    raw.unit_raw,
    raw.period_raw,
    raw.bronze_status,
    ISJSON(raw.raw_payload) AS payload_is_json,
    JSON_VALUE(raw.raw_payload, '$.indexValue') AS index_value,
    JSON_VALUE(raw.raw_payload, '$.priorYearIndexValue') AS prior_year_index_value,
    JSON_VALUE(raw.raw_payload, '$.yearOverYearPercent') AS yoy_percent
FROM [bronze].[raw_indicator_observation] AS raw
WHERE raw.ingestion_batch_id = @batch_id;

-- Every query below must return zero.
SELECT N'ASSET_COUNT_NOT_3' AS violation
WHERE (SELECT COUNT(*) FROM [bronze].[source_asset] WHERE ingestion_batch_id = @batch_id) <> 3
UNION ALL
SELECT N'RAW_COUNT_NOT_1'
WHERE (SELECT COUNT(*) FROM [bronze].[raw_indicator_observation] WHERE ingestion_batch_id = @batch_id) <> 1
UNION ALL
SELECT N'INVALID_ASSET_HASH'
WHERE EXISTS
(
    SELECT 1 FROM [bronze].[source_asset]
    WHERE ingestion_batch_id = @batch_id AND DATALENGTH(content_hash) <> 32
)
UNION ALL
SELECT N'OFFICIAL_ASSET_WITHOUT_EVIDENCE'
WHERE EXISTS
(
    SELECT 1 FROM [bronze].[source_asset]
    WHERE ingestion_batch_id = @batch_id
      AND is_official = 1
      AND (publication_date IS NULL OR source_version IS NULL OR content_hash IS NULL)
)
UNION ALL
SELECT N'INVALID_RAW_JSON'
WHERE EXISTS
(
    SELECT 1 FROM [bronze].[raw_indicator_observation]
    WHERE ingestion_batch_id = @batch_id AND ISJSON(raw_payload) <> 1
)
UNION ALL
SELECT N'UNEXPECTED_SILVER_WRITE'
WHERE EXISTS
(
    SELECT 1 FROM [silver].[observation] WHERE ingestion_batch_id = @batch_id
)
UNION ALL
SELECT N'DEMO_GOLD_CHANGED'
WHERE
    (SELECT COUNT(*) FROM [gold].[fact_indicator_observation] WHERE publication_status = 'DEMONSTRATION' AND is_official = 0) <> 6
UNION ALL
SELECT N'UNEXPECTED_OFFICIAL_GOLD'
WHERE EXISTS
(
    SELECT 1 FROM [gold].[fact_indicator_observation] WHERE is_official = 1
);
GO

