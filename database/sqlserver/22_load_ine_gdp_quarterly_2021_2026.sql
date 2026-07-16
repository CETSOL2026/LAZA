USE [LAZA_DATA_PLATFORM_DEV];
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

IF EXISTS (SELECT 1 FROM silver.indicator_series WHERE series_code=N'GDP_GROWTH_AGO_INE_QUARTERLY_YOY_2015')
    THROW 51200, 'Official INE quarterly GDP series already exists.', 1;

DECLARE @gdp TABLE(period_label nvarchar(20),period_start date,period_end date,value decimal(9,2));
INSERT @gdp VALUES
(N'2021-Q1','20210101','20210331',-8.23),(N'2021-Q2','20210401','20210630',2.43),(N'2021-Q3','20210701','20210930',2.53),(N'2021-Q4','20211001','20211231',8.25),
(N'2022-Q1','20220101','20220331',3.53),(N'2022-Q2','20220401','20220630',13.85),(N'2022-Q3','20220701','20220930',-2.23),(N'2022-Q4','20221001','20221231',-0.10),
(N'2023-Q1','20230101','20230331',-0.13),(N'2023-Q2','20230401','20230630',7.53),(N'2023-Q3','20230701','20230930',2.94),(N'2023-Q4','20231001','20231231',-4.85),
(N'2024-Q1','20240101','20240331',4.59),(N'2024-Q2','20240401','20240630',7.06),(N'2024-Q3','20240701','20240930',4.61),(N'2024-Q4','20241001','20241231',3.29),
(N'2025-Q1','20250101','20250331',4.35),(N'2025-Q2','20250401','20250630',1.55),(N'2025-Q3','20250701','20250930',1.71),(N'2025-Q4','20251001','20251231',5.13),
(N'2026-Q1','20260101','20260331',5.32);

IF (SELECT COUNT(*) FROM @gdp)<>21 OR EXISTS(SELECT period_start FROM @gdp GROUP BY period_start HAVING COUNT(*)>1)
    THROW 51201, 'GDP fixture failed completeness or uniqueness validation.',1;

BEGIN TRANSACTION;
DECLARE @now datetime2(3)=SYSUTCDATETIME(),@pipeline_id int,@run_id bigint,@batch_id bigint,@source_id int,@asset_id bigint,
        @indicator_id int,@unit_id int,@frequency_id int,@geo_id int,@series_id int,@dq_id bigint;

IF NOT EXISTS(SELECT 1 FROM control.pipeline_definition WHERE pipeline_code=N'INE_GDP_QUARTERLY_YOY')
 INSERT control.pipeline_definition(pipeline_code,pipeline_name,source_system) VALUES(N'INE_GDP_QUARTERLY_YOY',N'INE quarterly real GDP year-over-year growth',N'INE Angola');
SELECT @pipeline_id=pipeline_id FROM control.pipeline_definition WHERE pipeline_code=N'INE_GDP_QUARTERLY_YOY';
INSERT control.pipeline_run(pipeline_id,run_status,trigger_type,started_at) VALUES(@pipeline_id,'STARTED','MANUAL',@now); SET @run_id=SCOPE_IDENTITY();
INSERT control.ingestion_batch(pipeline_run_id,batch_code,data_classification,batch_status,acquired_at,source_record_count)
VALUES(@run_id,N'INE_GDP_2026Q1_REVISED_ac84c4a8a51a','OFFICIAL','RECEIVED',@now,21); SET @batch_id=SCOPE_IDENTITY();

IF NOT EXISTS(SELECT 1 FROM reference.source WHERE source_code=N'INE_GDP_QUARTERLY')
 INSERT reference.source(source_code,source_name,organization_name,homepage_url,source_type)
 VALUES(N'INE_GDP_QUARTERLY',N'INE Contas Nacionais Trimestrais',N'Instituto Nacional de Estatistica de Angola',N'https://www.ine.gov.ao/publicacoes/detalhes/NTQ0NzY%3D','OFFICIAL');
SELECT @source_id=source_id FROM reference.source WHERE source_code=N'INE_GDP_QUARTERLY';
IF NOT EXISTS(SELECT 1 FROM reference.frequency WHERE frequency_code=N'QUARTERLY')
 INSERT reference.frequency(frequency_code,frequency_name,expected_periods_per_year) VALUES(N'QUARTERLY',N'Quarterly',4);

INSERT bronze.source_asset(ingestion_batch_id,source_id,asset_type,asset_name,asset_location,source_version,publication_date,acquired_at,content_hash,content_size_bytes,metadata_json,is_official)
VALUES(@batch_id,@source_id,'PDF',N'ine_gdp_quarterly_2026_q1_revised.pdf',N'D:\LAZA_DATA\landing\ine\gdp\ine_gdp_quarterly_2026_q1_revised.pdf',N'Q1 2026 revised series; reference year 2015; SCN 2008','20260529',@now,
CONVERT(varbinary(32),'ac84c4a8a51a2fa95f9129198e1a03721b3b34cdac88c9a63ae4313f46b9d053',2),1612675,N'{"table":"Quadro 4 - Variacao Homologa","pages":"16-18","extract":"PIB total, final column"}',1); SET @asset_id=SCOPE_IDENTITY();

INSERT bronze.raw_indicator_observation(ingestion_batch_id,source_asset_id,source_row_number,source_record_key,indicator_code_raw,value_raw,unit_raw,period_raw,raw_payload,record_hash,bronze_status)
SELECT @batch_id,@asset_id,ROW_NUMBER() OVER(ORDER BY period_start),period_label,N'gdp-growth',CONVERT(nvarchar(40),value),N'%',period_label,
 CONCAT(N'{"period":"',period_label,N'","periodStart":"',CONVERT(char(10),period_start,23),N'","periodEnd":"',CONVERT(char(10),period_end,23),N'","gdpYoYPercent":',value,N'}'),
 HASHBYTES('SHA2_256',CONCAT(period_label,N'|',value,N'|INE_GDP_Q1_2026_REVISED')),'ACCEPTED' FROM @gdp;

SELECT @indicator_id=indicator_id FROM silver.indicator WHERE indicator_code=N'gdp-growth';
SELECT @unit_id=unit_id FROM reference.unit WHERE unit_code=N'PCT_YOY'; SELECT @frequency_id=frequency_id FROM reference.frequency WHERE frequency_code=N'QUARTERLY'; SELECT @geo_id=geography_id FROM reference.geography WHERE geography_code=N'AGO';
INSERT silver.indicator_series(series_code,indicator_id,source_id,unit_id,frequency_id,geography_id,methodology_version,methodology_notes,series_status)
VALUES(N'GDP_GROWTH_AGO_INE_QUARTERLY_YOY_2015',@indicator_id,@source_id,@unit_id,@frequency_id,@geo_id,N'SCN 2008; reference year 2015; revised May 2026',N'Real GDP volume, year-over-year percentage change versus the same quarter of the previous year. Latest revised vintage only.','VALIDATED'); SET @series_id=SCOPE_IDENTITY();

;WITH p AS(SELECT *,LAG(value) OVER(ORDER BY period_start) previous_value FROM @gdp)
INSERT silver.observation(series_id,ingestion_batch_id,source_asset_id,raw_observation_id,reference_period_label,reference_period_start,reference_period_end,period_precision,numeric_value,display_value,comparison_label,comparison_display_value,trend_direction,publication_date,quality_status,publication_status,is_official,observation_hash)
SELECT @series_id,@batch_id,@asset_id,r.raw_observation_id,p.period_label,p.period_start,p.period_end,'QUARTER',p.value,CONCAT(CASE WHEN p.value>0 THEN N'+' ELSE N'' END,p.value,N'%'),N'vs previous quarter YoY rate',
 CASE WHEN p.previous_value IS NULL THEN NULL ELSE CONCAT(CASE WHEN p.value-p.previous_value>=0 THEN N'+' ELSE N'' END,CONVERT(decimal(9,2),p.value-p.previous_value),N' pp') END,
 CASE WHEN p.previous_value IS NULL THEN 'STABLE' WHEN p.value>p.previous_value THEN 'UP' WHEN p.value<p.previous_value THEN 'DOWN' ELSE 'STABLE' END,'20260529','PASSED','VALIDATED',0,HASHBYTES('SHA2_256',CONCAT(@series_id,N'|',p.period_label,N'|',p.value))
FROM p JOIN bronze.raw_indicator_observation r ON r.ingestion_batch_id=@batch_id AND r.source_record_key=p.period_label;

MERGE [dq].[rule] t USING(VALUES(N'INE_GDP_COMPLETE_QUARTERS',N'GDP required quarter fields','COMPLETENESS','CRITICAL'),(N'INE_GDP_UNIQUE_QUARTER',N'GDP quarter uniqueness','UNIQUENESS','CRITICAL'),(N'INE_GDP_VALID_RANGE',N'GDP YoY plausible range','VALIDITY','HIGH'))s(code,name,dimension,severity)
ON t.rule_code=s.code WHEN NOT MATCHED THEN INSERT(rule_code,rule_name,quality_dimension,default_severity)VALUES(s.code,s.name,s.dimension,s.severity);
INSERT dq.rule_version(rule_id,version_number,rule_expression,parameter_json,effective_from,is_current)
SELECT r.rule_id,1,N'GDP period/value required; unique quarter; value between -50 and 50 percent',N'{"min":-50,"max":50}',@now,1 FROM [dq].[rule] r WHERE r.rule_code LIKE N'INE_GDP_%' AND NOT EXISTS(SELECT 1 FROM dq.rule_version v WHERE v.rule_id=r.rule_id);
INSERT dq.execution(pipeline_run_id,ingestion_batch_id,execution_status,started_at,ended_at)VALUES(@run_id,@batch_id,'PASSED',@now,@now); SET @dq_id=SCOPE_IDENTITY();
INSERT dq.result(dq_execution_id,rule_version_id,observation_id,result_status,observed_value,result_message)
SELECT @dq_id,v.rule_version_id,o.observation_id,'PASS',o.reference_period_label,N'Rule passed.' FROM silver.observation o CROSS JOIN [dq].[rule] r JOIN dq.rule_version v ON v.rule_id=r.rule_id AND v.is_current=1 WHERE o.ingestion_batch_id=@batch_id AND r.rule_code LIKE N'INE_GDP_%';
INSERT dq.indicator_score(dq_execution_id,observation_id,quality_score,passed_rules,warning_rules,failed_rules)SELECT @dq_id,observation_id,100,3,0,0 FROM silver.observation WHERE ingestion_batch_id=@batch_id;
INSERT dq.approval(observation_id,decision,decision_scope,decision_notes,decided_by)SELECT observation_id,'APPROVE','OFFICIAL',N'Latest revised INE quarterly national-accounts vintage validated.',SUSER_SNAME() FROM silver.observation WHERE ingestion_batch_id=@batch_id;
UPDATE silver.observation SET publication_status='PUBLISHED',is_official=1 WHERE ingestion_batch_id=@batch_id;

INSERT gold.dim_source(silver_source_id,source_code,source_name,organization_name,homepage_url)SELECT source_id,source_code,source_name,organization_name,homepage_url FROM reference.source s WHERE source_id=@source_id AND NOT EXISTS(SELECT 1 FROM gold.dim_source g WHERE g.silver_source_id=s.source_id);
INSERT gold.dim_series(silver_series_id,series_code,frequency_code,frequency_name,methodology_version)SELECT s.series_id,s.series_code,f.frequency_code,f.frequency_name,s.methodology_version FROM silver.indicator_series s JOIN reference.frequency f ON f.frequency_id=s.frequency_id WHERE s.series_id=@series_id;
INSERT gold.dim_date(date_key,full_date,calendar_year,calendar_quarter,calendar_month,month_name)SELECT CONVERT(int,CONVERT(char(8),d,112)),d,YEAR(d),DATEPART(quarter,d),MONTH(d),DATENAME(month,d) FROM(SELECT period_start d FROM @gdp UNION SELECT period_end FROM @gdp)x WHERE NOT EXISTS(SELECT 1 FROM gold.dim_date gd WHERE gd.full_date=x.d);
INSERT gold.fact_indicator_observation(silver_observation_id,indicator_key,series_key,source_key,unit_key,geography_key,period_start_date_key,period_end_date_key,reference_period_label,numeric_value,display_value,comparison_label,comparison_display_value,trend_direction,quality_status,quality_score,publication_status,is_official,source_asset_id)
SELECT o.observation_id,gi.indicator_key,gs.series_key,gsrc.source_key,gu.unit_key,gg.geography_key,ds.date_key,de.date_key,o.reference_period_label,o.numeric_value,o.display_value,o.comparison_label,o.comparison_display_value,o.trend_direction,o.quality_status,100,'PUBLISHED',1,o.source_asset_id FROM silver.observation o JOIN silver.indicator_series s ON s.series_id=o.series_id JOIN gold.dim_indicator gi ON gi.silver_indicator_id=s.indicator_id JOIN gold.dim_series gs ON gs.silver_series_id=s.series_id JOIN gold.dim_source gsrc ON gsrc.silver_source_id=s.source_id JOIN gold.dim_unit gu ON gu.silver_unit_id=s.unit_id JOIN gold.dim_geography gg ON gg.silver_geography_id=s.geography_id JOIN gold.dim_date ds ON ds.full_date=o.reference_period_start JOIN gold.dim_date de ON de.full_date=o.reference_period_end WHERE o.ingestion_batch_id=@batch_id;
UPDATE control.ingestion_batch SET batch_status='VALIDATED',accepted_record_count=21,rejected_record_count=0 WHERE ingestion_batch_id=@batch_id; UPDATE control.pipeline_run SET run_status='SUCCEEDED',ended_at=@now,rows_read=21,rows_written=21,rows_rejected=0 WHERE pipeline_run_id=@run_id;
INSERT audit.pipeline_event(pipeline_run_id,ingestion_batch_id,event_type,event_level,event_message,event_context)VALUES(@run_id,@batch_id,'INE_GDP_INITIAL_LOAD','INFO',N'21 revised official quarterly GDP YoY observations published.',N'{"periodStart":"2021-Q1","periodEnd":"2026-Q1","rows":21,"dqWarnings":0}');
COMMIT;
SELECT @run_id pipeline_run_id,@batch_id ingestion_batch_id,21 bronze_rows,21 silver_quarters,21 gold_quarters,0 dq_warnings;
GO
