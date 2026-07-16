/*
LAZA SQL Server POC - Silver canonical model
APPROVAL REQUIRED BEFORE EXECUTION.
*/
USE [LAZA_DATA_PLATFORM_DEV];
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID(N'silver.indicator', N'U') IS NULL
BEGIN
    CREATE TABLE [silver].[indicator]
    (
        indicator_id int IDENTITY(1,1) NOT NULL,
        indicator_code nvarchar(100) NOT NULL,
        indicator_name nvarchar(250) NOT NULL,
        domain_name nvarchar(200) NOT NULL,
        business_definition nvarchar(2000) NOT NULL,
        favorable_direction varchar(10) NOT NULL,
        accountable_owner nvarchar(200) NULL,
        is_active bit NOT NULL CONSTRAINT DF_indicator_is_active DEFAULT (1),
        created_at datetime2(3) NOT NULL CONSTRAINT DF_indicator_created DEFAULT (SYSUTCDATETIME()),
        updated_at datetime2(3) NOT NULL CONSTRAINT DF_indicator_updated DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_indicator PRIMARY KEY CLUSTERED (indicator_id),
        CONSTRAINT UQ_indicator_code UNIQUE (indicator_code),
        CONSTRAINT CK_indicator_direction CHECK (favorable_direction IN ('UP','DOWN','NEUTRAL'))
    );
END;
GO

IF OBJECT_ID(N'silver.indicator_series', N'U') IS NULL
BEGIN
    CREATE TABLE [silver].[indicator_series]
    (
        series_id int IDENTITY(1,1) NOT NULL,
        series_code nvarchar(180) NOT NULL,
        indicator_id int NOT NULL,
        source_id int NOT NULL,
        unit_id int NOT NULL,
        frequency_id int NOT NULL,
        geography_id int NOT NULL,
        methodology_version nvarchar(100) NULL,
        methodology_notes nvarchar(2000) NULL,
        series_status varchar(20) NOT NULL CONSTRAINT DF_indicator_series_status DEFAULT ('DEMONSTRATION'),
        valid_from datetime2(3) NOT NULL CONSTRAINT DF_indicator_series_valid_from DEFAULT (SYSUTCDATETIME()),
        valid_to datetime2(3) NULL,
        is_current bit NOT NULL CONSTRAINT DF_indicator_series_current DEFAULT (1),
        CONSTRAINT PK_indicator_series PRIMARY KEY CLUSTERED (series_id),
        CONSTRAINT UQ_indicator_series_code UNIQUE (series_code),
        CONSTRAINT FK_series_indicator FOREIGN KEY (indicator_id) REFERENCES [silver].[indicator](indicator_id),
        CONSTRAINT FK_series_source FOREIGN KEY (source_id) REFERENCES [reference].[source](source_id),
        CONSTRAINT FK_series_unit FOREIGN KEY (unit_id) REFERENCES [reference].[unit](unit_id),
        CONSTRAINT FK_series_frequency FOREIGN KEY (frequency_id) REFERENCES [reference].[frequency](frequency_id),
        CONSTRAINT FK_series_geography FOREIGN KEY (geography_id) REFERENCES [reference].[geography](geography_id),
        CONSTRAINT CK_series_status CHECK (series_status IN ('DEMONSTRATION','VALIDATED','RETIRED')),
        CONSTRAINT CK_series_valid_dates CHECK (valid_to IS NULL OR valid_to > valid_from)
    );
END;
GO

IF OBJECT_ID(N'silver.observation', N'U') IS NULL
BEGIN
    CREATE TABLE [silver].[observation]
    (
        observation_id bigint IDENTITY(1,1) NOT NULL,
        series_id int NOT NULL,
        ingestion_batch_id bigint NOT NULL,
        source_asset_id bigint NOT NULL,
        raw_observation_id bigint NULL,
        reference_period_label nvarchar(100) NOT NULL,
        reference_period_start date NOT NULL,
        reference_period_end date NOT NULL,
        period_precision varchar(10) NOT NULL,
        numeric_value decimal(38,10) NOT NULL,
        display_value nvarchar(100) NOT NULL,
        comparison_label nvarchar(200) NULL,
        comparison_display_value nvarchar(100) NULL,
        trend_direction varchar(10) NULL,
        publication_date date NULL,
        quality_status varchar(30) NOT NULL,
        publication_status varchar(20) NOT NULL,
        is_official bit NOT NULL CONSTRAINT DF_observation_is_official DEFAULT (0),
        observation_hash varbinary(32) NOT NULL,
        valid_from datetime2(3) NOT NULL CONSTRAINT DF_observation_valid_from DEFAULT (SYSUTCDATETIME()),
        valid_to datetime2(3) NULL,
        is_current bit NOT NULL CONSTRAINT DF_observation_is_current DEFAULT (1),
        created_at datetime2(3) NOT NULL CONSTRAINT DF_observation_created DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_observation PRIMARY KEY CLUSTERED (observation_id),
        CONSTRAINT FK_observation_series FOREIGN KEY (series_id) REFERENCES [silver].[indicator_series](series_id),
        CONSTRAINT FK_observation_batch FOREIGN KEY (ingestion_batch_id) REFERENCES [control].[ingestion_batch](ingestion_batch_id),
        CONSTRAINT FK_observation_asset FOREIGN KEY (source_asset_id) REFERENCES [bronze].[source_asset](source_asset_id),
        CONSTRAINT FK_observation_raw FOREIGN KEY (raw_observation_id) REFERENCES [bronze].[raw_indicator_observation](raw_observation_id),
        CONSTRAINT UQ_observation_hash UNIQUE (observation_hash),
        CONSTRAINT CK_observation_period CHECK (reference_period_end >= reference_period_start),
        CONSTRAINT CK_observation_precision CHECK (period_precision IN ('DAY','MONTH','QUARTER','YEAR','UNKNOWN')),
        CONSTRAINT CK_observation_trend CHECK (trend_direction IS NULL OR trend_direction IN ('UP','DOWN','STABLE')),
        CONSTRAINT CK_observation_quality CHECK (quality_status IN ('PENDING','PASSED','WARNING','FAILED')),
        CONSTRAINT CK_observation_publication CHECK (publication_status IN ('DEMONSTRATION','VALIDATED','APPROVED','PUBLISHED','REJECTED')),
        CONSTRAINT CK_observation_official_state CHECK (is_official = 0 OR publication_status IN ('APPROVED','PUBLISHED')),
        CONSTRAINT CK_observation_valid_dates CHECK (valid_to IS NULL OR valid_to > valid_from)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'silver.indicator_series') AND name = N'UX_indicator_series_current_contract')
    CREATE UNIQUE INDEX UX_indicator_series_current_contract
        ON [silver].[indicator_series](indicator_id, source_id, unit_id, frequency_id, geography_id)
        WHERE is_current = 1;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'silver.observation') AND name = N'UX_observation_current_grain')
    CREATE UNIQUE INDEX UX_observation_current_grain
        ON [silver].[observation](series_id, reference_period_start, reference_period_end)
        WHERE is_current = 1;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'silver.observation') AND name = N'IX_observation_publication')
    CREATE INDEX IX_observation_publication
        ON [silver].[observation](publication_status, quality_status, reference_period_end DESC);
GO
