USE [LAZA_DATA_PLATFORM_DEV];
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

IF OBJECT_ID(N'control.source_asset_mirror', N'U') IS NULL
BEGIN
    CREATE TABLE control.source_asset_mirror
    (
        source_asset_id         bigint        NOT NULL,
        mirror_path             nvarchar(2048) NOT NULL,
        mirror_size_bytes       bigint        NOT NULL,
        mirror_sha256           binary(32)    NOT NULL,
        hash_matches_registered bit           NOT NULL,
        mirror_status           varchar(32)   NOT NULL,
        mirrored_at             datetime2(3)  NOT NULL CONSTRAINT DF_source_asset_mirror_mirrored_at DEFAULT SYSUTCDATETIME(),
        last_verified_at        datetime2(3)  NOT NULL CONSTRAINT DF_source_asset_mirror_verified_at DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_source_asset_mirror PRIMARY KEY CLUSTERED (source_asset_id),
        CONSTRAINT FK_source_asset_mirror_asset FOREIGN KEY (source_asset_id)
            REFERENCES bronze.source_asset(source_asset_id),
        CONSTRAINT CK_source_asset_mirror_size CHECK (mirror_size_bytes >= 0),
        CONSTRAINT CK_source_asset_mirror_status CHECK (mirror_status IN ('VERIFIED', 'PUBLISHER_UPDATED_HTML')),
        CONSTRAINT CK_source_asset_mirror_hash_status CHECK
        (
            (mirror_status = 'VERIFIED' AND hash_matches_registered = 1)
            OR
            (mirror_status = 'PUBLISHER_UPDATED_HTML' AND hash_matches_registered = 0)
        )
    );
END;
GO

SELECT
    OBJECT_SCHEMA_NAME(object_id) AS schema_name,
    OBJECT_NAME(object_id) AS table_name
FROM sys.tables
WHERE object_id = OBJECT_ID(N'control.source_asset_mirror');
GO
