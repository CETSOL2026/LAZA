/*
LAZA SQL Server POC - controlled seed for the six prototype indicators
APPROVAL REQUIRED BEFORE EXECUTION.

This script loads DEMONSTRATION data only. It does not assert that any value is
an official statistic. The source asset is the repository fixture itself.
*/
USE [LAZA_DATA_PLATFORM_DEV];
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID(N'gold.fact_indicator_observation', N'U') IS NULL
    THROW 51008, 'Required LAZA tables do not exist. Execute approved creation scripts first.', 1;

IF EXISTS (SELECT 1 FROM [control].[ingestion_batch] WHERE batch_code = N'DEMO-PILOT-2024-V1')
BEGIN
    PRINT 'Demo batch DEMO-PILOT-2024-V1 already exists. No rows were changed.';
    RETURN;
END;

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @loaded_at datetime2(3) = SYSUTCDATETIME();
    DECLARE @pipeline_id int;
    DECLARE @pipeline_run_id bigint;
    DECLARE @ingestion_batch_id bigint;
    DECLARE @dq_execution_id bigint;

    DECLARE @fixture TABLE
    (
        indicator_code nvarchar(100) NOT NULL,
        indicator_name nvarchar(250) NOT NULL,
        domain_name nvarchar(200) NOT NULL,
        business_definition nvarchar(2000) NOT NULL,
        favorable_direction varchar(10) NOT NULL,
        source_code nvarchar(100) NOT NULL,
        source_name nvarchar(300) NOT NULL,
        organization_name nvarchar(300) NOT NULL,
        homepage_url nvarchar(1000) NOT NULL,
        unit_code nvarchar(60) NOT NULL,
        unit_name nvarchar(200) NOT NULL,
        unit_symbol nvarchar(40) NULL,
        frequency_code nvarchar(60) NOT NULL,
        frequency_name nvarchar(150) NOT NULL,
        reference_period_label nvarchar(100) NOT NULL,
        reference_period_start date NOT NULL,
        reference_period_end date NOT NULL,
        period_precision varchar(10) NOT NULL,
        numeric_value decimal(38,10) NOT NULL,
        display_value nvarchar(100) NOT NULL,
        comparison_label nvarchar(200) NULL,
        comparison_display_value nvarchar(100) NULL,
        trend_direction varchar(10) NULL
    );

    INSERT INTO @fixture
    (
        indicator_code, indicator_name, domain_name, business_definition,
        favorable_direction, source_code, source_name, organization_name,
        homepage_url, unit_code, unit_name, unit_symbol, frequency_code,
        frequency_name, reference_period_label, reference_period_start,
        reference_period_end, period_precision, numeric_value, display_value,
        comparison_label, comparison_display_value, trend_direction
    )
    VALUES
    (N'gdp-growth', N'GDP Growth', N'Economic activity', N'Annual percentage change in real gross domestic product.', 'UP', N'INE_NATIONAL_ACCOUNTS_DEMO', N'INE Angola - National Accounts', N'Instituto Nacional de Estatistica de Angola', N'https://www.ine.gov.ao', N'PCT_YOY', N'Percent year over year', N'%', N'ANNUAL_QUARTERLY', N'Annual / quarterly', N'2024', '2024-01-01', '2024-12-31', 'YEAR', 3.2, N'+3.2%', N'vs previous year', N'+0.8 pp', 'UP'),
    (N'inflation-rate', N'Inflation Rate', N'Prices and inflation', N'Year-over-year percentage change in the national consumer price index.', 'DOWN', N'INE_CPI_DEMO', N'INE Angola - National CPI', N'Instituto Nacional de Estatistica de Angola', N'https://www.ine.gov.ao', N'PCT_YOY', N'Percent year over year', N'%', N'MONTHLY', N'Monthly', N'2024', '2024-01-01', '2024-12-31', 'YEAR', 13.8, N'13.8%', N'vs previous period', N'-2.1 pp', 'DOWN'),
    (N'exchange-rate', N'Exchange Rate', N'Monetary and foreign exchange', N'Reference exchange rate expressed as Angolan kwanza per US dollar.', 'NEUTRAL', N'BNA_EXCHANGE_DEMO', N'Banco Nacional de Angola', N'Banco Nacional de Angola', N'https://www.bna.ao', N'AOA_PER_USD', N'Angolan kwanza per US dollar', N'AOA/USD', N'DAILY_MONTHLY', N'Daily / monthly', N'Q2 2024', '2024-04-01', '2024-06-30', 'QUARTER', 825, N'825 AOA/USD', N'Q2 vs Q1', N'+1.5%', 'UP'),
    (N'population', N'Population', N'Population and society', N'Estimated resident population for the reference year.', 'NEUTRAL', N'INE_POPULATION_DEMO', N'INE Angola - Population Statistics', N'Instituto Nacional de Estatistica de Angola', N'https://www.ine.gov.ao', N'MILLION_PEOPLE', N'Million people', N'M', N'ANNUAL', N'Annual', N'2024', '2024-01-01', '2024-12-31', 'YEAR', 35.6, N'35.6M', N'vs previous year', N'+2.9%', 'UP'),
    (N'banking-assets', N'Banking Assets', N'Banking and financial system', N'Aggregate total assets reported by the banking sector.', 'NEUTRAL', N'BNA_BANKING_DEMO', N'BNA and official bank reports', N'Banco Nacional de Angola and reporting banks', N'https://www.bna.ao', N'USD_BILLION', N'USD billion', N'USD bn', N'ANNUAL_QUARTERLY', N'Annual / quarterly', N'2024', '2024-01-01', '2024-12-31', 'YEAR', 48.2, N'$48.2B', N'vs previous year', N'+5.4%', 'UP'),
    (N'public-debt-gdp', N'Public Debt/GDP', N'Public finance', N'Gross public debt as a percentage of nominal gross domestic product.', 'DOWN', N'MINFIN_BNA_DEBT_DEMO', N'Ministry of Finance and BNA', N'Ministry of Finance of Angola and Banco Nacional de Angola', N'https://www.minfin.gov.ao', N'PCT_GDP', N'Percent of GDP', N'%', N'ANNUAL_QUARTERLY', N'Annual / quarterly', N'2024', '2024-01-01', '2024-12-31', 'YEAR', 68.4, N'68.4%', N'vs previous year', N'-3.2 pp', 'DOWN');

    IF NOT EXISTS (SELECT 1 FROM [control].[pipeline_definition] WHERE pipeline_code = N'PILOT_FIXTURE_TO_MEDALLION')
        INSERT INTO [control].[pipeline_definition](pipeline_code, pipeline_name, source_system)
        VALUES (N'PILOT_FIXTURE_TO_MEDALLION', N'Pilot fixture to Bronze Silver Gold', N'LAZA_PROTOTYPE');

    SELECT @pipeline_id = pipeline_id
    FROM [control].[pipeline_definition]
    WHERE pipeline_code = N'PILOT_FIXTURE_TO_MEDALLION';

    INSERT INTO [control].[pipeline_run](pipeline_id, run_status, trigger_type, started_at, initiated_by)
    VALUES (@pipeline_id, 'STARTED', 'MANUAL', @loaded_at, SUSER_SNAME());
    SET @pipeline_run_id = SCOPE_IDENTITY();

    INSERT INTO [control].[ingestion_batch]
    (
        pipeline_run_id, batch_code, data_classification, batch_status,
        acquired_at, loaded_at, source_record_count
    )
    VALUES
    (
        @pipeline_run_id, N'DEMO-PILOT-2024-V1', 'DEMO', 'RECEIVED',
        @loaded_at, @loaded_at, 6
    );
    SET @ingestion_batch_id = SCOPE_IDENTITY();

    INSERT INTO [reference].[source]
    (source_code, source_name, organization_name, homepage_url, source_type)
    SELECT DISTINCT
        f.source_code, f.source_name, f.organization_name, f.homepage_url, 'DEMO_FIXTURE'
    FROM @fixture AS f
    WHERE NOT EXISTS
    (
        SELECT 1 FROM [reference].[source] AS s WHERE s.source_code = f.source_code
    );

    INSERT INTO [reference].[unit](unit_code, unit_name, symbol)
    SELECT DISTINCT f.unit_code, f.unit_name, f.unit_symbol
    FROM @fixture AS f
    WHERE NOT EXISTS
    (
        SELECT 1 FROM [reference].[unit] AS u WHERE u.unit_code = f.unit_code
    );

    INSERT INTO [reference].[frequency](frequency_code, frequency_name, expected_periods_per_year)
    SELECT DISTINCT
        f.frequency_code,
        f.frequency_name,
        CASE f.frequency_code
            WHEN N'ANNUAL' THEN 1
            WHEN N'MONTHLY' THEN 12
            ELSE NULL
        END
    FROM @fixture AS f
    WHERE NOT EXISTS
    (
        SELECT 1 FROM [reference].[frequency] AS fr WHERE fr.frequency_code = f.frequency_code
    );

    IF NOT EXISTS (SELECT 1 FROM [reference].[geography] WHERE geography_code = N'AGO')
        INSERT INTO [reference].[geography](geography_code, geography_name, geography_level, iso_code)
        VALUES (N'AGO', N'Angola', 'COUNTRY', N'AO');

    INSERT INTO [bronze].[source_asset]
    (
        ingestion_batch_id, source_id, asset_type, asset_name, asset_location,
        source_version, publication_date, acquired_at, content_hash,
        content_size_bytes, metadata_json, is_official
    )
    SELECT
        @ingestion_batch_id,
        s.source_id,
        'FIXTURE',
        CONCAT(f.indicator_code, N'.json'),
        CONCAT(N'repo://src/app/data/indicators.ts#', f.indicator_code),
        N'prototype-stage-1',
        NULL,
        @loaded_at,
        HASHBYTES('SHA2_256', p.raw_payload),
        DATALENGTH(p.raw_payload),
        N'{"warning":"Demonstration value inherited from the visual prototype; not an official source asset."}',
        0
    FROM @fixture AS f
    INNER JOIN [reference].[source] AS s ON s.source_code = f.source_code
    CROSS APPLY
    (
        SELECT
            f.indicator_code AS id,
            f.indicator_name AS label,
            f.numeric_value AS numericValue,
            f.display_value AS displayValue,
            f.unit_name AS unit,
            f.reference_period_label AS period,
            f.comparison_label AS comparisonLabel,
            f.comparison_display_value AS change,
            f.trend_direction AS trend,
            f.source_name AS sourceName,
            f.homepage_url AS sourceUrl,
            'demonstration' AS status
        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    ) AS p(raw_payload);

    INSERT INTO [bronze].[raw_indicator_observation]
    (
        ingestion_batch_id, source_asset_id, source_row_number,
        source_record_key, indicator_code_raw, value_raw, unit_raw,
        period_raw, raw_payload, record_hash, bronze_status
    )
    SELECT
        @ingestion_batch_id,
        a.source_asset_id,
        1,
        f.indicator_code,
        f.indicator_code,
        f.display_value,
        f.unit_name,
        f.reference_period_label,
        p.raw_payload,
        HASHBYTES('SHA2_256', p.raw_payload),
        'ACCEPTED'
    FROM @fixture AS f
    INNER JOIN [bronze].[source_asset] AS a
        ON a.ingestion_batch_id = @ingestion_batch_id
        AND a.asset_name = CONCAT(f.indicator_code, N'.json')
    CROSS APPLY
    (
        SELECT
            f.indicator_code AS id,
            f.indicator_name AS label,
            f.numeric_value AS numericValue,
            f.display_value AS displayValue,
            f.unit_name AS unit,
            f.reference_period_label AS period,
            f.comparison_label AS comparisonLabel,
            f.comparison_display_value AS change,
            f.trend_direction AS trend,
            f.source_name AS sourceName,
            f.homepage_url AS sourceUrl,
            'demonstration' AS status
        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    ) AS p(raw_payload);

    INSERT INTO [silver].[indicator]
    (indicator_code, indicator_name, domain_name, business_definition, favorable_direction)
    SELECT
        f.indicator_code, f.indicator_name, f.domain_name,
        f.business_definition, f.favorable_direction
    FROM @fixture AS f
    WHERE NOT EXISTS
    (
        SELECT 1 FROM [silver].[indicator] AS i WHERE i.indicator_code = f.indicator_code
    );

    INSERT INTO [silver].[indicator_series]
    (
        series_code, indicator_id, source_id, unit_id, frequency_id,
        geography_id, methodology_version, methodology_notes, series_status
    )
    SELECT
        CONCAT(UPPER(REPLACE(f.indicator_code, N'-', N'_')), N'_AGO_DEMO'),
        i.indicator_id,
        s.source_id,
        u.unit_id,
        fr.frequency_id,
        g.geography_id,
        N'prototype-stage-1',
        N'Demonstration contract inherited from the visual prototype; official methodology pending.',
        'DEMONSTRATION'
    FROM @fixture AS f
    INNER JOIN [silver].[indicator] AS i ON i.indicator_code = f.indicator_code
    INNER JOIN [reference].[source] AS s ON s.source_code = f.source_code
    INNER JOIN [reference].[unit] AS u ON u.unit_code = f.unit_code
    INNER JOIN [reference].[frequency] AS fr ON fr.frequency_code = f.frequency_code
    CROSS JOIN [reference].[geography] AS g
    WHERE g.geography_code = N'AGO'
      AND NOT EXISTS
      (
          SELECT 1
          FROM [silver].[indicator_series] AS existing_series
          WHERE existing_series.series_code = CONCAT(UPPER(REPLACE(f.indicator_code, N'-', N'_')), N'_AGO_DEMO')
      );

    INSERT INTO [silver].[observation]
    (
        series_id, ingestion_batch_id, source_asset_id, raw_observation_id,
        reference_period_label, reference_period_start, reference_period_end,
        period_precision, numeric_value, display_value, comparison_label,
        comparison_display_value, trend_direction, publication_date,
        quality_status, publication_status, is_official, observation_hash
    )
    SELECT
        ser.series_id,
        @ingestion_batch_id,
        a.source_asset_id,
        r.raw_observation_id,
        f.reference_period_label,
        f.reference_period_start,
        f.reference_period_end,
        f.period_precision,
        f.numeric_value,
        f.display_value,
        f.comparison_label,
        f.comparison_display_value,
        f.trend_direction,
        NULL,
        'WARNING',
        'DEMONSTRATION',
        0,
        HASHBYTES
        (
            'SHA2_256',
            CONCAT(f.indicator_code, N'|', CONVERT(nvarchar(30), f.reference_period_start, 126), N'|',
                   CONVERT(nvarchar(30), f.reference_period_end, 126), N'|',
                   CONVERT(nvarchar(100), f.numeric_value), N'|prototype-stage-1')
        )
    FROM @fixture AS f
    INNER JOIN [silver].[indicator_series] AS ser
        ON ser.series_code = CONCAT(UPPER(REPLACE(f.indicator_code, N'-', N'_')), N'_AGO_DEMO')
    INNER JOIN [bronze].[source_asset] AS a
        ON a.ingestion_batch_id = @ingestion_batch_id
        AND a.asset_name = CONCAT(f.indicator_code, N'.json')
    INNER JOIN [bronze].[raw_indicator_observation] AS r
        ON r.ingestion_batch_id = @ingestion_batch_id
        AND r.source_record_key = f.indicator_code;

    DECLARE @rules TABLE
    (
        rule_code nvarchar(100),
        rule_name nvarchar(250),
        quality_dimension varchar(20),
        default_severity varchar(10),
        rule_expression nvarchar(4000)
    );

    INSERT INTO @rules VALUES
    (N'REQUIRED_OBSERVATION_FIELDS', N'Required observation fields are populated', 'COMPLETENESS', 'CRITICAL', N'indicator, value, unit and reference period must be populated'),
    (N'BRONZE_PAYLOAD_VALID_JSON', N'Bronze payload is valid JSON', 'VALIDITY', 'HIGH', N'ISJSON(raw_payload) = 1'),
    (N'OFFICIAL_SOURCE_EVIDENCE', N'Official values have exact source evidence', 'INTEGRITY', 'CRITICAL', N'official values require publication date, version and SHA-256 hash');

    INSERT INTO [dq].[rule](rule_code, rule_name, quality_dimension, default_severity)
    SELECT r.rule_code, r.rule_name, r.quality_dimension, r.default_severity
    FROM @rules AS r
    WHERE NOT EXISTS (SELECT 1 FROM [dq].[rule] AS existing_rule WHERE existing_rule.rule_code = r.rule_code);

    INSERT INTO [dq].[rule_version]
    (rule_id, version_number, rule_expression, effective_from, is_current)
    SELECT dr.rule_id, 1, r.rule_expression, @loaded_at, 1
    FROM @rules AS r
    INNER JOIN [dq].[rule] AS dr ON dr.rule_code = r.rule_code
    WHERE NOT EXISTS
    (
        SELECT 1 FROM [dq].[rule_version] AS rv
        WHERE rv.rule_id = dr.rule_id AND rv.version_number = 1
    );

    INSERT INTO [dq].[execution]
    (pipeline_run_id, ingestion_batch_id, execution_status, started_at, ended_at)
    VALUES (@pipeline_run_id, @ingestion_batch_id, 'WARNING', @loaded_at, SYSUTCDATETIME());
    SET @dq_execution_id = SCOPE_IDENTITY();

    INSERT INTO [dq].[result]
    (dq_execution_id, rule_version_id, observation_id, raw_observation_id, result_status, observed_value, result_message)
    SELECT
        @dq_execution_id,
        rv.rule_version_id,
        o.observation_id,
        o.raw_observation_id,
        CASE WHEN dr.rule_code = N'OFFICIAL_SOURCE_EVIDENCE' THEN 'WARN' ELSE 'PASS' END,
        CASE WHEN dr.rule_code = N'OFFICIAL_SOURCE_EVIDENCE' THEN N'is_official=0' ELSE N'valid' END,
        CASE WHEN dr.rule_code = N'OFFICIAL_SOURCE_EVIDENCE'
            THEN N'Demo fixture is permitted for POC but cannot be promoted to official publication.'
            ELSE N'Rule passed for the controlled demo fixture.'
        END
    FROM [silver].[observation] AS o
    CROSS JOIN [dq].[rule] AS dr
    INNER JOIN [dq].[rule_version] AS rv ON rv.rule_id = dr.rule_id AND rv.is_current = 1
    WHERE o.ingestion_batch_id = @ingestion_batch_id
      AND dr.rule_code IN (N'REQUIRED_OBSERVATION_FIELDS', N'BRONZE_PAYLOAD_VALID_JSON', N'OFFICIAL_SOURCE_EVIDENCE');

    INSERT INTO [dq].[indicator_score]
    (dq_execution_id, observation_id, quality_score, passed_rules, warning_rules, failed_rules)
    SELECT @dq_execution_id, o.observation_id, 83.33, 2, 1, 0
    FROM [silver].[observation] AS o
    WHERE o.ingestion_batch_id = @ingestion_batch_id;

    INSERT INTO [dq].[approval]
    (observation_id, decision, decision_scope, decision_notes, decided_by)
    SELECT
        o.observation_id,
        'APPROVE',
        'DEMO',
        N'Approved only for technical POC display. Not approved as an official statistic.',
        N'LAZA_DEMO_SEED'
    FROM [silver].[observation] AS o
    WHERE o.ingestion_batch_id = @ingestion_batch_id;

    INSERT INTO [gold].[dim_indicator]
    (silver_indicator_id, indicator_code, indicator_name, domain_name, business_definition, favorable_direction, is_active)
    SELECT i.indicator_id, i.indicator_code, i.indicator_name, i.domain_name, i.business_definition, i.favorable_direction, i.is_active
    FROM [silver].[indicator] AS i
    WHERE EXISTS (SELECT 1 FROM @fixture AS f WHERE f.indicator_code = i.indicator_code)
      AND NOT EXISTS (SELECT 1 FROM [gold].[dim_indicator] AS gi WHERE gi.silver_indicator_id = i.indicator_id);

    INSERT INTO [gold].[dim_source]
    (silver_source_id, source_code, source_name, organization_name, homepage_url)
    SELECT s.source_id, s.source_code, s.source_name, s.organization_name, s.homepage_url
    FROM [reference].[source] AS s
    WHERE EXISTS (SELECT 1 FROM @fixture AS f WHERE f.source_code = s.source_code)
      AND NOT EXISTS (SELECT 1 FROM [gold].[dim_source] AS gs WHERE gs.silver_source_id = s.source_id);

    INSERT INTO [gold].[dim_unit]
    (silver_unit_id, unit_code, unit_name, symbol)
    SELECT u.unit_id, u.unit_code, u.unit_name, u.symbol
    FROM [reference].[unit] AS u
    WHERE EXISTS (SELECT 1 FROM @fixture AS f WHERE f.unit_code = u.unit_code)
      AND NOT EXISTS (SELECT 1 FROM [gold].[dim_unit] AS gu WHERE gu.silver_unit_id = u.unit_id);

    INSERT INTO [gold].[dim_geography]
    (silver_geography_id, geography_code, geography_name, geography_level, iso_code)
    SELECT g.geography_id, g.geography_code, g.geography_name, g.geography_level, g.iso_code
    FROM [reference].[geography] AS g
    WHERE g.geography_code = N'AGO'
      AND NOT EXISTS (SELECT 1 FROM [gold].[dim_geography] AS gg WHERE gg.silver_geography_id = g.geography_id);

    INSERT INTO [gold].[dim_series]
    (silver_series_id, series_code, frequency_code, frequency_name, methodology_version)
    SELECT ser.series_id, ser.series_code, fr.frequency_code, fr.frequency_name, ser.methodology_version
    FROM [silver].[indicator_series] AS ser
    INNER JOIN [reference].[frequency] AS fr ON fr.frequency_id = ser.frequency_id
    WHERE EXISTS
    (
        SELECT 1 FROM [silver].[observation] AS o
        WHERE o.series_id = ser.series_id AND o.ingestion_batch_id = @ingestion_batch_id
    )
      AND NOT EXISTS (SELECT 1 FROM [gold].[dim_series] AS gs WHERE gs.silver_series_id = ser.series_id);

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
        SELECT reference_period_start AS full_date FROM @fixture
        UNION
        SELECT reference_period_end AS full_date FROM @fixture
    ) AS d
    WHERE NOT EXISTS
    (
        SELECT 1 FROM [gold].[dim_date] AS gd WHERE gd.full_date = d.full_date
    );

    INSERT INTO [gold].[fact_indicator_observation]
    (
        silver_observation_id, indicator_key, series_key, source_key, unit_key,
        geography_key, period_start_date_key, period_end_date_key,
        reference_period_label, numeric_value, display_value, comparison_label,
        comparison_display_value, trend_direction, quality_status, quality_score,
        publication_status, is_official, source_asset_id
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
        'DEMONSTRATION',
        0,
        o.source_asset_id
    FROM [silver].[observation] AS o
    INNER JOIN [silver].[indicator_series] AS ser ON ser.series_id = o.series_id
    INNER JOIN [gold].[dim_indicator] AS gi ON gi.silver_indicator_id = ser.indicator_id
    INNER JOIN [gold].[dim_series] AS gser ON gser.silver_series_id = ser.series_id
    INNER JOIN [gold].[dim_source] AS gsrc ON gsrc.silver_source_id = ser.source_id
    INNER JOIN [gold].[dim_unit] AS gu ON gu.silver_unit_id = ser.unit_id
    INNER JOIN [gold].[dim_geography] AS gg ON gg.silver_geography_id = ser.geography_id
    INNER JOIN [gold].[dim_date] AS ds ON ds.full_date = o.reference_period_start
    INNER JOIN [gold].[dim_date] AS de ON de.full_date = o.reference_period_end
    LEFT JOIN [dq].[indicator_score] AS score
        ON score.observation_id = o.observation_id AND score.dq_execution_id = @dq_execution_id
    WHERE o.ingestion_batch_id = @ingestion_batch_id
      AND EXISTS
      (
          SELECT 1 FROM [dq].[approval] AS a
          WHERE a.observation_id = o.observation_id
            AND a.decision = 'APPROVE'
            AND a.decision_scope = 'DEMO'
      );

    UPDATE [control].[ingestion_batch]
    SET batch_status = 'VALIDATED', accepted_record_count = 6, rejected_record_count = 0
    WHERE ingestion_batch_id = @ingestion_batch_id;

    UPDATE [control].[pipeline_run]
    SET run_status = 'SUCCEEDED', ended_at = SYSUTCDATETIME(),
        rows_read = 6, rows_written = 6, rows_rejected = 0
    WHERE pipeline_run_id = @pipeline_run_id;

    INSERT INTO [audit].[pipeline_event]
    (pipeline_run_id, ingestion_batch_id, event_type, event_level, event_message, event_context)
    VALUES
    (
        @pipeline_run_id,
        @ingestion_batch_id,
        'DEMO_SEED_COMPLETED',
        'WARN',
        N'Six prototype values loaded through Bronze, Silver, DQ and Gold as demonstration data.',
        N'{"isOfficial":false,"publicationStatus":"DEMONSTRATION","recordCount":6}'
    );

    COMMIT TRANSACTION;

    SELECT
        @pipeline_run_id AS pipeline_run_id,
        @ingestion_batch_id AS ingestion_batch_id,
        @dq_execution_id AS dq_execution_id,
        6 AS demo_observations_loaded;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO
