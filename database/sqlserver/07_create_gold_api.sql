/*
LAZA SQL Server POC - Gold star model and API view
APPROVAL REQUIRED BEFORE EXECUTION.
*/
USE [LAZA_DATA_PLATFORM_DEV];
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID(N'gold.dim_indicator', N'U') IS NULL
BEGIN
    CREATE TABLE [gold].[dim_indicator]
    (
        indicator_key int IDENTITY(1,1) NOT NULL,
        silver_indicator_id int NOT NULL,
        indicator_code nvarchar(100) NOT NULL,
        indicator_name nvarchar(250) NOT NULL,
        domain_name nvarchar(200) NOT NULL,
        business_definition nvarchar(2000) NOT NULL,
        favorable_direction varchar(10) NOT NULL,
        is_active bit NOT NULL,
        loaded_at datetime2(3) NOT NULL CONSTRAINT DF_gold_indicator_loaded DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_gold_dim_indicator PRIMARY KEY CLUSTERED (indicator_key),
        CONSTRAINT UQ_gold_dim_indicator_code UNIQUE (indicator_code),
        CONSTRAINT UQ_gold_dim_indicator_silver UNIQUE (silver_indicator_id)
    );
END;
GO

IF OBJECT_ID(N'gold.dim_source', N'U') IS NULL
BEGIN
    CREATE TABLE [gold].[dim_source]
    (
        source_key int IDENTITY(1,1) NOT NULL,
        silver_source_id int NOT NULL,
        source_code nvarchar(100) NOT NULL,
        source_name nvarchar(300) NOT NULL,
        organization_name nvarchar(300) NOT NULL,
        homepage_url nvarchar(1000) NULL,
        loaded_at datetime2(3) NOT NULL CONSTRAINT DF_gold_source_loaded DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_gold_dim_source PRIMARY KEY CLUSTERED (source_key),
        CONSTRAINT UQ_gold_dim_source_code UNIQUE (source_code),
        CONSTRAINT UQ_gold_dim_source_silver UNIQUE (silver_source_id)
    );
END;
GO

IF OBJECT_ID(N'gold.dim_unit', N'U') IS NULL
BEGIN
    CREATE TABLE [gold].[dim_unit]
    (
        unit_key int IDENTITY(1,1) NOT NULL,
        silver_unit_id int NOT NULL,
        unit_code nvarchar(60) NOT NULL,
        unit_name nvarchar(200) NOT NULL,
        symbol nvarchar(40) NULL,
        loaded_at datetime2(3) NOT NULL CONSTRAINT DF_gold_unit_loaded DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_gold_dim_unit PRIMARY KEY CLUSTERED (unit_key),
        CONSTRAINT UQ_gold_dim_unit_code UNIQUE (unit_code),
        CONSTRAINT UQ_gold_dim_unit_silver UNIQUE (silver_unit_id)
    );
END;
GO

IF OBJECT_ID(N'gold.dim_geography', N'U') IS NULL
BEGIN
    CREATE TABLE [gold].[dim_geography]
    (
        geography_key int IDENTITY(1,1) NOT NULL,
        silver_geography_id int NOT NULL,
        geography_code nvarchar(60) NOT NULL,
        geography_name nvarchar(200) NOT NULL,
        geography_level varchar(30) NOT NULL,
        iso_code nvarchar(20) NULL,
        loaded_at datetime2(3) NOT NULL CONSTRAINT DF_gold_geography_loaded DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_gold_dim_geography PRIMARY KEY CLUSTERED (geography_key),
        CONSTRAINT UQ_gold_dim_geography_code UNIQUE (geography_code),
        CONSTRAINT UQ_gold_dim_geography_silver UNIQUE (silver_geography_id)
    );
END;
GO

IF OBJECT_ID(N'gold.dim_series', N'U') IS NULL
BEGIN
    CREATE TABLE [gold].[dim_series]
    (
        series_key int IDENTITY(1,1) NOT NULL,
        silver_series_id int NOT NULL,
        series_code nvarchar(180) NOT NULL,
        frequency_code nvarchar(60) NOT NULL,
        frequency_name nvarchar(150) NOT NULL,
        methodology_version nvarchar(100) NULL,
        loaded_at datetime2(3) NOT NULL CONSTRAINT DF_gold_series_loaded DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_gold_dim_series PRIMARY KEY CLUSTERED (series_key),
        CONSTRAINT UQ_gold_dim_series_code UNIQUE (series_code),
        CONSTRAINT UQ_gold_dim_series_silver UNIQUE (silver_series_id)
    );
END;
GO

IF OBJECT_ID(N'gold.dim_date', N'U') IS NULL
BEGIN
    CREATE TABLE [gold].[dim_date]
    (
        date_key int NOT NULL,
        full_date date NOT NULL,
        calendar_year smallint NOT NULL,
        calendar_quarter tinyint NOT NULL,
        calendar_month tinyint NOT NULL,
        month_name nvarchar(20) NOT NULL,
        CONSTRAINT PK_gold_dim_date PRIMARY KEY CLUSTERED (date_key),
        CONSTRAINT UQ_gold_dim_date_full UNIQUE (full_date),
        CONSTRAINT CK_gold_date_quarter CHECK (calendar_quarter BETWEEN 1 AND 4),
        CONSTRAINT CK_gold_date_month CHECK (calendar_month BETWEEN 1 AND 12)
    );
END;
GO

IF OBJECT_ID(N'gold.fact_indicator_observation', N'U') IS NULL
BEGIN
    CREATE TABLE [gold].[fact_indicator_observation]
    (
        fact_observation_id bigint IDENTITY(1,1) NOT NULL,
        silver_observation_id bigint NOT NULL,
        indicator_key int NOT NULL,
        series_key int NOT NULL,
        source_key int NOT NULL,
        unit_key int NOT NULL,
        geography_key int NOT NULL,
        period_start_date_key int NOT NULL,
        period_end_date_key int NOT NULL,
        reference_period_label nvarchar(100) NOT NULL,
        numeric_value decimal(38,10) NOT NULL,
        display_value nvarchar(100) NOT NULL,
        comparison_label nvarchar(200) NULL,
        comparison_display_value nvarchar(100) NULL,
        trend_direction varchar(10) NULL,
        quality_status varchar(30) NOT NULL,
        quality_score decimal(5,2) NULL,
        publication_status varchar(20) NOT NULL,
        is_official bit NOT NULL,
        source_asset_id bigint NOT NULL,
        published_at datetime2(3) NOT NULL CONSTRAINT DF_gold_fact_published DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_gold_fact_observation PRIMARY KEY CLUSTERED (fact_observation_id),
        CONSTRAINT UQ_gold_fact_silver_observation UNIQUE (silver_observation_id),
        CONSTRAINT FK_gold_fact_indicator FOREIGN KEY (indicator_key) REFERENCES [gold].[dim_indicator](indicator_key),
        CONSTRAINT FK_gold_fact_series FOREIGN KEY (series_key) REFERENCES [gold].[dim_series](series_key),
        CONSTRAINT FK_gold_fact_source FOREIGN KEY (source_key) REFERENCES [gold].[dim_source](source_key),
        CONSTRAINT FK_gold_fact_unit FOREIGN KEY (unit_key) REFERENCES [gold].[dim_unit](unit_key),
        CONSTRAINT FK_gold_fact_geography FOREIGN KEY (geography_key) REFERENCES [gold].[dim_geography](geography_key),
        CONSTRAINT FK_gold_fact_period_start FOREIGN KEY (period_start_date_key) REFERENCES [gold].[dim_date](date_key),
        CONSTRAINT FK_gold_fact_period_end FOREIGN KEY (period_end_date_key) REFERENCES [gold].[dim_date](date_key),
        CONSTRAINT CK_gold_fact_publication CHECK (publication_status IN ('DEMONSTRATION','PUBLISHED')),
        CONSTRAINT CK_gold_fact_official CHECK
        (
            (publication_status = 'DEMONSTRATION' AND is_official = 0) OR
            (publication_status = 'PUBLISHED' AND is_official = 1)
        )
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'gold.fact_indicator_observation') AND name = N'IX_gold_fact_latest')
    CREATE INDEX IX_gold_fact_latest
        ON [gold].[fact_indicator_observation](indicator_key, period_end_date_key DESC, published_at DESC);
GO

CREATE OR ALTER TRIGGER [gold].[trg_fact_indicator_observation_publication_gate]
ON [gold].[fact_indicator_observation]
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS
    (
        SELECT 1
        FROM inserted AS fact
        LEFT JOIN [silver].[observation] AS observation
            ON observation.observation_id = fact.silver_observation_id
        LEFT JOIN [bronze].[source_asset] AS asset
            ON asset.source_asset_id = fact.source_asset_id
        OUTER APPLY
        (
            SELECT TOP (1)
                approval.decision,
                approval.decision_scope
            FROM [dq].[approval] AS approval
            WHERE approval.observation_id = fact.silver_observation_id
            ORDER BY approval.decided_at DESC, approval.approval_id DESC
        ) AS latest_approval
        WHERE
            (
                fact.publication_status = 'DEMONSTRATION'
                AND
                (
                    fact.is_official <> 0 OR
                    ISNULL(latest_approval.decision, '') <> 'APPROVE' OR
                    ISNULL(latest_approval.decision_scope, '') <> 'DEMO'
                )
            )
            OR
            (
                fact.publication_status = 'PUBLISHED'
                AND
                (
                    fact.is_official <> 1 OR
                    ISNULL(observation.publication_status, '') <> 'PUBLISHED' OR
                    ISNULL(observation.quality_status, '') <> 'PASSED' OR
                    ISNULL(asset.is_official, 0) <> 1 OR
                    ISNULL(latest_approval.decision, '') <> 'APPROVE' OR
                    ISNULL(latest_approval.decision_scope, '') <> 'OFFICIAL'
                )
            )
    )
        THROW 51007, 'Gold publication gate rejected the row: approval, quality, official source evidence or publication state is invalid.', 1;
END;
GO

CREATE OR ALTER VIEW [api].[vw_indicator_latest]
AS
WITH ranked AS
(
    SELECT
        i.indicator_code,
        i.indicator_name,
        i.domain_name,
        i.business_definition,
        i.favorable_direction,
        s.series_code,
        s.frequency_code,
        s.frequency_name,
        src.source_name,
        src.organization_name,
        src.homepage_url AS source_url,
        u.unit_code,
        u.unit_name,
        u.symbol,
        g.geography_code,
        g.geography_name,
        f.reference_period_label,
        f.numeric_value,
        f.display_value,
        f.comparison_label,
        f.comparison_display_value,
        f.trend_direction,
        f.quality_status,
        f.quality_score,
        f.publication_status,
        f.is_official,
        f.published_at,
        ROW_NUMBER() OVER
        (
            PARTITION BY f.indicator_key
            ORDER BY f.is_official DESC, f.period_end_date_key DESC, f.published_at DESC, f.fact_observation_id DESC
        ) AS row_number
    FROM [gold].[fact_indicator_observation] AS f
    INNER JOIN [gold].[dim_indicator] AS i ON i.indicator_key = f.indicator_key
    INNER JOIN [gold].[dim_series] AS s ON s.series_key = f.series_key
    INNER JOIN [gold].[dim_source] AS src ON src.source_key = f.source_key
    INNER JOIN [gold].[dim_unit] AS u ON u.unit_key = f.unit_key
    INNER JOIN [gold].[dim_geography] AS g ON g.geography_key = f.geography_key
)
SELECT
    indicator_code,
    indicator_name,
    domain_name,
    business_definition,
    favorable_direction,
    series_code,
    frequency_code,
    frequency_name,
    source_name,
    organization_name,
    source_url,
    unit_code,
    unit_name,
    symbol,
    geography_code,
    geography_name,
    reference_period_label,
    numeric_value,
    display_value,
    comparison_label,
    comparison_display_value,
    trend_direction,
    quality_status,
    quality_score,
    publication_status,
    is_official,
    published_at
FROM ranked
WHERE row_number = 1;
GO
