/*
LAZA SQL Server - accept the 12 IPCN 2021 reconciliation limitations.

The original DQ WARN results remain immutable evidence. An APPROVED exception
is attached to each result, and the Silver observations are released as PASSED
with exception. This script does not create an OFFICIAL approval or write Gold.
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
);
DECLARE @dq_execution_id bigint =
(
    SELECT MAX(e.dq_execution_id)
    FROM [dq].[execution] AS e
    INNER JOIN [control].[pipeline_run] AS pr ON pr.pipeline_run_id = e.pipeline_run_id
    INNER JOIN [control].[pipeline_definition] AS pd ON pd.pipeline_id = pr.pipeline_id
    WHERE pd.pipeline_code = N'INE_IPCN_BRONZE_TO_SILVER'
);

IF @series_id IS NULL OR @dq_execution_id IS NULL
    THROW 51030, 'Validated IPCN Silver series or DQ execution was not found.', 1;

DECLARE @warning_count int =
(
    SELECT COUNT(*)
    FROM [dq].[result] AS dr
    INNER JOIN [dq].[rule_version] AS rv ON rv.rule_version_id = dr.rule_version_id
    INNER JOIN [dq].[rule] AS rul ON rul.rule_id = rv.rule_id
    INNER JOIN [silver].[observation] AS o ON o.observation_id = dr.observation_id
    WHERE dr.dq_execution_id = @dq_execution_id
      AND rul.rule_code = N'IPCN_YOY_RECONCILIATION'
      AND dr.result_status = 'WARN'
      AND o.series_id = @series_id
      AND o.reference_period_start >= '2021-01-01'
      AND o.reference_period_start < '2022-01-01'
);

DECLARE @approved_count int =
(
    SELECT COUNT(*)
    FROM [dq].[exception] AS ex
    INNER JOIN [dq].[result] AS dr ON dr.dq_result_id = ex.dq_result_id
    WHERE dr.dq_execution_id = @dq_execution_id
      AND ex.exception_status = 'APPROVED'
);

IF @warning_count <> 12
    THROW 51031, 'Expected exactly 12 IPCN 2021 reconciliation warnings.', 1;

IF @approved_count = 12
BEGIN
    PRINT 'The 12 IPCN 2021 reconciliation exceptions are already approved. No rows were changed.';
    SELECT @series_id AS series_id, @dq_execution_id AS dq_execution_id, @approved_count AS approved_exceptions;
    RETURN;
END;
IF @approved_count <> 0
    THROW 51032, 'Partial exception approval found. Manual review is required.', 1;

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @pipeline_id int;
    DECLARE @pipeline_run_id bigint;
    DECLARE @ingestion_batch_id bigint;
    DECLARE @started_at datetime2(3) = SYSUTCDATETIME();

    SELECT @ingestion_batch_id = e.ingestion_batch_id
    FROM [dq].[execution] AS e
    WHERE e.dq_execution_id = @dq_execution_id;

    IF NOT EXISTS
    (
        SELECT 1 FROM [control].[pipeline_definition]
        WHERE pipeline_code = N'INE_IPCN_DQ_EXCEPTION_ACCEPTANCE'
    )
        INSERT INTO [control].[pipeline_definition]
        (pipeline_code, pipeline_name, source_system)
        VALUES
        (N'INE_IPCN_DQ_EXCEPTION_ACCEPTANCE', N'INE IPCN 2021 DQ exception acceptance', N'INE_ANGOLA');

    SELECT @pipeline_id = pipeline_id
    FROM [control].[pipeline_definition]
    WHERE pipeline_code = N'INE_IPCN_DQ_EXCEPTION_ACCEPTANCE';

    INSERT INTO [control].[pipeline_run]
    (pipeline_id, run_status, trigger_type, started_at, initiated_by)
    VALUES (@pipeline_id, 'STARTED', 'MANUAL', @started_at, SUSER_SNAME());
    SET @pipeline_run_id = SCOPE_IDENTITY();

    INSERT INTO [dq].[exception]
    (
        dq_result_id, exception_status, justification,
        requested_by, requested_at, resolved_by, resolved_at
    )
    SELECT
        dr.dq_result_id,
        'APPROVED',
        N'Accepted limitation: the official IPCN table begins in January 2021 and no 2020 index levels exist in the available source. Completeness and uniqueness passed; the published 2021 YoY values are retained with explicit lineage and exception evidence.',
        SUSER_SNAME(),
        @started_at,
        SUSER_SNAME(),
        SYSUTCDATETIME()
    FROM [dq].[result] AS dr
    INNER JOIN [dq].[rule_version] AS rv ON rv.rule_version_id = dr.rule_version_id
    INNER JOIN [dq].[rule] AS rul ON rul.rule_id = rv.rule_id
    INNER JOIN [silver].[observation] AS o ON o.observation_id = dr.observation_id
    WHERE dr.dq_execution_id = @dq_execution_id
      AND rul.rule_code = N'IPCN_YOY_RECONCILIATION'
      AND dr.result_status = 'WARN'
      AND o.series_id = @series_id
      AND o.reference_period_start >= '2021-01-01'
      AND o.reference_period_start < '2022-01-01';

    IF @@ROWCOUNT <> 12
        THROW 51033, 'Exception insertion did not affect exactly 12 rows.', 1;

    UPDATE o
    SET quality_status = 'PASSED'
    FROM [silver].[observation] AS o
    WHERE o.series_id = @series_id
      AND o.reference_period_start >= '2021-01-01'
      AND o.reference_period_start < '2022-01-01'
      AND o.quality_status = 'WARNING'
      AND EXISTS
      (
          SELECT 1
          FROM [dq].[result] AS dr
          INNER JOIN [dq].[exception] AS ex ON ex.dq_result_id = dr.dq_result_id
          WHERE dr.observation_id = o.observation_id
            AND dr.dq_execution_id = @dq_execution_id
            AND ex.exception_status = 'APPROVED'
      );

    IF @@ROWCOUNT <> 12
        THROW 51034, 'Silver release did not affect exactly 12 observations.', 1;

    UPDATE [control].[pipeline_run]
    SET run_status = 'SUCCEEDED', ended_at = SYSUTCDATETIME(),
        rows_read = 12, rows_written = 24, rows_rejected = 0
    WHERE pipeline_run_id = @pipeline_run_id;

    INSERT INTO [audit].[pipeline_event]
    (pipeline_run_id, ingestion_batch_id, event_type, event_level, event_message, event_context)
    VALUES
    (
        @pipeline_run_id, @ingestion_batch_id, 'IPCN_DQ_EXCEPTION_ACCEPTED', 'WARN',
        N'The 12 IPCN 2021 homologue-reconciliation limitations were accepted because no 2020 index levels exist. Original DQ warnings were preserved and Silver observations were released as passed with exception.',
        N'{"approvedExceptions":12,"affectedPeriodStart":"2021-01","affectedPeriodEnd":"2021-12","originalDqWarningsPreserved":true,"silverQualityStatus":"PASSED","officialApprovals":0,"goldWrites":0}'
    );

    COMMIT TRANSACTION;

    SELECT
        @pipeline_run_id AS pipeline_run_id,
        @series_id AS series_id,
        @dq_execution_id AS dq_execution_id,
        12 AS approved_exceptions,
        12 AS silver_observations_released,
        0 AS gold_rows_written;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO
