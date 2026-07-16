/*
LAZA SQL Server POC - reference and Bronze structures
APPROVAL REQUIRED BEFORE EXECUTION.
*/
USE [LAZA_DATA_PLATFORM_DEV];
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID(N'reference.source', N'U') IS NULL
BEGIN
    CREATE TABLE [reference].[source]
    (
        source_id int IDENTITY(1,1) NOT NULL,
        source_code nvarchar(100) NOT NULL,
        source_name nvarchar(300) NOT NULL,
        organization_name nvarchar(300) NOT NULL,
        homepage_url nvarchar(1000) NULL,
        source_type varchar(30) NOT NULL,
        is_active bit NOT NULL CONSTRAINT DF_source_is_active DEFAULT (1),
        created_at datetime2(3) NOT NULL CONSTRAINT DF_source_created_at DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_source PRIMARY KEY CLUSTERED (source_id),
        CONSTRAINT UQ_source_code UNIQUE (source_code),
        CONSTRAINT CK_source_type CHECK (source_type IN ('OFFICIAL','MULTI_SOURCE','DEMO_FIXTURE'))
    );
END;
GO

IF OBJECT_ID(N'reference.unit', N'U') IS NULL
BEGIN
    CREATE TABLE [reference].[unit]
    (
        unit_id int IDENTITY(1,1) NOT NULL,
        unit_code nvarchar(60) NOT NULL,
        unit_name nvarchar(200) NOT NULL,
        symbol nvarchar(40) NULL,
        scale_factor decimal(38,10) NOT NULL CONSTRAINT DF_unit_scale DEFAULT (1),
        CONSTRAINT PK_unit PRIMARY KEY CLUSTERED (unit_id),
        CONSTRAINT UQ_unit_code UNIQUE (unit_code),
        CONSTRAINT CK_unit_scale_positive CHECK (scale_factor > 0)
    );
END;
GO

IF OBJECT_ID(N'reference.frequency', N'U') IS NULL
BEGIN
    CREATE TABLE [reference].[frequency]
    (
        frequency_id int IDENTITY(1,1) NOT NULL,
        frequency_code nvarchar(60) NOT NULL,
        frequency_name nvarchar(150) NOT NULL,
        expected_periods_per_year smallint NULL,
        CONSTRAINT PK_frequency PRIMARY KEY CLUSTERED (frequency_id),
        CONSTRAINT UQ_frequency_code UNIQUE (frequency_code),
        CONSTRAINT CK_frequency_periods CHECK (expected_periods_per_year IS NULL OR expected_periods_per_year > 0)
    );
END;
GO

IF OBJECT_ID(N'reference.geography', N'U') IS NULL
BEGIN
    CREATE TABLE [reference].[geography]
    (
        geography_id int IDENTITY(1,1) NOT NULL,
        geography_code nvarchar(60) NOT NULL,
        geography_name nvarchar(200) NOT NULL,
        geography_level varchar(30) NOT NULL,
        iso_code nvarchar(20) NULL,
        CONSTRAINT PK_geography PRIMARY KEY CLUSTERED (geography_id),
        CONSTRAINT UQ_geography_code UNIQUE (geography_code),
        CONSTRAINT CK_geography_level CHECK (geography_level IN ('COUNTRY','PROVINCE','MUNICIPALITY','REGION'))
    );
END;
GO

IF OBJECT_ID(N'bronze.source_asset', N'U') IS NULL
BEGIN
    CREATE TABLE [bronze].[source_asset]
    (
        source_asset_id bigint IDENTITY(1,1) NOT NULL,
        ingestion_batch_id bigint NOT NULL,
        source_id int NOT NULL,
        asset_type varchar(30) NOT NULL,
        asset_name nvarchar(500) NOT NULL,
        asset_location nvarchar(2000) NOT NULL,
        source_version nvarchar(100) NULL,
        publication_date date NULL,
        acquired_at datetime2(3) NOT NULL,
        content_hash varbinary(32) NULL,
        content_size_bytes bigint NULL,
        metadata_json nvarchar(max) NULL,
        is_official bit NOT NULL CONSTRAINT DF_source_asset_is_official DEFAULT (0),
        created_at datetime2(3) NOT NULL CONSTRAINT DF_source_asset_created_at DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_source_asset PRIMARY KEY CLUSTERED (source_asset_id),
        CONSTRAINT FK_source_asset_batch FOREIGN KEY (ingestion_batch_id) REFERENCES [control].[ingestion_batch](ingestion_batch_id),
        CONSTRAINT FK_source_asset_source FOREIGN KEY (source_id) REFERENCES [reference].[source](source_id),
        CONSTRAINT UQ_source_asset_batch_name UNIQUE (ingestion_batch_id, asset_name),
        CONSTRAINT CK_source_asset_type CHECK (asset_type IN ('CSV','XLSX','JSON','PDF','API_RESPONSE','HTML','FIXTURE')),
        CONSTRAINT CK_source_asset_size CHECK (content_size_bytes IS NULL OR content_size_bytes >= 0),
        CONSTRAINT CK_source_asset_metadata_json CHECK (metadata_json IS NULL OR ISJSON(metadata_json) = 1),
        CONSTRAINT CK_source_asset_official_evidence CHECK
        (
            is_official = 0 OR
            (publication_date IS NOT NULL AND content_hash IS NOT NULL AND source_version IS NOT NULL)
        )
    );
END;
GO

IF OBJECT_ID(N'bronze.raw_indicator_observation', N'U') IS NULL
BEGIN
    CREATE TABLE [bronze].[raw_indicator_observation]
    (
        raw_observation_id bigint IDENTITY(1,1) NOT NULL,
        ingestion_batch_id bigint NOT NULL,
        source_asset_id bigint NOT NULL,
        source_row_number bigint NULL,
        source_record_key nvarchar(300) NULL,
        indicator_code_raw nvarchar(200) NULL,
        value_raw nvarchar(200) NULL,
        unit_raw nvarchar(200) NULL,
        period_raw nvarchar(200) NULL,
        raw_payload nvarchar(max) NOT NULL,
        record_hash varbinary(32) NOT NULL,
        bronze_status varchar(20) NOT NULL CONSTRAINT DF_raw_observation_status DEFAULT ('RECEIVED'),
        ingested_at datetime2(3) NOT NULL CONSTRAINT DF_raw_observation_ingested DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_raw_indicator_observation PRIMARY KEY CLUSTERED (raw_observation_id),
        CONSTRAINT FK_raw_observation_batch FOREIGN KEY (ingestion_batch_id) REFERENCES [control].[ingestion_batch](ingestion_batch_id),
        CONSTRAINT FK_raw_observation_asset FOREIGN KEY (source_asset_id) REFERENCES [bronze].[source_asset](source_asset_id),
        CONSTRAINT UQ_raw_observation_batch_hash UNIQUE (ingestion_batch_id, record_hash),
        CONSTRAINT CK_raw_observation_payload_json CHECK (ISJSON(raw_payload) = 1),
        CONSTRAINT CK_raw_observation_status CHECK (bronze_status IN ('RECEIVED','ACCEPTED','REJECTED'))
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'bronze.raw_indicator_observation') AND name = N'IX_raw_observation_asset')
    CREATE INDEX IX_raw_observation_asset ON [bronze].[raw_indicator_observation](source_asset_id, source_row_number);
GO
