/*
LAZA SQL Server POC - data quality and approval structures
APPROVAL REQUIRED BEFORE EXECUTION.
*/
USE [LAZA_DATA_PLATFORM_DEV];
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID(N'dq.rule', N'U') IS NULL
BEGIN
    CREATE TABLE [dq].[rule]
    (
        rule_id int IDENTITY(1,1) NOT NULL,
        rule_code nvarchar(100) NOT NULL,
        rule_name nvarchar(250) NOT NULL,
        quality_dimension varchar(20) NOT NULL,
        default_severity varchar(10) NOT NULL,
        is_active bit NOT NULL CONSTRAINT DF_dq_rule_active DEFAULT (1),
        created_at datetime2(3) NOT NULL CONSTRAINT DF_dq_rule_created DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_dq_rule PRIMARY KEY CLUSTERED (rule_id),
        CONSTRAINT UQ_dq_rule_code UNIQUE (rule_code),
        CONSTRAINT CK_dq_rule_dimension CHECK (quality_dimension IN ('COMPLETENESS','UNIQUENESS','VALIDITY','CONSISTENCY','INTEGRITY','TIMELINESS')),
        CONSTRAINT CK_dq_rule_severity CHECK (default_severity IN ('LOW','MEDIUM','HIGH','CRITICAL'))
    );
END;
GO

IF OBJECT_ID(N'dq.rule_version', N'U') IS NULL
BEGIN
    CREATE TABLE [dq].[rule_version]
    (
        rule_version_id int IDENTITY(1,1) NOT NULL,
        rule_id int NOT NULL,
        version_number int NOT NULL,
        rule_expression nvarchar(4000) NOT NULL,
        parameter_json nvarchar(max) NULL,
        effective_from datetime2(3) NOT NULL,
        effective_to datetime2(3) NULL,
        is_current bit NOT NULL CONSTRAINT DF_dq_rule_version_current DEFAULT (1),
        CONSTRAINT PK_dq_rule_version PRIMARY KEY CLUSTERED (rule_version_id),
        CONSTRAINT FK_dq_rule_version_rule FOREIGN KEY (rule_id) REFERENCES [dq].[rule](rule_id),
        CONSTRAINT UQ_dq_rule_version UNIQUE (rule_id, version_number),
        CONSTRAINT CK_dq_rule_version_number CHECK (version_number > 0),
        CONSTRAINT CK_dq_rule_parameters_json CHECK (parameter_json IS NULL OR ISJSON(parameter_json) = 1),
        CONSTRAINT CK_dq_rule_version_dates CHECK (effective_to IS NULL OR effective_to > effective_from)
    );
END;
GO

IF OBJECT_ID(N'dq.execution', N'U') IS NULL
BEGIN
    CREATE TABLE [dq].[execution]
    (
        dq_execution_id bigint IDENTITY(1,1) NOT NULL,
        pipeline_run_id bigint NOT NULL,
        ingestion_batch_id bigint NOT NULL,
        execution_status varchar(20) NOT NULL,
        started_at datetime2(3) NOT NULL CONSTRAINT DF_dq_execution_started DEFAULT (SYSUTCDATETIME()),
        ended_at datetime2(3) NULL,
        CONSTRAINT PK_dq_execution PRIMARY KEY CLUSTERED (dq_execution_id),
        CONSTRAINT FK_dq_execution_run FOREIGN KEY (pipeline_run_id) REFERENCES [control].[pipeline_run](pipeline_run_id),
        CONSTRAINT FK_dq_execution_batch FOREIGN KEY (ingestion_batch_id) REFERENCES [control].[ingestion_batch](ingestion_batch_id),
        CONSTRAINT CK_dq_execution_status CHECK (execution_status IN ('STARTED','PASSED','WARNING','FAILED')),
        CONSTRAINT CK_dq_execution_dates CHECK (ended_at IS NULL OR ended_at >= started_at)
    );
END;
GO

IF OBJECT_ID(N'dq.result', N'U') IS NULL
BEGIN
    CREATE TABLE [dq].[result]
    (
        dq_result_id bigint IDENTITY(1,1) NOT NULL,
        dq_execution_id bigint NOT NULL,
        rule_version_id int NOT NULL,
        observation_id bigint NULL,
        raw_observation_id bigint NULL,
        result_status varchar(10) NOT NULL,
        observed_value nvarchar(1000) NULL,
        result_message nvarchar(2000) NULL,
        evaluated_at datetime2(3) NOT NULL CONSTRAINT DF_dq_result_evaluated DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_dq_result PRIMARY KEY CLUSTERED (dq_result_id),
        CONSTRAINT FK_dq_result_execution FOREIGN KEY (dq_execution_id) REFERENCES [dq].[execution](dq_execution_id),
        CONSTRAINT FK_dq_result_rule_version FOREIGN KEY (rule_version_id) REFERENCES [dq].[rule_version](rule_version_id),
        CONSTRAINT FK_dq_result_observation FOREIGN KEY (observation_id) REFERENCES [silver].[observation](observation_id),
        CONSTRAINT FK_dq_result_raw FOREIGN KEY (raw_observation_id) REFERENCES [bronze].[raw_indicator_observation](raw_observation_id),
        CONSTRAINT CK_dq_result_status CHECK (result_status IN ('PASS','WARN','FAIL')),
        CONSTRAINT CK_dq_result_target CHECK (observation_id IS NOT NULL OR raw_observation_id IS NOT NULL)
    );
END;
GO

IF OBJECT_ID(N'dq.exception', N'U') IS NULL
BEGIN
    CREATE TABLE [dq].[exception]
    (
        dq_exception_id bigint IDENTITY(1,1) NOT NULL,
        dq_result_id bigint NOT NULL,
        exception_status varchar(20) NOT NULL,
        justification nvarchar(2000) NOT NULL,
        requested_by sysname NOT NULL CONSTRAINT DF_dq_exception_requested_by DEFAULT (SUSER_SNAME()),
        requested_at datetime2(3) NOT NULL CONSTRAINT DF_dq_exception_requested DEFAULT (SYSUTCDATETIME()),
        resolved_by sysname NULL,
        resolved_at datetime2(3) NULL,
        CONSTRAINT PK_dq_exception PRIMARY KEY CLUSTERED (dq_exception_id),
        CONSTRAINT FK_dq_exception_result FOREIGN KEY (dq_result_id) REFERENCES [dq].[result](dq_result_id),
        CONSTRAINT CK_dq_exception_status CHECK (exception_status IN ('OPEN','APPROVED','REJECTED','EXPIRED')),
        CONSTRAINT CK_dq_exception_resolution CHECK
        (
            (exception_status = 'OPEN' AND resolved_at IS NULL) OR
            (exception_status <> 'OPEN' AND resolved_at IS NOT NULL)
        )
    );
END;
GO

IF OBJECT_ID(N'dq.approval', N'U') IS NULL
BEGIN
    CREATE TABLE [dq].[approval]
    (
        approval_id bigint IDENTITY(1,1) NOT NULL,
        observation_id bigint NOT NULL,
        decision varchar(10) NOT NULL,
        decision_scope varchar(20) NOT NULL,
        decision_notes nvarchar(2000) NULL,
        decided_by sysname NOT NULL,
        decided_at datetime2(3) NOT NULL CONSTRAINT DF_dq_approval_decided DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_dq_approval PRIMARY KEY CLUSTERED (approval_id),
        CONSTRAINT FK_dq_approval_observation FOREIGN KEY (observation_id) REFERENCES [silver].[observation](observation_id),
        CONSTRAINT CK_dq_approval_decision CHECK (decision IN ('APPROVE','REJECT')),
        CONSTRAINT CK_dq_approval_scope CHECK (decision_scope IN ('DEMO','OFFICIAL'))
    );
END;
GO

IF OBJECT_ID(N'dq.indicator_score', N'U') IS NULL
BEGIN
    CREATE TABLE [dq].[indicator_score]
    (
        indicator_score_id bigint IDENTITY(1,1) NOT NULL,
        dq_execution_id bigint NOT NULL,
        observation_id bigint NOT NULL,
        quality_score decimal(5,2) NOT NULL,
        passed_rules int NOT NULL,
        warning_rules int NOT NULL,
        failed_rules int NOT NULL,
        calculated_at datetime2(3) NOT NULL CONSTRAINT DF_dq_score_calculated DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_dq_indicator_score PRIMARY KEY CLUSTERED (indicator_score_id),
        CONSTRAINT FK_dq_score_execution FOREIGN KEY (dq_execution_id) REFERENCES [dq].[execution](dq_execution_id),
        CONSTRAINT FK_dq_score_observation FOREIGN KEY (observation_id) REFERENCES [silver].[observation](observation_id),
        CONSTRAINT UQ_dq_score_execution_observation UNIQUE (dq_execution_id, observation_id),
        CONSTRAINT CK_dq_score_range CHECK (quality_score BETWEEN 0 AND 100),
        CONSTRAINT CK_dq_score_counts CHECK (passed_rules >= 0 AND warning_rules >= 0 AND failed_rules >= 0)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dq.result') AND name = N'IX_dq_result_observation')
    CREATE INDEX IX_dq_result_observation ON [dq].[result](observation_id, result_status);
GO
