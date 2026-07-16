/*
LAZA SQL Server POC - read-only preflight
This script performs SELECT statements only.
*/
USE [master];
GO
SET NOCOUNT ON;
GO

SELECT
    @@SERVERNAME AS server_name,
    CAST(SERVERPROPERTY('ProductVersion') AS nvarchar(128)) AS product_version,
    CAST(SERVERPROPERTY('ProductLevel') AS nvarchar(128)) AS product_level,
    CAST(SERVERPROPERTY('Edition') AS nvarchar(256)) AS edition,
    CASE CAST(SERVERPROPERTY('IsIntegratedSecurityOnly') AS int)
        WHEN 1 THEN 'WINDOWS_ONLY'
        ELSE 'MIXED_MODE'
    END AS authentication_mode,
    SUSER_SNAME() AS connected_login;

SELECT
    IS_SRVROLEMEMBER('sysadmin') AS is_sysadmin,
    IS_SRVROLEMEMBER('dbcreator') AS is_dbcreator,
    HAS_PERMS_BY_NAME(NULL, NULL, 'VIEW SERVER STATE') AS can_view_server_state,
    HAS_PERMS_BY_NAME(NULL, NULL, 'CREATE ANY DATABASE') AS can_create_any_database;

SELECT
    name,
    state_desc,
    recovery_model_desc,
    compatibility_level
FROM sys.databases
ORDER BY database_id;

SELECT
    CASE WHEN DB_ID(N'LAZA_DATA_PLATFORM_DEV') IS NULL
        THEN 'AVAILABLE'
        ELSE 'ALREADY_EXISTS'
    END AS proposed_database_name_status;

SELECT DISTINCT
    vs.volume_mount_point,
    CAST(vs.total_bytes / 1073741824.0 AS decimal(18, 2)) AS total_gb,
    CAST(vs.available_bytes / 1073741824.0 AS decimal(18, 2)) AS free_gb
FROM sys.master_files AS mf
CROSS APPLY sys.dm_os_volume_stats(mf.database_id, mf.file_id) AS vs;

SELECT name, value_in_use
FROM sys.configurations
WHERE name IN ('Agent XPs', 'max server memory (MB)', 'max degree of parallelism');
GO

