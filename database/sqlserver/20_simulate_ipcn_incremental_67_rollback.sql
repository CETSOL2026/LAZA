/* Synthetic July 2026 test. The procedure must roll back every inserted row. */
USE [LAZA_DATA_PLATFORM_DEV];
GO
SET NOCOUNT ON;

DECLARE @silver_before int =
(
    SELECT COUNT(*) FROM [silver].[observation] AS o
    INNER JOIN [silver].[indicator_series] AS s ON s.series_id = o.series_id
    WHERE s.series_code = N'INFLATION_RATE_AGO_INE_IPCN_YOY' AND o.is_current = 1
);
DECLARE @gold_before int =
(
    SELECT COUNT(*) FROM [gold].[fact_indicator_observation] AS f
    INNER JOIN [gold].[dim_series] AS s ON s.series_key = f.series_key
    WHERE s.series_code = N'INFLATION_RATE_AGO_INE_IPCN_YOY' AND f.is_official = 1
);

EXEC [control].[usp_publish_ipcn_month]
    @reference_period = '2026-07-01',
    @index_value = 265.50,
    @prior_year_index_value = 244.01,
    @reported_yoy = 8.81,
    @publication_date = '2026-08-08',
    @source_version = N'SIMULATION-IPCN-2026-07',
    @asset_name = N'simulation_ipcn_2026-07_publication.pdf',
    @asset_location = N'SIMULATION_ONLY_NO_FILE',
    @asset_url = N'https://www.ine.gov.ao/SIMULATION_ONLY',
    @publication_page = N'https://www.ine.gov.ao/SIMULATION_ONLY',
    @content_hash_hex = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    @content_size_bytes = 1,
    @simulation = 1;

SELECT
    @silver_before AS silver_before,
    (SELECT COUNT(*) FROM [silver].[observation] AS o
     INNER JOIN [silver].[indicator_series] AS s ON s.series_id = o.series_id
     WHERE s.series_code = N'INFLATION_RATE_AGO_INE_IPCN_YOY' AND o.is_current = 1) AS silver_after,
    @gold_before AS gold_before,
    (SELECT COUNT(*) FROM [gold].[fact_indicator_observation] AS f
     INNER JOIN [gold].[dim_series] AS s ON s.series_key = f.series_key
     WHERE s.series_code = N'INFLATION_RATE_AGO_INE_IPCN_YOY' AND f.is_official = 1) AS gold_after;
GO
