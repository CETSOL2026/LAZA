/*
LAZA SQL Server POC - FULL DATABASE ROLLBACK

DESTRUCTIVE. Never run through a generic deployment sequence.
Required explicit SQLCMD confirmation:
  -v ConfirmDrop="DROP_LAZA_DATA_PLATFORM_DEV"
*/
USE [master];
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

IF N'$(ConfirmDrop)' <> N'DROP_LAZA_DATA_PLATFORM_DEV'
    THROW 51999, 'Rollback not confirmed. Pass -v ConfirmDrop="DROP_LAZA_DATA_PLATFORM_DEV" only after explicit approval.', 1;

IF DB_ID(N'LAZA_DATA_PLATFORM_DEV') IS NULL
BEGIN
    PRINT 'Database LAZA_DATA_PLATFORM_DEV does not exist. Nothing was changed.';
    RETURN;
END;

ALTER DATABASE [LAZA_DATA_PLATFORM_DEV] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
DROP DATABASE [LAZA_DATA_PLATFORM_DEV];
GO
