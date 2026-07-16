/*
LAZA SQL Server - normalize the 66 monthly IPCN observations to Silver
Source table: page 3 of INE IPCN publication IPCN-NI-06-2026.

The published YoY rate is the Silver measure. The index level remains in the
DQ evidence and is used to reconcile every month for which t-12 is available.
No Gold row or publication approval is created by this script.
*/
USE [LAZA_DATA_PLATFORM_DEV];
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID(N'silver.observation', N'U') IS NULL OR OBJECT_ID(N'dq.result', N'U') IS NULL
    THROW 51020, 'Required Silver and DQ tables do not exist.', 1;

DECLARE @data TABLE
(
    reference_period_start date NOT NULL PRIMARY KEY,
    index_value decimal(12,2) NOT NULL,
    yoy_reported decimal(9,2) NOT NULL,
    prior_index_value decimal(12,2) NULL,
    yoy_calculated decimal(9,2) NULL,
    absolute_difference decimal(9,2) NULL
);

INSERT INTO @data (reference_period_start, index_value, yoy_reported)
VALUES
('2021-01-01',101.50,24.41),('2021-02-01',103.60,24.85),('2021-03-01',105.45,24.77),
('2021-04-01',107.65,24.82),('2021-05-01',109.84,24.94),('2021-06-01',112.09,25.32),
('2021-07-01',114.45,25.72),('2021-08-01',116.88,26.09),('2021-09-01',119.43,26.57),
('2021-10-01',121.88,26.87),('2021-11-01',124.42,26.98),('2021-12-01',127.03,27.03),
('2022-01-01',129.57,27.66),('2022-02-01',131.86,27.28),('2022-03-01',133.92,27.00),
('2022-04-01',135.42,25.79),('2022-05-01',136.67,24.42),('2022-06-01',137.82,22.96),
('2022-07-01',138.94,21.40),('2022-08-01',140.00,19.78),('2022-09-01',141.11,18.16),
('2022-10-01',142.21,16.68),('2022-11-01',143.38,15.24),('2022-12-01',144.63,13.85),
('2023-01-01',145.83,12.54),('2023-02-01',147.08,11.54),('2023-03-01',148.40,10.81),
('2023-04-01',149.76,10.59),('2023-05-01',151.19,10.62),('2023-06-01',153.32,11.25),
('2023-07-01',155.78,12.12),('2023-08-01',158.97,13.54),('2023-09-01',162.30,15.01),
('2023-10-01',165.79,16.58),('2023-11-01',169.46,18.19),('2023-12-01',173.57,20.01),
('2024-01-01',177.89,21.99),('2024-02-01',182.48,24.07),('2024-03-01',187.11,26.09),
('2024-04-01',191.99,28.20),('2024-05-01',196.78,30.16),('2024-06-01',200.85,31.00),
('2024-07-01',204.22,31.09),('2024-08-01',207.50,30.53),('2024-09-01',210.88,29.93),
('2024-10-01',214.16,29.17),('2024-11-01',217.59,28.40),('2024-12-01',221.29,27.50),
('2025-01-01',224.99,26.48),('2025-02-01',228.58,25.26),('2025-03-01',231.74,23.85),
('2025-04-01',234.84,22.32),('2025-05-01',237.59,20.74),('2025-06-01',240.47,19.73),
('2025-07-01',244.01,19.48),('2025-08-01',246.68,18.88),('2025-09-01',249.17,18.16),
('2025-10-01',251.49,17.43),('2025-11-01',253.63,16.56),('2025-12-01',256.03,15.70),
('2026-01-01',257.76,14.56),('2026-02-01',259.10,13.35),('2026-03-01',260.52,12.42),
('2026-04-01',262.03,11.58),('2026-05-01',263.43,10.88),('2026-06-01',264.79,10.11);

UPDATE current_row
SET
    prior_index_value = prior_row.index_value,
    yoy_calculated = ROUND(((current_row.index_value / prior_row.index_value) - 1) * 100, 2),
    absolute_difference = ABS(current_row.yoy_reported - ROUND(((current_row.index_value / prior_row.index_value) - 1) * 100, 2))
FROM @data AS current_row
INNER JOIN @data AS prior_row
    ON prior_row.reference_period_start = DATEADD(year, -1, current_row.reference_period_start);

IF (SELECT COUNT(*) FROM @data) <> 66
    THROW 51021, 'Completeness precheck failed: expected 66 source periods.', 1;
IF (SELECT COUNT(DISTINCT reference_period_start) FROM @data) <> 66
    THROW 51022, 'Uniqueness precheck failed: duplicate source periods found.', 1;
IF (SELECT DATEDIFF(month, MIN(reference_period_start), MAX(reference_period_start)) + 1 FROM @data) <> 66
    THROW 51023, 'Completeness precheck failed: monthly sequence is not continuous.', 1;
IF EXISTS (SELECT 1 FROM @data WHERE prior_index_value IS NOT NULL AND absolute_difference > 0.01)
    THROW 51024, 'Homologous reconciliation failed: difference exceeds 0.01 percentage point.', 1;

DECLARE @existing_series_id int =
(
    SELECT series_id FROM [silver].[indicator_series]
    WHERE series_code = N'INFLATION_RATE_AGO_INE_IPCN_YOY'
);

IF @existing_series_id IS NOT NULL
BEGIN
    DECLARE @existing_count int =
    (
        SELECT COUNT(*) FROM [silver].[observation]
        WHERE series_id = @existing_series_id AND is_current = 1
    );
    IF @existing_count = 66
    BEGIN
        PRINT 'The 66 IPCN Silver observations already exist. No rows were changed.';
        SELECT @existing_series_id AS series_id, @existing_count AS current_observation_count;
        RETURN;
    END;
    THROW 51025, 'Partial IPCN Silver series found. Manual review is required before reprocessing.', 1;
END;

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @loaded_at datetime2(3) = SYSUTCDATETIME();
    DECLARE @pipeline_id int;
    DECLARE @pipeline_run_id bigint;
    DECLARE @ingestion_batch_id bigint;
    DECLARE @source_id int;
    DECLARE @indicator_id int;
    DECLARE @unit_id int;
    DECLARE @frequency_id int;
    DECLARE @geography_id int;
    DECLARE @series_id int;
    DECLARE @publication_asset_id bigint;
    DECLARE @june_raw_observation_id bigint;
    DECLARE @dq_execution_id bigint;

    SELECT @ingestion_batch_id = ingestion_batch_id
    FROM [control].[ingestion_batch]
    WHERE batch_code = N'INE-IPCN-2026-06-20260716-V1'
      AND data_classification = 'OFFICIAL';
    IF @ingestion_batch_id IS NULL
        THROW 51026, 'Required official Bronze batch was not found.', 1;

    SELECT @publication_asset_id = source_asset_id, @source_id = source_id
    FROM [bronze].[source_asset]
    WHERE ingestion_batch_id = @ingestion_batch_id
      AND asset_name = N'ine_ipcn_2026-06_publication.pdf'
      AND is_official = 1;
    IF @publication_asset_id IS NULL
        THROW 51027, 'Official IPCN publication asset was not found.', 1;

    SELECT @june_raw_observation_id = raw_observation_id
    FROM [bronze].[raw_indicator_observation]
    WHERE ingestion_batch_id = @ingestion_batch_id
      AND source_record_key = N'inflation-rate|AGO|2026-06|YOY';

    SELECT @indicator_id = indicator_id FROM [silver].[indicator] WHERE indicator_code = N'inflation-rate';
    SELECT @unit_id = unit_id FROM [reference].[unit] WHERE unit_code = N'PCT_YOY';
    SELECT @frequency_id = frequency_id FROM [reference].[frequency] WHERE frequency_code = N'MONTHLY';
    SELECT @geography_id = geography_id FROM [reference].[geography] WHERE geography_code = N'AGO';
    IF @indicator_id IS NULL OR @unit_id IS NULL OR @frequency_id IS NULL OR @geography_id IS NULL
        THROW 51028, 'Required indicator or reference contracts were not found.', 1;

    IF NOT EXISTS
    (
        SELECT 1 FROM [control].[pipeline_definition]
        WHERE pipeline_code = N'INE_IPCN_BRONZE_TO_SILVER'
    )
        INSERT INTO [control].[pipeline_definition]
        (pipeline_code, pipeline_name, source_system)
        VALUES
        (N'INE_IPCN_BRONZE_TO_SILVER', N'INE IPCN official publication to normalized Silver', N'INE_ANGOLA');

    SELECT @pipeline_id = pipeline_id
    FROM [control].[pipeline_definition]
    WHERE pipeline_code = N'INE_IPCN_BRONZE_TO_SILVER';

    INSERT INTO [control].[pipeline_run]
    (pipeline_id, run_status, trigger_type, started_at, initiated_by)
    VALUES (@pipeline_id, 'STARTED', 'MANUAL', @loaded_at, SUSER_SNAME());
    SET @pipeline_run_id = SCOPE_IDENTITY();

    INSERT INTO [silver].[indicator_series]
    (
        series_code, indicator_id, source_id, unit_id, frequency_id,
        geography_id, methodology_version, methodology_notes, series_status
    )
    VALUES
    (
        N'INFLATION_RATE_AGO_INE_IPCN_YOY', @indicator_id, @source_id, @unit_id, @frequency_id,
        @geography_id, N'IPCN-METHODOLOGY-BASE-DEC-2020',
        N'National IPCN year-over-year rate. Index base December 2020 = 100. Values transcribed from page 3 of IPCN-NI-06-2026.',
        'VALIDATED'
    );
    SET @series_id = SCOPE_IDENTITY();

    INSERT INTO [silver].[observation]
    (
        series_id, ingestion_batch_id, source_asset_id, raw_observation_id,
        reference_period_label, reference_period_start, reference_period_end,
        period_precision, numeric_value, display_value, comparison_label,
        comparison_display_value, trend_direction, publication_date,
        quality_status, publication_status, is_official, observation_hash
    )
    SELECT
        @series_id,
        @ingestion_batch_id,
        @publication_asset_id,
        CASE WHEN d.reference_period_start = '2026-06-01' THEN @june_raw_observation_id ELSE NULL END,
        CONVERT(char(7), d.reference_period_start, 126),
        d.reference_period_start,
        EOMONTH(d.reference_period_start),
        'MONTH',
        d.yoy_reported,
        CONCAT(CONVERT(varchar(30), CAST(d.yoy_reported AS decimal(9,2))), N'%'),
        N'year over year',
        NULL,
        NULL,
        '2026-07-08',
        CASE WHEN d.prior_index_value IS NULL THEN 'WARNING' ELSE 'PASSED' END,
        'VALIDATED',
        0,
        HASHBYTES
        (
            'SHA2_256',
            CONCAT(N'INFLATION_RATE_AGO_INE_IPCN_YOY|', CONVERT(char(10), d.reference_period_start, 126),
                   N'|', CONVERT(varchar(30), CAST(d.yoy_reported AS decimal(9,2))), N'|IPCN-NI-06-2026')
        )
    FROM @data AS d;

    DECLARE @rules TABLE
    (
        rule_code nvarchar(100) NOT NULL,
        rule_name nvarchar(250) NOT NULL,
        quality_dimension varchar(20) NOT NULL,
        default_severity varchar(10) NOT NULL,
        rule_expression nvarchar(4000) NOT NULL,
        parameter_json nvarchar(max) NULL
    );

    INSERT INTO @rules VALUES
    (N'IPCN_MONTH_COMPLETENESS', N'IPCN monthly range is complete', 'COMPLETENESS', 'CRITICAL',
     N'Expected exactly one monthly observation from 2021-01 through 2026-06 with no gaps.',
     N'{"expectedPeriods":66,"start":"2021-01","end":"2026-06"}'),
    (N'IPCN_MONTH_UNIQUENESS', N'IPCN monthly grain is unique', 'UNIQUENESS', 'CRITICAL',
     N'COUNT(*) grouped by series and reference month must equal 1.',
     N'{"grain":["series","referenceMonth"]}'),
    (N'IPCN_YOY_RECONCILIATION', N'IPCN reported YoY reconciles to index levels', 'CONSISTENCY', 'HIGH',
     N'ABS(reported_yoy - ROUND(((index_t / index_t_minus_12) - 1) * 100, 2)) <= 0.01 percentage point.',
     N'{"tolerancePercentagePoints":0.01,"roundingDecimals":2,"unavailablePriorPeriodStatus":"WARN"}');

    INSERT INTO [dq].[rule] (rule_code, rule_name, quality_dimension, default_severity)
    SELECT r.rule_code, r.rule_name, r.quality_dimension, r.default_severity
    FROM @rules AS r
    WHERE NOT EXISTS (SELECT 1 FROM [dq].[rule] AS existing_rule WHERE existing_rule.rule_code = r.rule_code);

    INSERT INTO [dq].[rule_version]
    (rule_id, version_number, rule_expression, parameter_json, effective_from, is_current)
    SELECT dr.rule_id, 1, r.rule_expression, r.parameter_json, @loaded_at, 1
    FROM @rules AS r
    INNER JOIN [dq].[rule] AS dr ON dr.rule_code = r.rule_code
    WHERE NOT EXISTS
    (
        SELECT 1 FROM [dq].[rule_version] AS rv
        WHERE rv.rule_id = dr.rule_id AND rv.version_number = 1
    );

    INSERT INTO [dq].[execution]
    (pipeline_run_id, ingestion_batch_id, execution_status, started_at)
    VALUES (@pipeline_run_id, @ingestion_batch_id, 'STARTED', @loaded_at);
    SET @dq_execution_id = SCOPE_IDENTITY();

    INSERT INTO [dq].[result]
    (dq_execution_id, rule_version_id, observation_id, raw_observation_id, result_status, observed_value, result_message)
    SELECT
        @dq_execution_id, rv.rule_version_id, o.observation_id, o.raw_observation_id, 'PASS',
        CONCAT(N'period=', CONVERT(char(7), d.reference_period_start, 126), N'; totalPeriods=66; expectedPeriods=66'),
        N'Month is present in the continuous 66-month range.'
    FROM @data AS d
    INNER JOIN [silver].[observation] AS o
        ON o.series_id = @series_id AND o.reference_period_start = d.reference_period_start AND o.is_current = 1
    INNER JOIN [dq].[rule] AS r ON r.rule_code = N'IPCN_MONTH_COMPLETENESS'
    INNER JOIN [dq].[rule_version] AS rv ON rv.rule_id = r.rule_id AND rv.is_current = 1;

    INSERT INTO [dq].[result]
    (dq_execution_id, rule_version_id, observation_id, raw_observation_id, result_status, observed_value, result_message)
    SELECT
        @dq_execution_id, rv.rule_version_id, o.observation_id, o.raw_observation_id, 'PASS',
        CONCAT(N'period=', CONVERT(char(7), d.reference_period_start, 126), N'; grainCount=1'),
        N'Month is unique at series and reference-month grain.'
    FROM @data AS d
    INNER JOIN [silver].[observation] AS o
        ON o.series_id = @series_id AND o.reference_period_start = d.reference_period_start AND o.is_current = 1
    INNER JOIN [dq].[rule] AS r ON r.rule_code = N'IPCN_MONTH_UNIQUENESS'
    INNER JOIN [dq].[rule_version] AS rv ON rv.rule_id = r.rule_id AND rv.is_current = 1;

    INSERT INTO [dq].[result]
    (dq_execution_id, rule_version_id, observation_id, raw_observation_id, result_status, observed_value, result_message)
    SELECT
        @dq_execution_id,
        rv.rule_version_id,
        o.observation_id,
        o.raw_observation_id,
        CASE WHEN d.prior_index_value IS NULL THEN 'WARN'
             WHEN d.absolute_difference <= 0.01 THEN 'PASS' ELSE 'FAIL' END,
        CASE WHEN d.prior_index_value IS NULL
             THEN CONCAT(N'period=', CONVERT(char(7), d.reference_period_start, 126), N'; reported=', d.yoy_reported, N'; priorIndex=unavailable')
             ELSE CONCAT(N'period=', CONVERT(char(7), d.reference_period_start, 126),
                         N'; index=', d.index_value, N'; priorIndex=', d.prior_index_value,
                         N'; calculated=', d.yoy_calculated, N'; reported=', d.yoy_reported,
                         N'; absDiff=', d.absolute_difference)
        END,
        CASE WHEN d.prior_index_value IS NULL
             THEN N'Reconciliation not independently calculable because the publication table starts in 2021 and does not include the matching 2020 index.'
             ELSE N'Reported YoY is within the 0.01 percentage-point tolerance after two-decimal rounding.'
        END
    FROM @data AS d
    INNER JOIN [silver].[observation] AS o
        ON o.series_id = @series_id AND o.reference_period_start = d.reference_period_start AND o.is_current = 1
    INNER JOIN [dq].[rule] AS r ON r.rule_code = N'IPCN_YOY_RECONCILIATION'
    INNER JOIN [dq].[rule_version] AS rv ON rv.rule_id = r.rule_id AND rv.is_current = 1;

    INSERT INTO [dq].[indicator_score]
    (dq_execution_id, observation_id, quality_score, passed_rules, warning_rules, failed_rules)
    SELECT
        @dq_execution_id,
        o.observation_id,
        CAST(CASE WHEN d.prior_index_value IS NULL THEN 83.33 ELSE 100.00 END AS decimal(5,2)),
        CASE WHEN d.prior_index_value IS NULL THEN 2 ELSE 3 END,
        CASE WHEN d.prior_index_value IS NULL THEN 1 ELSE 0 END,
        0
    FROM @data AS d
    INNER JOIN [silver].[observation] AS o
        ON o.series_id = @series_id AND o.reference_period_start = d.reference_period_start AND o.is_current = 1;

    UPDATE [dq].[execution]
    SET execution_status = 'WARNING', ended_at = SYSUTCDATETIME()
    WHERE dq_execution_id = @dq_execution_id;

    UPDATE [control].[ingestion_batch]
    SET batch_status = 'VALIDATED'
    WHERE ingestion_batch_id = @ingestion_batch_id;

    UPDATE [control].[pipeline_run]
    SET run_status = 'SUCCEEDED', ended_at = SYSUTCDATETIME(),
        rows_read = 66, rows_written = 66, rows_rejected = 0
    WHERE pipeline_run_id = @pipeline_run_id;

    INSERT INTO [audit].[pipeline_event]
    (pipeline_run_id, ingestion_batch_id, event_type, event_level, event_message, event_context)
    VALUES
    (
        @pipeline_run_id, @ingestion_batch_id, 'IPCN_SILVER_VALIDATION_COMPLETED', 'WARN',
        N'66 monthly IPCN YoY observations normalized to Silver; 54 homologue reconciliations passed and 12 periods remain warnings due to unavailable 2020 indices.',
        N'{"silverRows":66,"completenessPass":66,"uniquenessPass":66,"reconciliationPass":54,"reconciliationWarn":12,"reconciliationFail":0,"tolerancePercentagePoints":0.01,"goldWrites":0}'
    );

    COMMIT TRANSACTION;

    SELECT
        @pipeline_run_id AS pipeline_run_id,
        @ingestion_batch_id AS ingestion_batch_id,
        @series_id AS series_id,
        @dq_execution_id AS dq_execution_id,
        66 AS silver_rows,
        186 AS dq_pass_results,
        12 AS dq_warning_results,
        0 AS dq_fail_results;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO
