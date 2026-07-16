/*
LAZA SQL Server - approve and publish the validated 66-month IPCN series.

Prerequisites:
- all 66 current Silver observations are PASSED;
- their source asset is official and versioned;
- the 12 unavailable 2020 comparisons have APPROVED DQ exceptions.

The transaction creates OFFICIAL approvals, moves Silver to PUBLISHED and
loads the Gold star model. It is idempotent and rejects partial prior loads.
*/
USE [LAZA_DATA_PLATFORM_DEV];
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

DECLARE @series_id int =
(
    SELECT series_id FROM [silver].[indicator_series]
    WHERE series_code = N'INFLATION_RATE_AGO_INE_IPCN_YOY'
      AND is_current = 1
);
DECLARE @ingestion_batch_id bigint =
(
    SELECT ingestion_batch_id FROM [control].[ingestion_batch]
    WHERE batch_code = N'INE-IPCN-2026-06-20260716-V1'
      AND data_classification = 'OFFICIAL'
      AND batch_status = 'VALIDATED'
);
DECLARE @dq_execution_id bigint =
(
    SELECT MAX(e.dq_execution_id)
    FROM [dq].[execution] AS e
    INNER JOIN [control].[pipeline_run] AS pr ON pr.pipeline_run_id = e.pipeline_run_id
    INNER JOIN [control].[pipeline_definition] AS pd ON pd.pipeline_id = pr.pipeline_id
    WHERE e.ingestion_batch_id = @ingestion_batch_id
      AND pd.pipeline_code = N'INE_IPCN_BRONZE_TO_SILVER'
);

IF @series_id IS NULL OR @ingestion_batch_id IS NULL OR @dq_execution_id IS NULL
    THROW 51040, 'Required validated IPCN series, batch or DQ execution was not found.', 1;

DECLARE @silver_count int =
(
    SELECT COUNT(*) FROM [silver].[observation]
    WHERE series_id = @series_id AND ingestion_batch_id = @ingestion_batch_id AND is_current = 1
);
DECLARE @passed_count int =
(
    SELECT COUNT(*) FROM [silver].[observation]
    WHERE series_id = @series_id AND ingestion_batch_id = @ingestion_batch_id
      AND is_current = 1 AND quality_status = 'PASSED'
);
DECLARE @official_asset_count int =
(
    SELECT COUNT(*)
    FROM [silver].[observation] AS o
    INNER JOIN [bronze].[source_asset] AS a ON a.source_asset_id = o.source_asset_id
    WHERE o.series_id = @series_id AND o.ingestion_batch_id = @ingestion_batch_id
      AND o.is_current = 1 AND a.is_official = 1
      AND a.publication_date IS NOT NULL AND a.content_hash IS NOT NULL AND a.source_version IS NOT NULL
);
DECLARE @approved_exception_count int =
(
    SELECT COUNT(*)
    FROM [dq].[exception] AS ex
    INNER JOIN [dq].[result] AS dr ON dr.dq_result_id = ex.dq_result_id
    INNER JOIN [silver].[observation] AS o ON o.observation_id = dr.observation_id
    WHERE dr.dq_execution_id = @dq_execution_id
      AND o.series_id = @series_id
      AND ex.exception_status = 'APPROVED'
);
DECLARE @official_approval_count int =
(
    SELECT COUNT(*)
    FROM [dq].[approval] AS a
    INNER JOIN [silver].[observation] AS o ON o.observation_id = a.observation_id
    WHERE o.series_id = @series_id
      AND a.decision = 'APPROVE' AND a.decision_scope = 'OFFICIAL'
);
DECLARE @gold_count int =
(
    SELECT COUNT(*)
    FROM [gold].[fact_indicator_observation] AS f
    INNER JOIN [gold].[dim_series] AS s ON s.series_key = f.series_key
    WHERE s.silver_series_id = @series_id
      AND f.publication_status = 'PUBLISHED' AND f.is_official = 1
);

IF @official_approval_count = 66 AND @gold_count = 66
BEGIN
    PRINT 'The 66 IPCN observations are already officially published. No rows were changed.';
    SELECT @series_id AS series_id, @official_approval_count AS official_approvals, @gold_count AS official_gold_rows;
    RETURN;
END;

IF @official_approval_count <> 0 OR @gold_count <> 0
    THROW 51041, 'Partial official approval or Gold load found. Manual review is required.', 1;
IF @silver_count <> 66 OR @passed_count <> 66
    THROW 51042, 'Publication gate failed: exactly 66 PASSED Silver observations are required.', 1;
IF @official_asset_count <> 66
    THROW 51043, 'Publication gate failed: all observations require exact official source evidence.', 1;
IF @approved_exception_count <> 12
    THROW 51044, 'Publication gate failed: exactly 12 approved 2021 DQ exceptions are required.', 1;
IF EXISTS
(
    SELECT 1 FROM [silver].[observation]
    WHERE series_id = @series_id AND is_current = 1
      AND (reference_period_start < '2021-01-01' OR reference_period_start > '2026-06-01')
)
    THROW 51045, 'Publication gate failed: unexpected reference period found.', 1;

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @pipeline_id int;
    DECLARE @pipeline_run_id bigint;
    DECLARE @started_at datetime2(3) = SYSUTCDATETIME();

    IF NOT EXISTS
    (
        SELECT 1 FROM [control].[pipeline_definition]
        WHERE pipeline_code = N'INE_IPCN_SILVER_TO_GOLD'
    )
        INSERT INTO [control].[pipeline_definition]
        (pipeline_code, pipeline_name, source_system)
        VALUES
        (N'INE_IPCN_SILVER_TO_GOLD', N'Publish validated INE IPCN Silver series to Gold', N'INE_ANGOLA');

    SELECT @pipeline_id = pipeline_id
    FROM [control].[pipeline_definition]
    WHERE pipeline_code = N'INE_IPCN_SILVER_TO_GOLD';

    INSERT INTO [control].[pipeline_run]
    (pipeline_id, run_status, trigger_type, started_at, initiated_by)
    VALUES (@pipeline_id, 'STARTED', 'MANUAL', @started_at, SUSER_SNAME());
    SET @pipeline_run_id = SCOPE_IDENTITY();

    INSERT INTO [dq].[approval]
    (observation_id, decision, decision_scope, decision_notes, decided_by, decided_at)
    SELECT
        o.observation_id,
        'APPROVE',
        'OFFICIAL',
        CASE WHEN o.reference_period_start < '2022-01-01'
             THEN N'Approved for official publication with an accepted DQ exception: no 2020 index level exists for independent t-12 reconciliation. Original warning and exception remain traceable.'
             ELSE N'Approved for official publication after completeness, uniqueness and homologue reconciliation passed.'
        END,
        SUSER_SNAME(),
        @started_at
    FROM [silver].[observation] AS o
    WHERE o.series_id = @series_id
      AND o.ingestion_batch_id = @ingestion_batch_id
      AND o.is_current = 1
      AND o.quality_status = 'PASSED';

    IF @@ROWCOUNT <> 66
        THROW 51046, 'Official approval insertion did not affect exactly 66 rows.', 1;

    UPDATE [silver].[observation]
    SET publication_status = 'PUBLISHED', is_official = 1
    WHERE series_id = @series_id
      AND ingestion_batch_id = @ingestion_batch_id
      AND is_current = 1
      AND quality_status = 'PASSED'
      AND publication_status = 'VALIDATED'
      AND is_official = 0;

    IF @@ROWCOUNT <> 66
        THROW 51047, 'Silver publication update did not affect exactly 66 rows.', 1;

    INSERT INTO [gold].[dim_indicator]
    (silver_indicator_id, indicator_code, indicator_name, domain_name, business_definition, favorable_direction, is_active)
    SELECT i.indicator_id, i.indicator_code, i.indicator_name, i.domain_name,
           i.business_definition, i.favorable_direction, i.is_active
    FROM [silver].[indicator] AS i
    INNER JOIN [silver].[indicator_series] AS s ON s.indicator_id = i.indicator_id
    WHERE s.series_id = @series_id
      AND NOT EXISTS (SELECT 1 FROM [gold].[dim_indicator] AS gi WHERE gi.silver_indicator_id = i.indicator_id);

    INSERT INTO [gold].[dim_source]
    (silver_source_id, source_code, source_name, organization_name, homepage_url)
    SELECT src.source_id, src.source_code, src.source_name, src.organization_name, src.homepage_url
    FROM [reference].[source] AS src
    INNER JOIN [silver].[indicator_series] AS s ON s.source_id = src.source_id
    WHERE s.series_id = @series_id
      AND NOT EXISTS (SELECT 1 FROM [gold].[dim_source] AS gs WHERE gs.silver_source_id = src.source_id);

    INSERT INTO [gold].[dim_unit]
    (silver_unit_id, unit_code, unit_name, symbol)
    SELECT u.unit_id, u.unit_code, u.unit_name, u.symbol
    FROM [reference].[unit] AS u
    INNER JOIN [silver].[indicator_series] AS s ON s.unit_id = u.unit_id
    WHERE s.series_id = @series_id
      AND NOT EXISTS (SELECT 1 FROM [gold].[dim_unit] AS gu WHERE gu.silver_unit_id = u.unit_id);

    INSERT INTO [gold].[dim_geography]
    (silver_geography_id, geography_code, geography_name, geography_level, iso_code)
    SELECT g.geography_id, g.geography_code, g.geography_name, g.geography_level, g.iso_code
    FROM [reference].[geography] AS g
    INNER JOIN [silver].[indicator_series] AS s ON s.geography_id = g.geography_id
    WHERE s.series_id = @series_id
      AND NOT EXISTS (SELECT 1 FROM [gold].[dim_geography] AS gg WHERE gg.silver_geography_id = g.geography_id);

    INSERT INTO [gold].[dim_series]
    (silver_series_id, series_code, frequency_code, frequency_name, methodology_version)
    SELECT s.series_id, s.series_code, f.frequency_code, f.frequency_name, s.methodology_version
    FROM [silver].[indicator_series] AS s
    INNER JOIN [reference].[frequency] AS f ON f.frequency_id = s.frequency_id
    WHERE s.series_id = @series_id
      AND NOT EXISTS (SELECT 1 FROM [gold].[dim_series] AS gs WHERE gs.silver_series_id = s.series_id);

    INSERT INTO [gold].[dim_date]
    (date_key, full_date, calendar_year, calendar_quarter, calendar_month, month_name)
    SELECT
        CONVERT(int, CONVERT(char(8), d.full_date, 112)),
        d.full_date,
        YEAR(d.full_date),
        DATEPART(QUARTER, d.full_date),
        MONTH(d.full_date),
        DATENAME(MONTH, d.full_date)
    FROM
    (
        SELECT reference_period_start AS full_date
        FROM [silver].[observation] WHERE series_id = @series_id AND is_current = 1
        UNION
        SELECT reference_period_end AS full_date
        FROM [silver].[observation] WHERE series_id = @series_id AND is_current = 1
    ) AS d
    WHERE NOT EXISTS (SELECT 1 FROM [gold].[dim_date] AS gd WHERE gd.full_date = d.full_date);

    INSERT INTO [gold].[fact_indicator_observation]
    (
        silver_observation_id, indicator_key, series_key, source_key, unit_key,
        geography_key, period_start_date_key, period_end_date_key,
        reference_period_label, numeric_value, display_value, comparison_label,
        comparison_display_value, trend_direction, quality_status, quality_score,
        publication_status, is_official, source_asset_id, published_at
    )
    SELECT
        o.observation_id,
        gi.indicator_key,
        gser.series_key,
        gsrc.source_key,
        gu.unit_key,
        gg.geography_key,
        ds.date_key,
        de.date_key,
        o.reference_period_label,
        o.numeric_value,
        o.display_value,
        o.comparison_label,
        o.comparison_display_value,
        o.trend_direction,
        o.quality_status,
        score.quality_score,
        'PUBLISHED',
        1,
        o.source_asset_id,
        @started_at
    FROM [silver].[observation] AS o
    INNER JOIN [silver].[indicator_series] AS s ON s.series_id = o.series_id
    INNER JOIN [gold].[dim_indicator] AS gi ON gi.silver_indicator_id = s.indicator_id
    INNER JOIN [gold].[dim_series] AS gser ON gser.silver_series_id = s.series_id
    INNER JOIN [gold].[dim_source] AS gsrc ON gsrc.silver_source_id = s.source_id
    INNER JOIN [gold].[dim_unit] AS gu ON gu.silver_unit_id = s.unit_id
    INNER JOIN [gold].[dim_geography] AS gg ON gg.silver_geography_id = s.geography_id
    INNER JOIN [gold].[dim_date] AS ds ON ds.full_date = o.reference_period_start
    INNER JOIN [gold].[dim_date] AS de ON de.full_date = o.reference_period_end
    INNER JOIN [dq].[indicator_score] AS score
        ON score.observation_id = o.observation_id AND score.dq_execution_id = @dq_execution_id
    WHERE o.series_id = @series_id
      AND o.ingestion_batch_id = @ingestion_batch_id
      AND o.is_current = 1
      AND o.quality_status = 'PASSED'
      AND o.publication_status = 'PUBLISHED'
      AND o.is_official = 1;

    IF @@ROWCOUNT <> 66
        THROW 51048, 'Gold insertion did not affect exactly 66 rows.', 1;

    UPDATE [control].[pipeline_run]
    SET run_status = 'SUCCEEDED', ended_at = SYSUTCDATETIME(),
        rows_read = 66, rows_written = 66, rows_rejected = 0
    WHERE pipeline_run_id = @pipeline_run_id;

    INSERT INTO [audit].[pipeline_event]
    (pipeline_run_id, ingestion_batch_id, event_type, event_level, event_message, event_context)
    VALUES
    (
        @pipeline_run_id, @ingestion_batch_id, 'IPCN_GOLD_PUBLICATION_COMPLETED', 'INFO',
        N'66 validated monthly IPCN observations were officially approved and published to Gold. The 12 accepted 2021 DQ exceptions remain traceable.',
        N'{"officialApprovals":66,"silverPublished":66,"goldRows":66,"periodStart":"2021-01","periodEnd":"2026-06","acceptedExceptions":12}'
    );

    COMMIT TRANSACTION;

    SELECT
        @pipeline_run_id AS pipeline_run_id,
        @series_id AS series_id,
        66 AS official_approvals,
        66 AS silver_published_rows,
        66 AS official_gold_rows;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO
