/* Create the guarded one-month IPCN Bronze -> Silver -> Gold procedure. */
USE [LAZA_DATA_PLATFORM_DEV];
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

CREATE OR ALTER PROCEDURE [control].[usp_publish_ipcn_month]
    @reference_period date,
    @index_value decimal(12,2),
    @prior_year_index_value decimal(12,2),
    @reported_yoy decimal(9,2),
    @publication_date date,
    @source_version nvarchar(100),
    @asset_name nvarchar(500),
    @asset_location nvarchar(2000),
    @asset_url nvarchar(2000),
    @publication_page nvarchar(2000),
    @content_hash_hex varchar(64),
    @content_size_bytes bigint,
    @simulation bit = 0
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @series_id int =
    (
        SELECT series_id FROM [silver].[indicator_series]
        WHERE series_code = N'INFLATION_RATE_AGO_INE_IPCN_YOY' AND is_current = 1
    );
    DECLARE @source_id int =
    (
        SELECT source_id FROM [reference].[source] WHERE source_code = N'INE_IPCN'
    );
    DECLARE @latest_period date =
    (
        SELECT MAX(reference_period_start) FROM [silver].[observation]
        WHERE series_id = @series_id AND is_current = 1
    );
    DECLARE @calculated_yoy decimal(9,2) = ROUND(((@index_value / @prior_year_index_value) - 1) * 100, 2);
    DECLARE @absolute_difference decimal(9,2) = ABS(@reported_yoy - ROUND(((@index_value / @prior_year_index_value) - 1) * 100, 2));
    DECLARE @content_hash varbinary(32) = TRY_CONVERT(varbinary(32), @content_hash_hex, 2);

    IF @series_id IS NULL OR @source_id IS NULL OR @latest_period IS NULL
        THROW 51050, 'Required IPCN source or current series was not found.', 1;
    IF DAY(@reference_period) <> 1
        THROW 51051, 'Reference period must be the first day of the month.', 1;
    IF @reference_period <> DATEADD(month, 1, @latest_period)
        THROW 51052, 'Increment rejected: reference period must be exactly one month after the current maximum.', 1;
    IF @index_value <= 0 OR @prior_year_index_value <= 0 OR @content_size_bytes <= 0
        THROW 51053, 'Increment rejected: index values and file size must be positive.', 1;
    IF @content_hash IS NULL OR DATALENGTH(@content_hash) <> 32
        THROW 51054, 'Increment rejected: a valid SHA-256 content hash is required.', 1;
    IF @absolute_difference > 0.01
        THROW 51055, 'Increment rejected: homologue reconciliation exceeds 0.01 percentage point.', 1;
    IF EXISTS
    (
        SELECT 1 FROM [silver].[observation]
        WHERE series_id = @series_id AND reference_period_start = @reference_period AND is_current = 1
    )
    BEGIN
        PRINT 'The IPCN reference period already exists. No rows were changed.';
        RETURN;
    END;

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @started_at datetime2(3) = SYSUTCDATETIME();
        DECLARE @pipeline_id int;
        DECLARE @pipeline_run_id bigint;
        DECLARE @ingestion_batch_id bigint;
        DECLARE @source_asset_id bigint;
        DECLARE @raw_observation_id bigint;
        DECLARE @observation_id bigint;
        DECLARE @dq_execution_id bigint;
        DECLARE @previous_yoy decimal(9,2);
        DECLARE @raw_payload nvarchar(max);
        DECLARE @metadata_json nvarchar(max);
        DECLARE @batch_code nvarchar(150) = CONCAT
        (
            CASE WHEN @simulation = 1 THEN N'SIM-' ELSE N'' END,
            N'INE-IPCN-', CONVERT(char(7), @reference_period, 126), N'-',
            CONVERT(char(8), @started_at, 112), N'-V1'
        );

        SELECT @previous_yoy = numeric_value
        FROM [silver].[observation]
        WHERE series_id = @series_id AND reference_period_start = @latest_period AND is_current = 1;

        IF NOT EXISTS
        (
            SELECT 1 FROM [control].[pipeline_definition]
            WHERE pipeline_code = N'INE_IPCN_INCREMENTAL_MONTHLY'
        )
            INSERT INTO [control].[pipeline_definition]
            (pipeline_code, pipeline_name, source_system)
            VALUES
            (N'INE_IPCN_INCREMENTAL_MONTHLY', N'Automated monthly INE IPCN incremental publication', N'INE_ANGOLA');

        SELECT @pipeline_id = pipeline_id
        FROM [control].[pipeline_definition]
        WHERE pipeline_code = N'INE_IPCN_INCREMENTAL_MONTHLY';

        INSERT INTO [control].[pipeline_run]
        (pipeline_id, run_status, trigger_type, started_at, initiated_by)
        VALUES
        (@pipeline_id, 'STARTED', CASE WHEN @simulation = 1 THEN 'REPROCESS' ELSE 'SCHEDULED' END,
         @started_at, CASE WHEN @simulation = 1 THEN N'LAZA_IPCN_SIMULATION' ELSE N'LAZA_IPCN_AUTOMATION' END);
        SET @pipeline_run_id = SCOPE_IDENTITY();

        INSERT INTO [control].[ingestion_batch]
        (pipeline_run_id, batch_code, data_classification, batch_status, acquired_at, source_record_count)
        VALUES (@pipeline_run_id, @batch_code, 'OFFICIAL', 'RECEIVED', @started_at, 1);
        SET @ingestion_batch_id = SCOPE_IDENTITY();

        SET @metadata_json =
        (
            SELECT
                N'LATEST_OFFICIAL_PUBLICATION' AS role,
                @asset_url AS assetUrl,
                @publication_page AS publicationPage,
                CONVERT(char(7), @reference_period, 126) AS referencePeriod,
                @simulation AS simulation
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        );

        INSERT INTO [bronze].[source_asset]
        (ingestion_batch_id, source_id, asset_type, asset_name, asset_location,
         source_version, publication_date, acquired_at, content_hash,
         content_size_bytes, metadata_json, is_official)
        VALUES
        (@ingestion_batch_id, @source_id, 'PDF', @asset_name, @asset_location,
         @source_version, @publication_date, @started_at, @content_hash,
         @content_size_bytes, @metadata_json, 1);
        SET @source_asset_id = SCOPE_IDENTITY();

        SET @raw_payload =
        (
            SELECT
                N'inflation-rate' AS indicatorCode,
                N'AGO' AS geographyCode,
                CONVERT(char(7), @reference_period, 126) AS referencePeriod,
                @reported_yoy AS yearOverYearPercent,
                @index_value AS indexValue,
                @prior_year_index_value AS priorYearIndexValue,
                @calculated_yoy AS calculatedYearOverYearPercent,
                @absolute_difference AS absoluteDifferencePercentagePoints,
                @source_version AS sourceVersion,
                @simulation AS simulation
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        );

        INSERT INTO [bronze].[raw_indicator_observation]
        (ingestion_batch_id, source_asset_id, source_row_number, source_record_key,
         indicator_code_raw, value_raw, unit_raw, period_raw, raw_payload,
         record_hash, bronze_status)
        VALUES
        (@ingestion_batch_id, @source_asset_id, 1,
         CONCAT(N'inflation-rate|AGO|', CONVERT(char(7), @reference_period, 126), N'|YOY'),
         N'inflation-rate', CONVERT(nvarchar(50), @reported_yoy), N'percent year over year',
         CONVERT(char(7), @reference_period, 126), @raw_payload,
         HASHBYTES('SHA2_256', @raw_payload), 'ACCEPTED');
        SET @raw_observation_id = SCOPE_IDENTITY();

        INSERT INTO [silver].[observation]
        (series_id, ingestion_batch_id, source_asset_id, raw_observation_id,
         reference_period_label, reference_period_start, reference_period_end,
         period_precision, numeric_value, display_value, comparison_label,
         comparison_display_value, trend_direction, publication_date,
         quality_status, publication_status, is_official, observation_hash)
        VALUES
        (@series_id, @ingestion_batch_id, @source_asset_id, @raw_observation_id,
         CONVERT(char(7), @reference_period, 126), @reference_period, EOMONTH(@reference_period),
         'MONTH', @reported_yoy, CONCAT(CONVERT(varchar(30), @reported_yoy), N'%'),
         N'vs previous month',
         CONCAT(CASE WHEN @reported_yoy - @previous_yoy >= 0 THEN N'+' ELSE N'' END,
                CONVERT(varchar(30), CAST(@reported_yoy - @previous_yoy AS decimal(9,2))), N' pp'),
         CASE WHEN @reported_yoy > @previous_yoy THEN 'UP'
              WHEN @reported_yoy < @previous_yoy THEN 'DOWN' ELSE 'STABLE' END,
         @publication_date, 'PASSED', 'VALIDATED', 0,
         HASHBYTES('SHA2_256', CONCAT(N'INFLATION_RATE_AGO_INE_IPCN_YOY|',
                   CONVERT(char(10), @reference_period, 126), N'|', @reported_yoy, N'|', @source_version)));
        SET @observation_id = SCOPE_IDENTITY();

        INSERT INTO [dq].[execution]
        (pipeline_run_id, ingestion_batch_id, execution_status, started_at)
        VALUES (@pipeline_run_id, @ingestion_batch_id, 'STARTED', @started_at);
        SET @dq_execution_id = SCOPE_IDENTITY();

        INSERT INTO [dq].[result]
        (dq_execution_id, rule_version_id, observation_id, raw_observation_id,
         result_status, observed_value, result_message)
        SELECT @dq_execution_id, rv.rule_version_id, @observation_id, @raw_observation_id,
               'PASS', CONCAT(N'period=', CONVERT(char(7), @reference_period, 126),
                              N'; expectedNext=', CONVERT(char(7), DATEADD(month, 1, @latest_period), 126)),
               N'Increment is the next continuous monthly period.'
        FROM [dq].[rule] AS rul
        INNER JOIN [dq].[rule_version] AS rv ON rv.rule_id = rul.rule_id AND rv.is_current = 1
        WHERE rul.rule_code = N'IPCN_MONTH_COMPLETENESS'
        UNION ALL
        SELECT @dq_execution_id, rv.rule_version_id, @observation_id, @raw_observation_id,
               'PASS', CONCAT(N'period=', CONVERT(char(7), @reference_period, 126), N'; grainCount=1'),
               N'Increment is unique at series and reference-month grain.'
        FROM [dq].[rule] AS rul
        INNER JOIN [dq].[rule_version] AS rv ON rv.rule_id = rul.rule_id AND rv.is_current = 1
        WHERE rul.rule_code = N'IPCN_MONTH_UNIQUENESS'
        UNION ALL
        SELECT @dq_execution_id, rv.rule_version_id, @observation_id, @raw_observation_id,
               'PASS', CONCAT(N'index=', @index_value, N'; priorIndex=', @prior_year_index_value,
                              N'; calculated=', @calculated_yoy, N'; reported=', @reported_yoy,
                              N'; absDiff=', @absolute_difference),
               N'Reported YoY is within the 0.01 percentage-point tolerance.'
        FROM [dq].[rule] AS rul
        INNER JOIN [dq].[rule_version] AS rv ON rv.rule_id = rul.rule_id AND rv.is_current = 1
        WHERE rul.rule_code = N'IPCN_YOY_RECONCILIATION';

        IF @@ROWCOUNT <> 3
            THROW 51056, 'Incremental DQ execution did not create exactly three rule results.', 1;

        INSERT INTO [dq].[indicator_score]
        (dq_execution_id, observation_id, quality_score, passed_rules, warning_rules, failed_rules)
        VALUES (@dq_execution_id, @observation_id, 100.00, 3, 0, 0);

        INSERT INTO [dq].[approval]
        (observation_id, decision, decision_scope, decision_notes, decided_by, decided_at)
        VALUES
        (@observation_id, 'APPROVE', 'OFFICIAL',
         N'Automated approval after official source evidence and all incremental IPCN DQ rules passed.',
         CASE WHEN @simulation = 1 THEN N'LAZA_IPCN_SIMULATION' ELSE N'LAZA_IPCN_AUTOMATION' END,
         SYSUTCDATETIME());

        UPDATE [silver].[observation]
        SET publication_status = 'PUBLISHED', is_official = 1
        WHERE observation_id = @observation_id;

        INSERT INTO [gold].[dim_date]
        (date_key, full_date, calendar_year, calendar_quarter, calendar_month, month_name)
        SELECT CONVERT(int, CONVERT(char(8), d.full_date, 112)), d.full_date,
               YEAR(d.full_date), DATEPART(quarter, d.full_date), MONTH(d.full_date), DATENAME(month, d.full_date)
        FROM (VALUES (@reference_period), (EOMONTH(@reference_period))) AS d(full_date)
        WHERE NOT EXISTS (SELECT 1 FROM [gold].[dim_date] AS existing WHERE existing.full_date = d.full_date);

        INSERT INTO [gold].[fact_indicator_observation]
        (silver_observation_id, indicator_key, series_key, source_key, unit_key,
         geography_key, period_start_date_key, period_end_date_key,
         reference_period_label, numeric_value, display_value, comparison_label,
         comparison_display_value, trend_direction, quality_status, quality_score,
         publication_status, is_official, source_asset_id)
        SELECT o.observation_id, gi.indicator_key, gs.series_key, gsrc.source_key, gu.unit_key,
               gg.geography_key, dstart.date_key, dend.date_key,
               o.reference_period_label, o.numeric_value, o.display_value, o.comparison_label,
               o.comparison_display_value, o.trend_direction, o.quality_status, score.quality_score,
               'PUBLISHED', 1, o.source_asset_id
        FROM [silver].[observation] AS o
        INNER JOIN [silver].[indicator_series] AS s ON s.series_id = o.series_id
        INNER JOIN [gold].[dim_indicator] AS gi ON gi.silver_indicator_id = s.indicator_id
        INNER JOIN [gold].[dim_series] AS gs ON gs.silver_series_id = s.series_id
        INNER JOIN [gold].[dim_source] AS gsrc ON gsrc.silver_source_id = s.source_id
        INNER JOIN [gold].[dim_unit] AS gu ON gu.silver_unit_id = s.unit_id
        INNER JOIN [gold].[dim_geography] AS gg ON gg.silver_geography_id = s.geography_id
        INNER JOIN [gold].[dim_date] AS dstart ON dstart.full_date = o.reference_period_start
        INNER JOIN [gold].[dim_date] AS dend ON dend.full_date = o.reference_period_end
        INNER JOIN [dq].[indicator_score] AS score
            ON score.observation_id = o.observation_id AND score.dq_execution_id = @dq_execution_id
        WHERE o.observation_id = @observation_id;

        IF @@ROWCOUNT <> 1
            THROW 51057, 'Incremental Gold publication did not create exactly one fact.', 1;

        UPDATE [dq].[execution]
        SET execution_status = 'PASSED', ended_at = SYSUTCDATETIME()
        WHERE dq_execution_id = @dq_execution_id;

        UPDATE [control].[ingestion_batch]
        SET batch_status = 'VALIDATED', accepted_record_count = 1, rejected_record_count = 0
        WHERE ingestion_batch_id = @ingestion_batch_id;

        UPDATE [control].[pipeline_run]
        SET run_status = 'SUCCEEDED', ended_at = SYSUTCDATETIME(),
            rows_read = 1, rows_written = 1, rows_rejected = 0
        WHERE pipeline_run_id = @pipeline_run_id;

        INSERT INTO [audit].[pipeline_event]
        (pipeline_run_id, ingestion_batch_id, event_type, event_level, event_message, event_context)
        VALUES
        (@pipeline_run_id, @ingestion_batch_id, 'IPCN_INCREMENTAL_MONTH_PUBLISHED', 'INFO',
         N'One consecutive official IPCN month passed DQ and was published through Bronze, Silver and Gold.',
         (SELECT CONVERT(char(7), @reference_period, 126) AS referencePeriod,
                 @reported_yoy AS reportedYoy, @index_value AS indexValue,
                 @absolute_difference AS reconciliationDifference,
                 @simulation AS simulation FOR JSON PATH, WITHOUT_ARRAY_WRAPPER));

        DECLARE @silver_count_after int =
        (
            SELECT COUNT(*) FROM [silver].[observation] WHERE series_id = @series_id AND is_current = 1
        );
        DECLARE @gold_count_after int =
        (
            SELECT COUNT(*) FROM [gold].[fact_indicator_observation] AS f
            INNER JOIN [gold].[dim_series] AS s ON s.series_key = f.series_key
            WHERE s.silver_series_id = @series_id AND f.is_official = 1
        );

        IF @simulation = 1
        BEGIN
            ROLLBACK TRANSACTION;
            SELECT N'SIMULATION_ROLLED_BACK' AS execution_result,
                   @reference_period AS simulated_period,
                   @reported_yoy AS simulated_yoy,
                   @silver_count_after AS simulated_silver_count,
                   @gold_count_after AS simulated_gold_count,
                   0 AS persistent_rows_written;
            RETURN;
        END;

        COMMIT TRANSACTION;
        SELECT N'PUBLISHED' AS execution_result, @pipeline_run_id AS pipeline_run_id,
               @ingestion_batch_id AS ingestion_batch_id, @observation_id AS observation_id,
               @reference_period AS published_period, @silver_count_after AS silver_count,
               @gold_count_after AS gold_count;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO
