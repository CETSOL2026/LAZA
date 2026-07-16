/*
LAZA SQL Server - finalize archive paths after the filesystem move
This script updates Bronze lineage paths only.
*/
USE [LAZA_DATA_PLATFORM_DEV];
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

DECLARE @batch_id bigint =
(
    SELECT ingestion_batch_id
    FROM [control].[ingestion_batch]
    WHERE batch_code = N'INE-IPCN-2026-06-20260716-V1'
);

IF @batch_id IS NULL
    THROW 51012, 'INE IPCN Bronze batch was not found.', 1;

IF NOT EXISTS
(
    SELECT 1
    FROM [bronze].[source_asset]
    WHERE ingestion_batch_id = @batch_id
      AND asset_location LIKE N'D:\LAZA_DATA\landing\%'
)
BEGIN
    PRINT 'All source assets already reference archive paths. No rows were changed.';
    RETURN;
END;

BEGIN TRY
    BEGIN TRANSACTION;

    UPDATE [bronze].[source_asset]
    SET asset_location =
        CASE asset_name
            WHEN N'ine_ipcn_2026-06_publication.pdf'
                THEN N'D:\LAZA_DATA\archive\ine\inflation\ine_ipcn_2026-06_publication.pdf'
            WHEN N'ine_ipcn_methodology_acquired_2026-07-16.pdf'
                THEN N'D:\LAZA_DATA\archive\ine\inflation\ine_ipcn_methodology_acquired_2026-07-16.pdf'
            WHEN N'ine_ipcn_2026-04_structured.xlsx'
                THEN N'D:\LAZA_DATA\archive\ine\inflation\ine_ipcn_2026-04_structured.xlsx'
            ELSE asset_location
        END
    WHERE ingestion_batch_id = @batch_id;

    INSERT INTO [audit].[pipeline_event]
    (
        pipeline_run_id,
        ingestion_batch_id,
        event_type,
        event_level,
        event_message,
        event_context
    )
    SELECT
        batch.pipeline_run_id,
        batch.ingestion_batch_id,
        'SOURCE_ASSETS_ARCHIVED',
        'INFO',
        N'INE IPCN source assets moved from landing to immutable archive paths.',
        N'{"assetCount":3,"archiveRoot":"D:\\LAZA_DATA\\archive\\ine\\inflation"}'
    FROM [control].[ingestion_batch] AS batch
    WHERE batch.ingestion_batch_id = @batch_id;

    COMMIT TRANSACTION;

    SELECT source_asset_id, asset_name, asset_location
    FROM [bronze].[source_asset]
    WHERE ingestion_batch_id = @batch_id
    ORDER BY source_asset_id;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO

