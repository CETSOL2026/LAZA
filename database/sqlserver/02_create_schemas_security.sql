/*
LAZA SQL Server POC - schemas and empty database roles
APPROVAL REQUIRED BEFORE EXECUTION.
No server login or database user is created by this script.
*/
USE [LAZA_DATA_PLATFORM_DEV];
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF SCHEMA_ID(N'control') IS NULL EXEC(N'CREATE SCHEMA [control] AUTHORIZATION [dbo];');
IF SCHEMA_ID(N'audit') IS NULL EXEC(N'CREATE SCHEMA [audit] AUTHORIZATION [dbo];');
IF SCHEMA_ID(N'reference') IS NULL EXEC(N'CREATE SCHEMA [reference] AUTHORIZATION [dbo];');
IF SCHEMA_ID(N'bronze') IS NULL EXEC(N'CREATE SCHEMA [bronze] AUTHORIZATION [dbo];');
IF SCHEMA_ID(N'silver') IS NULL EXEC(N'CREATE SCHEMA [silver] AUTHORIZATION [dbo];');
IF SCHEMA_ID(N'dq') IS NULL EXEC(N'CREATE SCHEMA [dq] AUTHORIZATION [dbo];');
IF SCHEMA_ID(N'gold') IS NULL EXEC(N'CREATE SCHEMA [gold] AUTHORIZATION [dbo];');
IF SCHEMA_ID(N'api') IS NULL EXEC(N'CREATE SCHEMA [api] AUTHORIZATION [dbo];');
GO

IF DATABASE_PRINCIPAL_ID(N'laza_pipeline_executor') IS NULL CREATE ROLE [laza_pipeline_executor] AUTHORIZATION [dbo];
IF DATABASE_PRINCIPAL_ID(N'laza_data_reader') IS NULL CREATE ROLE [laza_data_reader] AUTHORIZATION [dbo];
IF DATABASE_PRINCIPAL_ID(N'laza_data_approver') IS NULL CREATE ROLE [laza_data_approver] AUTHORIZATION [dbo];
IF DATABASE_PRINCIPAL_ID(N'laza_api_reader') IS NULL CREATE ROLE [laza_api_reader] AUTHORIZATION [dbo];
GO

GRANT SELECT, INSERT, UPDATE ON SCHEMA::[control] TO [laza_pipeline_executor];
GRANT SELECT, INSERT ON SCHEMA::[audit] TO [laza_pipeline_executor];
GRANT SELECT ON SCHEMA::[reference] TO [laza_pipeline_executor];
GRANT SELECT, INSERT, UPDATE ON SCHEMA::[bronze] TO [laza_pipeline_executor];
GRANT SELECT, INSERT, UPDATE ON SCHEMA::[silver] TO [laza_pipeline_executor];
GRANT SELECT, INSERT, UPDATE ON SCHEMA::[dq] TO [laza_pipeline_executor];
GRANT SELECT, INSERT, UPDATE ON SCHEMA::[gold] TO [laza_pipeline_executor];

GRANT SELECT ON SCHEMA::[reference] TO [laza_data_reader];
GRANT SELECT ON SCHEMA::[silver] TO [laza_data_reader];
GRANT SELECT ON SCHEMA::[dq] TO [laza_data_reader];
GRANT SELECT ON SCHEMA::[gold] TO [laza_data_reader];

GRANT SELECT ON SCHEMA::[silver] TO [laza_data_approver];
GRANT SELECT, INSERT, UPDATE ON SCHEMA::[dq] TO [laza_data_approver];

GRANT SELECT ON SCHEMA::[api] TO [laza_api_reader];
GO
