/*
LAZA SQL Server POC - control and audit structures
APPROVAL REQUIRED BEFORE EXECUTION.
*/
USE [LAZA_DATA_PLATFORM_DEV];
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID(N'control.pipeline_definition', N'U') IS NULL
BEGIN
    CREATE TABLE [control].[pipeline_definition]
    (
        pipeline_id int IDENTITY(1,1) NOT NULL,
        pipeline_code nvarchar(100) NOT NULL,
        pipeline_name nvarchar(200) NOT NULL,
        source_system nvarchar(100) NOT NULL,
        is_active bit NOT NULL CONSTRAINT DF_pipeline_definition_is_active DEFAULT (1),
        created_at datetime2(3) NOT NULL CONSTRAINT DF_pipeline_definition_created_at DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_pipeline_definition PRIMARY KEY CLUSTERED (pipeline_id),
        CONSTRAINT UQ_pipeline_definition_code UNIQUE (pipeline_code)
    );
END;
GO

IF OBJECT_ID(N'control.pipeline_run', N'U') IS NULL
BEGIN
    CREATE TABLE [control].[pipeline_run]
    (
        pipeline_run_id bigint IDENTITY(1,1) NOT NULL,
        pipeline_id int NOT NULL,
        run_correlation_id uniqueidentifier NOT NULL CONSTRAINT DF_pipeline_run_correlation DEFAULT (NEWSEQUENTIALID()),
        run_status varchar(20) NOT NULL,
        trigger_type varchar(20) NOT NULL,
        started_at datetime2(3) NOT NULL CONSTRAINT DF_pipeline_run_started DEFAULT (SYSUTCDATETIME()),
        ended_at datetime2(3) NULL,
        rows_read bigint NULL,
        rows_written bigint NULL,
        rows_rejected bigint NULL,
        error_message nvarchar(4000) NULL,
        initiated_by sysname NOT NULL CONSTRAINT DF_pipeline_run_initiated_by DEFAULT (SUSER_SNAME()),
        CONSTRAINT PK_pipeline_run PRIMARY KEY CLUSTERED (pipeline_run_id),
        CONSTRAINT FK_pipeline_run_definition FOREIGN KEY (pipeline_id) REFERENCES [control].[pipeline_definition](pipeline_id),
        CONSTRAINT UQ_pipeline_run_correlation UNIQUE (run_correlation_id),
        CONSTRAINT CK_pipeline_run_status CHECK (run_status IN ('STARTED','SUCCEEDED','FAILED','CANCELLED')),
        CONSTRAINT CK_pipeline_run_trigger CHECK (trigger_type IN ('MANUAL','SCHEDULED','API','REPROCESS')),
        CONSTRAINT CK_pipeline_run_dates CHECK (ended_at IS NULL OR ended_at >= started_at)
    );
END;
GO

IF OBJECT_ID(N'control.ingestion_batch', N'U') IS NULL
BEGIN
    CREATE TABLE [control].[ingestion_batch]
    (
        ingestion_batch_id bigint IDENTITY(1,1) NOT NULL,
        pipeline_run_id bigint NOT NULL,
        batch_code nvarchar(150) NOT NULL,
        data_classification varchar(20) NOT NULL,
        batch_status varchar(20) NOT NULL,
        acquired_at datetime2(3) NOT NULL,
        loaded_at datetime2(3) NOT NULL CONSTRAINT DF_ingestion_batch_loaded_at DEFAULT (SYSUTCDATETIME()),
        source_record_count bigint NULL,
        accepted_record_count bigint NULL,
        rejected_record_count bigint NULL,
        CONSTRAINT PK_ingestion_batch PRIMARY KEY CLUSTERED (ingestion_batch_id),
        CONSTRAINT FK_ingestion_batch_run FOREIGN KEY (pipeline_run_id) REFERENCES [control].[pipeline_run](pipeline_run_id),
        CONSTRAINT UQ_ingestion_batch_code UNIQUE (batch_code),
        CONSTRAINT CK_ingestion_batch_classification CHECK (data_classification IN ('DEMO','OFFICIAL','THIRD_PARTY')),
        CONSTRAINT CK_ingestion_batch_status CHECK (batch_status IN ('RECEIVED','LOADED','VALIDATED','REJECTED'))
    );
END;
GO

IF OBJECT_ID(N'audit.pipeline_event', N'U') IS NULL
BEGIN
    CREATE TABLE [audit].[pipeline_event]
    (
        pipeline_event_id bigint IDENTITY(1,1) NOT NULL,
        pipeline_run_id bigint NULL,
        ingestion_batch_id bigint NULL,
        event_type varchar(40) NOT NULL,
        event_level varchar(10) NOT NULL,
        event_message nvarchar(2000) NOT NULL,
        event_context nvarchar(max) NULL,
        occurred_at datetime2(3) NOT NULL CONSTRAINT DF_pipeline_event_occurred DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_pipeline_event PRIMARY KEY CLUSTERED (pipeline_event_id),
        CONSTRAINT FK_pipeline_event_run FOREIGN KEY (pipeline_run_id) REFERENCES [control].[pipeline_run](pipeline_run_id),
        CONSTRAINT FK_pipeline_event_batch FOREIGN KEY (ingestion_batch_id) REFERENCES [control].[ingestion_batch](ingestion_batch_id),
        CONSTRAINT CK_pipeline_event_level CHECK (event_level IN ('INFO','WARN','ERROR')),
        CONSTRAINT CK_pipeline_event_context_json CHECK (event_context IS NULL OR ISJSON(event_context) = 1)
    );
END;
GO

IF OBJECT_ID(N'audit.rejected_record', N'U') IS NULL
BEGIN
    CREATE TABLE [audit].[rejected_record]
    (
        rejected_record_id bigint IDENTITY(1,1) NOT NULL,
        ingestion_batch_id bigint NOT NULL,
        source_record_key nvarchar(300) NULL,
        rejection_stage varchar(20) NOT NULL,
        rejection_code nvarchar(100) NOT NULL,
        rejection_reason nvarchar(2000) NOT NULL,
        raw_payload nvarchar(max) NULL,
        rejected_at datetime2(3) NOT NULL CONSTRAINT DF_rejected_record_at DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_rejected_record PRIMARY KEY CLUSTERED (rejected_record_id),
        CONSTRAINT FK_rejected_record_batch FOREIGN KEY (ingestion_batch_id) REFERENCES [control].[ingestion_batch](ingestion_batch_id),
        CONSTRAINT CK_rejected_record_stage CHECK (rejection_stage IN ('BRONZE','SILVER','DQ','GOLD')),
        CONSTRAINT CK_rejected_record_payload_json CHECK (raw_payload IS NULL OR ISJSON(raw_payload) = 1)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'control.pipeline_run') AND name = N'IX_pipeline_run_status_started')
    CREATE INDEX IX_pipeline_run_status_started
        ON [control].[pipeline_run](run_status, started_at DESC)
        WHERE run_status IN ('STARTED','FAILED');
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'audit.pipeline_event') AND name = N'IX_pipeline_event_run_occurred')
    CREATE INDEX IX_pipeline_event_run_occurred
        ON [audit].[pipeline_event](pipeline_run_id, occurred_at);
GO
