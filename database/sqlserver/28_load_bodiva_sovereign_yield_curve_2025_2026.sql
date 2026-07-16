USE [LAZA_DATA_PLATFORM_DEV];
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

IF EXISTS (SELECT 1 FROM silver.indicator_series WHERE series_code=N'BODIVA_SOVEREIGN_YIELD_1Y_AOA')
    THROW 51800, 'Official BODIVA sovereign yield curve series already exist.', 1;

DECLARE @curve TABLE(reference_date date, tenor nvarchar(4), tenor_months smallint, yield_pct decimal(9,4), PRIMARY KEY(reference_date,tenor));
INSERT @curve VALUES
('2025-02-21',N'3M',3,17.56),('2025-02-21',N'6M',6,17.62),('2025-02-21',N'1Y',12,18.07),('2025-02-21',N'2Y',24,17.32),
('2025-02-21',N'3Y',36,17.31),('2025-02-21',N'4Y',48,17.91),('2025-02-21',N'5Y',60,17.16),('2025-02-21',N'6Y',72,17.42),
('2025-02-21',N'7Y',84,18.47),('2025-02-21',N'8Y',96,19.62),('2025-02-21',N'9Y',108,20.87),('2025-02-21',N'10Y',120,21.74),
('2025-05-06',N'3M',3,13.66),('2025-05-06',N'6M',6,15.13),('2025-05-06',N'1Y',12,14.77),('2025-05-06',N'2Y',24,17.15),
('2025-05-06',N'3Y',36,18.85),('2025-05-06',N'4Y',48,19.19),('2025-05-06',N'5Y',60,18.09),('2025-05-06',N'6Y',72,18.29),
('2025-05-06',N'7Y',84,19.73),('2025-05-06',N'8Y',96,20.01),('2025-05-06',N'9Y',108,20.71),('2025-05-06',N'10Y',120,20.44),
('2026-01-23',N'3M',3,16.06),('2026-01-23',N'6M',6,16.81),('2026-01-23',N'1Y',12,17.65),('2026-01-23',N'2Y',24,17.59),
('2026-01-23',N'3Y',36,18.31),('2026-01-23',N'4Y',48,18.12),('2026-01-23',N'5Y',60,18.58),('2026-01-23',N'6Y',72,19.03),
('2026-01-23',N'7Y',84,19.45),('2026-01-23',N'8Y',96,19.12),('2026-01-23',N'9Y',108,18.93),('2026-01-23',N'10Y',120,18.65),
('2026-06-25',N'3M',3,13.90),('2026-06-25',N'6M',6,16.61),('2026-06-25',N'1Y',12,16.63),('2026-06-25',N'2Y',24,16.86),
('2026-06-25',N'3Y',36,17.47),('2026-06-25',N'4Y',48,18.18),('2026-06-25',N'5Y',60,18.63),('2026-06-25',N'6Y',72,19.13),
('2026-06-25',N'7Y',84,19.31),('2026-06-25',N'8Y',96,19.35),('2026-06-25',N'9Y',108,18.94),('2026-06-25',N'10Y',120,18.42);

IF (SELECT COUNT(*) FROM @curve)<>48
 OR EXISTS(SELECT reference_date FROM @curve GROUP BY reference_date HAVING COUNT(*)<>12)
 OR EXISTS(SELECT 1 FROM @curve WHERE yield_pct<=0 OR yield_pct>=100)
    THROW 51801, 'BODIVA curve completeness, uniqueness or domain validation failed.', 1;

DECLARE @asset TABLE(reference_date date PRIMARY KEY, source_url nvarchar(1000), content_hash char(64), content_size int);
INSERT @asset VALUES
('2025-02-21',N'https://www.bodiva.ao/media/boletim-diario/boletimdiario20250221.pdf',N'527E274C2A480D63C8A05529B362DF3C5CD324AFF33217421DF286C00E9BC956',578110),
('2025-05-06',N'https://www.bodiva.ao/media/boletim-diario/boletimdiario20250506.pdf',N'310F02309A0BB7AB21F0E3BD3CC9A5BDD10350C432C17F46EBCC7352AB49074B',751974),
('2026-01-23',N'https://www.bodiva.ao/media/boletim-diario/boletimdiario20260123.pdf',N'F25CAFA3C6046606F6DAE90A81CF502BF3F93BFE61A68EA64AEDCE85C7B2824E',1336109),
('2026-06-25',N'https://www.bodiva.ao/media/boletim-diario/boletimdiario20260625.pdf',N'EB59829EC47DD223964FC5EE21259F7260F93802F09B7E978318FB5C17F1A7E6',1555888);

BEGIN TRANSACTION;
DECLARE @now datetime2(3)=SYSUTCDATETIME(), @pipeline_id int, @run_id bigint, @batch_id bigint,
        @source_id int, @unit_id int, @frequency_id int, @geo_id int, @indicator_id int, @dq_id bigint;

IF NOT EXISTS(SELECT 1 FROM control.pipeline_definition WHERE pipeline_code=N'BODIVA_SOVEREIGN_YIELD_CURVE')
 INSERT control.pipeline_definition(pipeline_code,pipeline_name,source_system)
 VALUES(N'BODIVA_SOVEREIGN_YIELD_CURVE',N'BODIVA domestic sovereign yield curve',N'BODIVA');
SELECT @pipeline_id=pipeline_id FROM control.pipeline_definition WHERE pipeline_code=N'BODIVA_SOVEREIGN_YIELD_CURVE';
INSERT control.pipeline_run(pipeline_id,run_status,trigger_type,started_at) VALUES(@pipeline_id,'STARTED','MANUAL',@now); SET @run_id=SCOPE_IDENTITY();
INSERT control.ingestion_batch(pipeline_run_id,batch_code,data_classification,batch_status,acquired_at,source_record_count)
VALUES(@run_id,N'BODIVA_YIELD_CURVE_202502_202606','OFFICIAL','RECEIVED',@now,48); SET @batch_id=SCOPE_IDENTITY();

IF NOT EXISTS(SELECT 1 FROM reference.source WHERE source_code=N'BODIVA_DAILY_BULLETIN')
 INSERT reference.source(source_code,source_name,organization_name,homepage_url,source_type)
 VALUES(N'BODIVA_DAILY_BULLETIN',N'Official Market Bulletin',N'Bolsa de Divida e Valores de Angola (BODIVA)',N'https://www.bodiva.ao/estatistica','OFFICIAL');
SELECT @source_id=source_id FROM reference.source WHERE source_code=N'BODIVA_DAILY_BULLETIN';
SELECT @unit_id=unit_id FROM reference.unit WHERE unit_code=N'PERCENT';
SELECT @frequency_id=frequency_id FROM reference.frequency WHERE frequency_code=N'DAILY_MONTHLY';
SELECT @geo_id=geography_id FROM reference.geography WHERE geography_code=N'AGO';

DECLARE @tenor TABLE(tenor nvarchar(4),tenor_months smallint,series_code nvarchar(180),indicator_code nvarchar(100),indicator_name nvarchar(250));
INSERT @tenor
SELECT tenor,tenor_months,CONCAT(N'BODIVA_SOVEREIGN_YIELD_',tenor,N'_AOA'),
 CASE WHEN tenor=N'1Y' THEN N'sovereign-yield-curve' ELSE CONCAT(N'sovereign-yield-',LOWER(tenor)) END,
 CONCAT(N'Domestic Sovereign Yield ',tenor)
FROM @curve GROUP BY tenor,tenor_months;
INSERT silver.indicator(indicator_code,indicator_name,domain_name,business_definition,favorable_direction,accountable_owner)
SELECT indicator_code,indicator_name,N'Capital markets',
 N'Official BODIVA kwanza Treasury yield point; curve spread analytics use only observed maturities.',N'NEUTRAL',N'LAZA Data Steward' FROM @tenor;
INSERT gold.dim_indicator(silver_indicator_id,indicator_code,indicator_name,domain_name,business_definition,favorable_direction,is_active)
SELECT i.indicator_id,i.indicator_code,i.indicator_name,i.domain_name,i.business_definition,i.favorable_direction,i.is_active
FROM silver.indicator i JOIN @tenor t ON t.indicator_code=i.indicator_code;

INSERT silver.indicator_series(series_code,indicator_id,source_id,unit_id,frequency_id,geography_id,methodology_version,methodology_notes,series_status)
SELECT t.series_code,i.indicator_id,@source_id,@unit_id,@frequency_id,@geo_id,N'BODIVA Curva de Rendimentos Kz v1',
 N'Official published yield point. No interpolation, forward filling or synthetic maturity is used.',N'VALIDATED'
FROM @tenor t JOIN silver.indicator i ON i.indicator_code=t.indicator_code;

DECLARE @asset_map TABLE(reference_date date PRIMARY KEY,source_asset_id bigint);
INSERT bronze.source_asset(ingestion_batch_id,source_id,asset_type,asset_name,asset_location,source_version,publication_date,acquired_at,content_hash,content_size_bytes,metadata_json,is_official)
OUTPUT inserted.publication_date,inserted.source_asset_id INTO @asset_map(reference_date,source_asset_id)
SELECT @batch_id,@source_id,'PDF',CONCAT(N'bodiva_daily_bulletin_',CONVERT(char(8),a.reference_date,112),N'.pdf'),a.source_url,
 CONCAT(N'BODIVA ',CONVERT(char(10),a.reference_date,23)),a.reference_date,@now,CONVERT(varbinary(32),a.content_hash,2),a.content_size,
 CONCAT(N'{"referenceDate":"',CONVERT(char(10),a.reference_date,23),N'","sourcePage":7,"curve":"Kz","extractionMethod":"reviewed official table"}'),1
FROM @asset a;

INSERT bronze.raw_indicator_observation(ingestion_batch_id,source_asset_id,source_row_number,source_record_key,indicator_code_raw,value_raw,unit_raw,period_raw,raw_payload,record_hash,bronze_status)
SELECT @batch_id,a.source_asset_id,ROW_NUMBER() OVER(PARTITION BY c.reference_date ORDER BY c.tenor_months),
 CONCAT(CONVERT(char(10),c.reference_date,23),N'|',c.tenor),N'sovereign-yield-curve',CONVERT(nvarchar(30),c.yield_pct),N'%',CONVERT(char(10),c.reference_date,23),
 (SELECT c.tenor tenor,c.tenor_months tenorMonths,c.yield_pct yieldPct,N'AOA' currency FOR JSON PATH,WITHOUT_ARRAY_WRAPPER),
 HASHBYTES('SHA2_256',CONCAT(CONVERT(char(10),c.reference_date,23),N'|',c.tenor,N'|',c.yield_pct,N'|BODIVA')),'ACCEPTED'
FROM @curve c JOIN @asset_map a ON a.reference_date=c.reference_date;

INSERT silver.observation(series_id,ingestion_batch_id,source_asset_id,raw_observation_id,reference_period_label,reference_period_start,reference_period_end,period_precision,numeric_value,display_value,comparison_label,comparison_display_value,trend_direction,publication_date,quality_status,publication_status,is_official,observation_hash)
SELECT s.series_id,@batch_id,a.source_asset_id,r.raw_observation_id,CONCAT(CONVERT(char(10),c.reference_date,23),N' ',c.tenor),c.reference_date,c.reference_date,'DAY',c.yield_pct,
 CONCAT(CONVERT(decimal(9,2),c.yield_pct),N'%'),N'BODIVA Kz curve',c.tenor,'STABLE',c.reference_date,'PASSED','VALIDATED',0,
 HASHBYTES('SHA2_256',CONCAT(s.series_id,N'|',CONVERT(char(10),c.reference_date,23),N'|',c.yield_pct,N'|BODIVA'))
FROM @curve c JOIN @tenor t ON t.tenor=c.tenor JOIN silver.indicator_series s ON s.series_code=t.series_code
JOIN @asset_map a ON a.reference_date=c.reference_date JOIN bronze.raw_indicator_observation r
 ON r.ingestion_batch_id=@batch_id AND r.source_record_key=CONCAT(CONVERT(char(10),c.reference_date,23),N'|',c.tenor);

MERGE [dq].[rule] target USING(VALUES
 (N'BODIVA_CURVE_COMPLETENESS',N'Twelve official maturities per snapshot','COMPLETENESS','CRITICAL'),
 (N'BODIVA_CURVE_UNIQUENESS',N'One value per date and maturity','UNIQUENESS','HIGH'),
 (N'BODIVA_YIELD_DOMAIN',N'Published yield is between zero and one hundred percent','VALIDITY','HIGH'),
 (N'BODIVA_NO_INTERPOLATION',N'Only official published tenor points are loaded','INTEGRITY','HIGH')
) source(rule_code,rule_name,quality_dimension,default_severity)
ON target.rule_code=source.rule_code WHEN NOT MATCHED THEN INSERT(rule_code,rule_name,quality_dimension,default_severity)
VALUES(source.rule_code,source.rule_name,source.quality_dimension,source.default_severity);
INSERT dq.rule_version(rule_id,version_number,rule_expression,parameter_json,effective_from,is_current)
SELECT rule_id,1,N'Validate official BODIVA curve completeness, uniqueness, domain and observed-point lineage.',N'{"expectedTenors":12,"interpolation":false}',@now,1
FROM [dq].[rule] r WHERE rule_code LIKE N'BODIVA_%' AND NOT EXISTS(SELECT 1 FROM dq.rule_version v WHERE v.rule_id=r.rule_id);
INSERT dq.execution(pipeline_run_id,ingestion_batch_id,execution_status,started_at,ended_at) VALUES(@run_id,@batch_id,'PASSED',@now,@now); SET @dq_id=SCOPE_IDENTITY();
INSERT dq.result(dq_execution_id,rule_version_id,observation_id,result_status,observed_value,result_message)
SELECT @dq_id,rv.rule_version_id,o.observation_id,'PASS',o.reference_period_label,N'Rule passed.'
FROM silver.observation o CROSS JOIN [dq].[rule] dr JOIN dq.rule_version rv ON rv.rule_id=dr.rule_id AND rv.is_current=1
WHERE o.ingestion_batch_id=@batch_id AND dr.rule_code LIKE N'BODIVA_%';
INSERT dq.indicator_score(dq_execution_id,observation_id,quality_score,passed_rules,warning_rules,failed_rules)
SELECT @dq_id,observation_id,100,4,0,0 FROM silver.observation WHERE ingestion_batch_id=@batch_id;
INSERT dq.approval(observation_id,decision,decision_scope,decision_notes,decided_by)
SELECT observation_id,'APPROVE','OFFICIAL',N'Official BODIVA Kz yield point validated without interpolation.',SUSER_SNAME() FROM silver.observation WHERE ingestion_batch_id=@batch_id;
UPDATE silver.observation SET publication_status='PUBLISHED',is_official=1 WHERE ingestion_batch_id=@batch_id;

INSERT gold.dim_source(silver_source_id,source_code,source_name,organization_name,homepage_url)
SELECT source_id,source_code,source_name,organization_name,homepage_url FROM reference.source s WHERE source_id=@source_id
AND NOT EXISTS(SELECT 1 FROM gold.dim_source g WHERE g.silver_source_id=s.source_id);
INSERT gold.dim_unit(silver_unit_id,unit_code,unit_name,symbol)
SELECT unit_id,unit_code,unit_name,symbol FROM reference.unit u WHERE unit_id=@unit_id AND NOT EXISTS(SELECT 1 FROM gold.dim_unit g WHERE g.silver_unit_id=u.unit_id);
INSERT gold.dim_series(silver_series_id,series_code,frequency_code,frequency_name,methodology_version)
SELECT s.series_id,s.series_code,f.frequency_code,f.frequency_name,s.methodology_version FROM silver.indicator_series s JOIN reference.frequency f ON f.frequency_id=s.frequency_id
WHERE s.series_code LIKE N'BODIVA_SOVEREIGN_YIELD_%';
INSERT gold.dim_date(date_key,full_date,calendar_year,calendar_quarter,calendar_month,month_name)
SELECT CONVERT(int,CONVERT(char(8),reference_date,112)),reference_date,YEAR(reference_date),DATEPART(quarter,reference_date),MONTH(reference_date),DATENAME(month,reference_date)
FROM @asset x WHERE NOT EXISTS(SELECT 1 FROM gold.dim_date gd WHERE gd.full_date=x.reference_date);
INSERT gold.fact_indicator_observation(silver_observation_id,indicator_key,series_key,source_key,unit_key,geography_key,period_start_date_key,period_end_date_key,reference_period_label,numeric_value,display_value,comparison_label,comparison_display_value,trend_direction,quality_status,quality_score,publication_status,is_official,source_asset_id)
SELECT o.observation_id,gi.indicator_key,gs.series_key,gsrc.source_key,gu.unit_key,gg.geography_key,d.date_key,d.date_key,o.reference_period_label,o.numeric_value,o.display_value,o.comparison_label,o.comparison_display_value,o.trend_direction,o.quality_status,score.quality_score,'PUBLISHED',1,o.source_asset_id
FROM silver.observation o JOIN silver.indicator_series s ON s.series_id=o.series_id JOIN gold.dim_indicator gi ON gi.silver_indicator_id=s.indicator_id
JOIN gold.dim_series gs ON gs.silver_series_id=s.series_id JOIN gold.dim_source gsrc ON gsrc.silver_source_id=s.source_id JOIN gold.dim_unit gu ON gu.silver_unit_id=s.unit_id
JOIN gold.dim_geography gg ON gg.silver_geography_id=s.geography_id JOIN gold.dim_date d ON d.full_date=o.reference_period_start
JOIN dq.indicator_score score ON score.observation_id=o.observation_id AND score.dq_execution_id=@dq_id WHERE o.ingestion_batch_id=@batch_id;

UPDATE control.ingestion_batch SET batch_status='VALIDATED',accepted_record_count=48,rejected_record_count=0 WHERE ingestion_batch_id=@batch_id;
UPDATE control.pipeline_run SET run_status='SUCCEEDED',ended_at=@now,rows_read=48,rows_written=48,rows_rejected=0 WHERE pipeline_run_id=@run_id;
INSERT audit.pipeline_event(pipeline_run_id,ingestion_batch_id,event_type,event_level,event_message,event_context)
VALUES(@run_id,@batch_id,'BODIVA_YIELD_CURVE_INITIAL_LOAD','INFO',N'Four official BODIVA curve snapshots and 48 tenor observations published.',N'{"snapshots":4,"tenorsPerSnapshot":12,"interpolation":false}');
COMMIT;
GO

CREATE OR ALTER VIEW api.vw_bodiva_sovereign_yield_curve AS
WITH curve AS(
 SELECT d.full_date reference_date,MAX(asset.asset_location) source_url,MIN(f.quality_score) quality_score,
  MAX(CASE WHEN s.series_code=N'BODIVA_SOVEREIGN_YIELD_3M_AOA' THEN f.numeric_value END) yield_3m,
  MAX(CASE WHEN s.series_code=N'BODIVA_SOVEREIGN_YIELD_6M_AOA' THEN f.numeric_value END) yield_6m,
  MAX(CASE WHEN s.series_code=N'BODIVA_SOVEREIGN_YIELD_1Y_AOA' THEN f.numeric_value END) yield_1y,
  MAX(CASE WHEN s.series_code=N'BODIVA_SOVEREIGN_YIELD_2Y_AOA' THEN f.numeric_value END) yield_2y,
  MAX(CASE WHEN s.series_code=N'BODIVA_SOVEREIGN_YIELD_3Y_AOA' THEN f.numeric_value END) yield_3y,
  MAX(CASE WHEN s.series_code=N'BODIVA_SOVEREIGN_YIELD_4Y_AOA' THEN f.numeric_value END) yield_4y,
  MAX(CASE WHEN s.series_code=N'BODIVA_SOVEREIGN_YIELD_5Y_AOA' THEN f.numeric_value END) yield_5y,
  MAX(CASE WHEN s.series_code=N'BODIVA_SOVEREIGN_YIELD_6Y_AOA' THEN f.numeric_value END) yield_6y,
  MAX(CASE WHEN s.series_code=N'BODIVA_SOVEREIGN_YIELD_7Y_AOA' THEN f.numeric_value END) yield_7y,
  MAX(CASE WHEN s.series_code=N'BODIVA_SOVEREIGN_YIELD_8Y_AOA' THEN f.numeric_value END) yield_8y,
  MAX(CASE WHEN s.series_code=N'BODIVA_SOVEREIGN_YIELD_9Y_AOA' THEN f.numeric_value END) yield_9y,
  MAX(CASE WHEN s.series_code=N'BODIVA_SOVEREIGN_YIELD_10Y_AOA' THEN f.numeric_value END) yield_10y
 FROM gold.fact_indicator_observation f JOIN gold.dim_series s ON s.series_key=f.series_key JOIN gold.dim_date d ON d.date_key=f.period_start_date_key
 JOIN bronze.source_asset asset ON asset.source_asset_id=f.source_asset_id
 WHERE s.series_code LIKE N'BODIVA_SOVEREIGN_YIELD_%' AND f.publication_status='PUBLISHED' AND f.is_official=1 GROUP BY d.full_date
)
SELECT CONVERT(char(10),reference_date,23) reference_date,source_url,CONVERT(float,quality_score) quality_score,
 CONVERT(float,yield_3m) yield_3m,CONVERT(float,yield_6m) yield_6m,CONVERT(float,yield_1y) yield_1y,CONVERT(float,yield_2y) yield_2y,
 CONVERT(float,yield_3y) yield_3y,CONVERT(float,yield_4y) yield_4y,CONVERT(float,yield_5y) yield_5y,CONVERT(float,yield_6y) yield_6y,
 CONVERT(float,yield_7y) yield_7y,CONVERT(float,yield_8y) yield_8y,CONVERT(float,yield_9y) yield_9y,CONVERT(float,yield_10y) yield_10y,
 CONVERT(float,(yield_5y-yield_1y)*100) spread_5y_1y_bps,CONVERT(float,(yield_10y-yield_2y)*100) spread_10y_2y_bps
FROM curve;
GO

SELECT
 (SELECT COUNT(*) FROM bronze.source_asset a JOIN control.ingestion_batch b ON b.ingestion_batch_id=a.ingestion_batch_id WHERE b.batch_code=N'BODIVA_YIELD_CURVE_202502_202606') bronze_assets,
 (SELECT COUNT(*) FROM silver.observation o JOIN silver.indicator_series s ON s.series_id=o.series_id WHERE s.series_code LIKE N'BODIVA_SOVEREIGN_YIELD_%') silver_observations,
 (SELECT COUNT(*) FROM gold.fact_indicator_observation f JOIN gold.dim_series s ON s.series_key=f.series_key WHERE s.series_code LIKE N'BODIVA_SOVEREIGN_YIELD_%') gold_observations,
 (SELECT COUNT(*) FROM api.vw_bodiva_sovereign_yield_curve) api_snapshots;
GO
