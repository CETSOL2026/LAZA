/*
LAZA SQL Server - first official-source Bronze ingestion
Source: INE Angola IPCN, June 2026

This script registers three acquired assets and one raw headline observation.
It does not write to Silver, DQ or Gold.
*/
USE [LAZA_DATA_PLATFORM_DEV];
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID(N'bronze.source_asset', N'U') IS NULL
    THROW 51010, 'Required Bronze tables do not exist.', 1;

IF EXISTS
(
    SELECT 1
    FROM [control].[ingestion_batch]
    WHERE batch_code = N'INE-IPCN-2026-06-20260716-V1'
)
BEGIN
    PRINT 'Batch INE-IPCN-2026-06-20260716-V1 already exists. No rows were changed.';
    SELECT
        ingestion_batch_id,
        batch_code,
        data_classification,
        batch_status,
        source_record_count,
        accepted_record_count,
        rejected_record_count
    FROM [control].[ingestion_batch]
    WHERE batch_code = N'INE-IPCN-2026-06-20260716-V1';
    RETURN;
END;

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @pipeline_id int;
    DECLARE @pipeline_run_id bigint;
    DECLARE @ingestion_batch_id bigint;
    DECLARE @source_id int;
    DECLARE @publication_asset_id bigint;
    DECLARE @raw_payload nvarchar(max);
    DECLARE @acquired_at datetime2(3) = '2026-07-16T11:55:32.290';

    IF NOT EXISTS
    (
        SELECT 1 FROM [control].[pipeline_definition]
        WHERE pipeline_code = N'INE_IPCN_TO_BRONZE'
    )
        INSERT INTO [control].[pipeline_definition]
        (pipeline_code, pipeline_name, source_system)
        VALUES
        (N'INE_IPCN_TO_BRONZE', N'INE IPCN official assets to Bronze', N'INE_ANGOLA');

    SELECT @pipeline_id = pipeline_id
    FROM [control].[pipeline_definition]
    WHERE pipeline_code = N'INE_IPCN_TO_BRONZE';

    INSERT INTO [control].[pipeline_run]
    (pipeline_id, run_status, trigger_type, started_at, initiated_by)
    VALUES
    (@pipeline_id, 'STARTED', 'MANUAL', SYSUTCDATETIME(), SUSER_SNAME());
    SET @pipeline_run_id = SCOPE_IDENTITY();

    INSERT INTO [control].[ingestion_batch]
    (
        pipeline_run_id,
        batch_code,
        data_classification,
        batch_status,
        acquired_at,
        loaded_at,
        source_record_count
    )
    VALUES
    (
        @pipeline_run_id,
        N'INE-IPCN-2026-06-20260716-V1',
        'OFFICIAL',
        'RECEIVED',
        @acquired_at,
        SYSUTCDATETIME(),
        1
    );
    SET @ingestion_batch_id = SCOPE_IDENTITY();

    IF NOT EXISTS (SELECT 1 FROM [reference].[source] WHERE source_code = N'INE_IPCN')
        INSERT INTO [reference].[source]
        (source_code, source_name, organization_name, homepage_url, source_type)
        VALUES
        (
            N'INE_IPCN',
            N'Indice de Precos no Consumidor Nacional',
            N'Instituto Nacional de Estatistica de Angola',
            N'https://www.ine.gov.ao',
            'OFFICIAL'
        );

    SELECT @source_id = source_id
    FROM [reference].[source]
    WHERE source_code = N'INE_IPCN';

    INSERT INTO [bronze].[source_asset]
    (
        ingestion_batch_id,
        source_id,
        asset_type,
        asset_name,
        asset_location,
        source_version,
        publication_date,
        acquired_at,
        content_hash,
        content_size_bytes,
        metadata_json,
        is_official
    )
    VALUES
    (
        @ingestion_batch_id,
        @source_id,
        'PDF',
        N'ine_ipcn_2026-06_publication.pdf',
        N'D:\LAZA_DATA\landing\ine\inflation\ine_ipcn_2026-06_publication.pdf',
        N'IPCN-NI-06-2026',
        '2026-07-08',
        '2026-07-16T11:55:32.290',
        CONVERT(varbinary(32), '6FBE028FEC975118CD759A8D363D8EAB6EF8CC8D7AE48924F7BD987C3F30CABC', 2),
        483741,
        N'{"role":"LATEST_OFFICIAL_PUBLICATION","assetUrl":"https://www.ine.gov.ao/Arquivos/arquivosCarregados//Carregados/Publicacao_639191384529857836.pdf","publicationPage":"https://www.ine.gov.ao/publicacoes/detalhes/NTU0ODQ%3D","referencePeriod":"2026-06","pageCount":3}',
        1
    ),
    (
        @ingestion_batch_id,
        @source_id,
        'PDF',
        N'ine_ipcn_methodology_acquired_2026-07-16.pdf',
        N'D:\LAZA_DATA\landing\ine\inflation\ine_ipcn_methodology_acquired_2026-07-16.pdf',
        N'IPCN-METHODOLOGY-BASE-DEC-2020',
        NULL,
        '2026-07-16T11:55:33.298',
        CONVERT(varbinary(32), 'EAE4ED5CF64D4E36E7B649B1C4FC25987B5951569117DEF747DDB6EE843A35BD', 2),
        553385,
        N'{"role":"OFFICIAL_METHODOLOGY","assetUrl":"https://www.ine.gov.ao/Arquivos/arquivosCarregados//Carregados/Publicacao_639195868345772229.pdf","officialDomain":true,"publicationDateStatus":"UNKNOWN","documentCreatedAt":"2025-08-11T18:58:48+01:00","pageCount":5}',
        0
    ),
    (
        @ingestion_batch_id,
        @source_id,
        'XLSX',
        N'ine_ipcn_2026-04_structured.xlsx',
        N'D:\LAZA_DATA\landing\ine\inflation\ine_ipcn_2026-04_structured.xlsx',
        N'IPCN-2026-04-XLSX',
        '2026-05-08',
        '2026-07-16T11:55:33.595',
        CONVERT(varbinary(32), 'A9DE9AD2D7553F10BCF6641998EF5F3D14F30ED9B407403578A6C6C99D9ABB5D', 2),
        55592,
        N'{"role":"STRUCTURED_REFERENCE_PREVIOUS_EDITION","assetUrl":"https://www.ine.gov.ao/Arquivos/arquivosCarregados//Carregados/Publicacao_639141014709855120.xlsx","publicationPage":"https://www.ine.gov.ao/publicacoes/detalhes/NTM0Nzk%3D","referencePeriod":"2026-04","workbookInspection":"PENDING"}',
        1
    );

    SELECT @publication_asset_id = source_asset_id
    FROM [bronze].[source_asset]
    WHERE ingestion_batch_id = @ingestion_batch_id
      AND asset_name = N'ine_ipcn_2026-06_publication.pdf';

    SET @raw_payload =
    (
        SELECT
            N'inflation-rate' AS indicatorCode,
            N'AGO' AS geographyCode,
            N'2026-06' AS referencePeriod,
            CAST(10.11 AS decimal(9,2)) AS yearOverYearPercent,
            CAST(264.79 AS decimal(12,2)) AS indexValue,
            CAST(240.47 AS decimal(12,2)) AS priorYearIndexValue,
            N'December 2020 = 100' AS indexBase,
            N'monthly' AS frequency,
            N'Indice de Precos no Consumidor Nacional' AS sourceSeries,
            N'IPCN-NI-06-2026' AS sourceVersion,
            N'https://www.ine.gov.ao/publicacoes/detalhes/NTU0ODQ%3D' AS publicationPage,
            N'ine_ipcn_2026-06_publication.pdf' AS sourceAsset
        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    );

    INSERT INTO [bronze].[raw_indicator_observation]
    (
        ingestion_batch_id,
        source_asset_id,
        source_row_number,
        source_record_key,
        indicator_code_raw,
        value_raw,
        unit_raw,
        period_raw,
        raw_payload,
        record_hash,
        bronze_status
    )
    VALUES
    (
        @ingestion_batch_id,
        @publication_asset_id,
        1,
        N'inflation-rate|AGO|2026-06|YOY',
        N'inflation-rate',
        N'10.11',
        N'percent year over year',
        N'2026-06',
        @raw_payload,
        HASHBYTES('SHA2_256', @raw_payload),
        'ACCEPTED'
    );

    UPDATE [control].[ingestion_batch]
    SET
        batch_status = 'LOADED',
        accepted_record_count = 1,
        rejected_record_count = 0
    WHERE ingestion_batch_id = @ingestion_batch_id;

    UPDATE [control].[pipeline_run]
    SET
        run_status = 'SUCCEEDED',
        ended_at = SYSUTCDATETIME(),
        rows_read = 1,
        rows_written = 1,
        rows_rejected = 0
    WHERE pipeline_run_id = @pipeline_run_id;

    INSERT INTO [audit].[pipeline_event]
    (
        pipeline_run_id,
        ingestion_batch_id,
        event_type,
        event_level,
        event_message,
        event_context
    )
    VALUES
    (
        @pipeline_run_id,
        @ingestion_batch_id,
        'OFFICIAL_BRONZE_LOAD_COMPLETED',
        'INFO',
        N'INE IPCN June 2026 assets and headline observation loaded to Bronze.',
        N'{"assetCount":3,"rawObservationCount":1,"silverWrites":0,"goldWrites":0,"publicationStatus":"BRONZE_ONLY"}'
    );

    COMMIT TRANSACTION;

    SELECT
        @pipeline_run_id AS pipeline_run_id,
        @ingestion_batch_id AS ingestion_batch_id,
        @publication_asset_id AS publication_asset_id,
        3 AS assets_loaded,
        1 AS raw_observations_loaded;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO

