USE [LAZA_DATA_PLATFORM_DEV];
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

IF EXISTS(SELECT 1 FROM silver.indicator_series WHERE series_code=N'POPULATION_AGO_INE_RGPH_CENSUS')
 THROW 51300,'Official INE census population series already exists.',1;

DECLARE @population TABLE(period_label nvarchar(30),reference_date date,persons bigint,millions decimal(19,6));
INSERT @population VALUES(N'Census 2014','20140516',25789024,25.789024),(N'Census 2024','20240919',36604681,36.604681);
IF (SELECT COUNT(*) FROM @population)<>2 OR EXISTS(SELECT reference_date FROM @population GROUP BY reference_date HAVING COUNT(*)>1)
 THROW 51301,'Population completeness or uniqueness validation failed.',1;

BEGIN TRANSACTION;
DECLARE @now datetime2(3)=SYSUTCDATETIME(),@pipeline_id int,@run_id bigint,@batch_id bigint,@source_id int,@asset_id bigint,
 @indicator_id int,@unit_id int,@frequency_id int,@geo_id int,@series_id int,@dq_id bigint;
IF NOT EXISTS(SELECT 1 FROM control.pipeline_definition WHERE pipeline_code=N'INE_RGPH_POPULATION')
 INSERT control.pipeline_definition(pipeline_code,pipeline_name,source_system)VALUES(N'INE_RGPH_POPULATION',N'INE resident population census totals',N'INE Angola');
SELECT @pipeline_id=pipeline_id FROM control.pipeline_definition WHERE pipeline_code=N'INE_RGPH_POPULATION';
INSERT control.pipeline_run(pipeline_id,run_status,trigger_type,started_at)VALUES(@pipeline_id,'STARTED','MANUAL',@now); SET @run_id=SCOPE_IDENTITY();
INSERT control.ingestion_batch(pipeline_run_id,batch_code,data_classification,batch_status,acquired_at,source_record_count)
VALUES(@run_id,N'INE_RGPH_2014_2024_FINAL_6fb5f034d0a8','OFFICIAL','RECEIVED',@now,2); SET @batch_id=SCOPE_IDENTITY();

IF NOT EXISTS(SELECT 1 FROM reference.source WHERE source_code=N'INE_RGPH_CENSUS')
 INSERT reference.source(source_code,source_name,organization_name,homepage_url,source_type)
 VALUES(N'INE_RGPH_CENSUS',N'INE RGPH 2024 definitive results',N'Instituto Nacional de Estatistica de Angola',N'https://ine.gov.ao/publicacoes/detalhes/NDc0MTE%3D','OFFICIAL');
SELECT @source_id=source_id FROM reference.source WHERE source_code=N'INE_RGPH_CENSUS';
IF NOT EXISTS(SELECT 1 FROM reference.frequency WHERE frequency_code=N'DECENNIAL_CENSUS')
 INSERT reference.frequency(frequency_code,frequency_name,expected_periods_per_year)VALUES(N'DECENNIAL_CENSUS',N'Decennial census',NULL);

INSERT bronze.source_asset(ingestion_batch_id,source_id,asset_type,asset_name,asset_location,source_version,publication_date,acquired_at,content_hash,content_size_bytes,metadata_json,is_official)
VALUES(@batch_id,@source_id,'PDF',N'ine_rgph_2024_final_summary.pdf',N'D:\LAZA_DATA\landing\ine\population\ine_rgph_2024_final_summary.pdf',N'RGPH 2024 definitive summary; published November 2025','20251120',@now,
CONVERT(varbinary(32),'6fb5f034d0a862c851b5d9f54d5848922ddda3b57549c79d8782b9cc67c026c3',2),3492679,N'{"table":"Quadro 1 - Sintese dos principais indicadores 2014-2024","pages":"7-9","concept":"resident population at census moment"}',1); SET @asset_id=SCOPE_IDENTITY();

INSERT bronze.raw_indicator_observation(ingestion_batch_id,source_asset_id,source_row_number,source_record_key,indicator_code_raw,value_raw,unit_raw,period_raw,raw_payload,record_hash,bronze_status)
SELECT @batch_id,@asset_id,ROW_NUMBER()OVER(ORDER BY reference_date),period_label,N'population',CONVERT(nvarchar(30),persons),N'persons',CONVERT(char(10),reference_date,23),
 CONCAT(N'{"census":"',period_label,N'","referenceDate":"',CONVERT(char(10),reference_date,23),N'","populationPersons":',persons,N',"populationMillions":',millions,N'}'),
 HASHBYTES('SHA2_256',CONCAT(period_label,N'|',persons,N'|RGPH_FINAL_2024')),'ACCEPTED' FROM @population;

SELECT @indicator_id=indicator_id FROM silver.indicator WHERE indicator_code=N'population'; SELECT @unit_id=unit_id FROM reference.unit WHERE unit_code=N'MILLION_PEOPLE'; SELECT @frequency_id=frequency_id FROM reference.frequency WHERE frequency_code=N'DECENNIAL_CENSUS'; SELECT @geo_id=geography_id FROM reference.geography WHERE geography_code=N'AGO';
UPDATE silver.indicator SET business_definition=N'Resident population counted at the official census reference moment.',updated_at=@now WHERE indicator_id=@indicator_id;
UPDATE gold.dim_indicator SET business_definition=N'Resident population counted at the official census reference moment.',loaded_at=@now WHERE silver_indicator_id=@indicator_id;
INSERT silver.indicator_series(series_code,indicator_id,source_id,unit_id,frequency_id,geography_id,methodology_version,methodology_notes,series_status)
VALUES(N'POPULATION_AGO_INE_RGPH_CENSUS',@indicator_id,@source_id,@unit_id,@frequency_id,@geo_id,N'RGPH 2024 definitive; comparison with RGPH 2014',N'Resident population counted at census reference moments: 16 May 2014 and 19 September 2024. Values stored in millions; exact persons retained in Bronze.','VALIDATED'); SET @series_id=SCOPE_IDENTITY();

;WITH p AS(SELECT *,LAG(persons)OVER(ORDER BY reference_date) previous_persons FROM @population)
INSERT silver.observation(series_id,ingestion_batch_id,source_asset_id,raw_observation_id,reference_period_label,reference_period_start,reference_period_end,period_precision,numeric_value,display_value,comparison_label,comparison_display_value,trend_direction,publication_date,quality_status,publication_status,is_official,observation_hash)
SELECT @series_id,@batch_id,@asset_id,r.raw_observation_id,p.period_label,p.reference_date,p.reference_date,'DAY',p.millions,CONCAT(CONVERT(decimal(10,2),p.millions),N'M'),N'vs previous census',
 CASE WHEN previous_persons IS NULL THEN NULL ELSE CONCAT(N'+',CONVERT(decimal(9,2),(CONVERT(decimal(19,6),persons)/previous_persons-1)*100),N'%') END,
 CASE WHEN previous_persons IS NULL THEN 'STABLE' WHEN persons>previous_persons THEN 'UP' ELSE 'DOWN' END,'20251120','PASSED','VALIDATED',0,HASHBYTES('SHA2_256',CONCAT(@series_id,N'|',period_label,N'|',persons))
FROM p JOIN bronze.raw_indicator_observation r ON r.ingestion_batch_id=@batch_id AND r.source_record_key=p.period_label;

MERGE [dq].[rule] t USING(VALUES(N'INE_POP_REQUIRED_FIELDS',N'Population required fields','COMPLETENESS','CRITICAL'),(N'INE_POP_UNIQUE_CENSUS',N'Population census uniqueness','UNIQUENESS','CRITICAL'),(N'INE_POP_NARRATIVE_RECONCILIATION',N'Population narrative arithmetic reconciliation','CONSISTENCY','LOW'))s(code,name,dimension,severity)
ON t.rule_code=s.code WHEN NOT MATCHED THEN INSERT(rule_code,rule_name,quality_dimension,default_severity)VALUES(s.code,s.name,s.dimension,s.severity);
INSERT dq.rule_version(rule_id,version_number,rule_expression,parameter_json,effective_from,is_current)
SELECT r.rule_id,1,N'Required and unique census totals; reconcile stated increase with subtraction of published totals.',N'{"reportedIncrease":10815656,"calculatedIncrease":10815657,"differencePersons":1}',@now,1 FROM [dq].[rule] r WHERE r.rule_code LIKE N'INE_POP_%' AND NOT EXISTS(SELECT 1 FROM dq.rule_version v WHERE v.rule_id=r.rule_id);
INSERT dq.execution(pipeline_run_id,ingestion_batch_id,execution_status,started_at,ended_at)VALUES(@run_id,@batch_id,'WARNING',@now,@now); SET @dq_id=SCOPE_IDENTITY();
INSERT dq.result(dq_execution_id,rule_version_id,observation_id,result_status,observed_value,result_message)
SELECT @dq_id,v.rule_version_id,o.observation_id,CASE WHEN r.rule_code=N'INE_POP_NARRATIVE_RECONCILIATION' AND o.reference_period_label=N'Census 2024' THEN 'WARN' ELSE 'PASS' END,o.reference_period_label,
 CASE WHEN r.rule_code=N'INE_POP_NARRATIVE_RECONCILIATION' AND o.reference_period_label=N'Census 2024' THEN N'Published totals differ by one person from the narrative increase; totals retained as authoritative and impact is immaterial.' ELSE N'Rule passed.' END
FROM silver.observation o CROSS JOIN [dq].[rule] r JOIN dq.rule_version v ON v.rule_id=r.rule_id AND v.is_current=1 WHERE o.ingestion_batch_id=@batch_id AND r.rule_code LIKE N'INE_POP_%';
INSERT dq.indicator_score(dq_execution_id,observation_id,quality_score,passed_rules,warning_rules,failed_rules)
SELECT @dq_id,o.observation_id,CASE WHEN o.reference_period_label=N'Census 2024' THEN 99.90 ELSE 100 END,CASE WHEN o.reference_period_label=N'Census 2024' THEN 2 ELSE 3 END,CASE WHEN o.reference_period_label=N'Census 2024' THEN 1 ELSE 0 END,0 FROM silver.observation o WHERE o.ingestion_batch_id=@batch_id;
INSERT dq.approval(observation_id,decision,decision_scope,decision_notes,decided_by)SELECT observation_id,'APPROVE','OFFICIAL',N'Official census totals approved; one-person narrative discrepancy is documented and immaterial.',SUSER_SNAME() FROM silver.observation WHERE ingestion_batch_id=@batch_id;
UPDATE silver.observation SET publication_status='PUBLISHED',is_official=1 WHERE ingestion_batch_id=@batch_id;

INSERT gold.dim_source(silver_source_id,source_code,source_name,organization_name,homepage_url)SELECT source_id,source_code,source_name,organization_name,homepage_url FROM reference.source s WHERE source_id=@source_id AND NOT EXISTS(SELECT 1 FROM gold.dim_source g WHERE g.silver_source_id=s.source_id);
INSERT gold.dim_series(silver_series_id,series_code,frequency_code,frequency_name,methodology_version)SELECT s.series_id,s.series_code,f.frequency_code,f.frequency_name,s.methodology_version FROM silver.indicator_series s JOIN reference.frequency f ON f.frequency_id=s.frequency_id WHERE s.series_id=@series_id;
INSERT gold.dim_date(date_key,full_date,calendar_year,calendar_quarter,calendar_month,month_name)SELECT CONVERT(int,CONVERT(char(8),reference_date,112)),reference_date,YEAR(reference_date),DATEPART(quarter,reference_date),MONTH(reference_date),DATENAME(month,reference_date) FROM @population p WHERE NOT EXISTS(SELECT 1 FROM gold.dim_date d WHERE d.full_date=p.reference_date);
INSERT gold.fact_indicator_observation(silver_observation_id,indicator_key,series_key,source_key,unit_key,geography_key,period_start_date_key,period_end_date_key,reference_period_label,numeric_value,display_value,comparison_label,comparison_display_value,trend_direction,quality_status,quality_score,publication_status,is_official,source_asset_id)
SELECT o.observation_id,gi.indicator_key,gs.series_key,gsrc.source_key,gu.unit_key,gg.geography_key,d.date_key,d.date_key,o.reference_period_label,o.numeric_value,o.display_value,o.comparison_label,o.comparison_display_value,o.trend_direction,o.quality_status,sc.quality_score,'PUBLISHED',1,o.source_asset_id FROM silver.observation o JOIN silver.indicator_series s ON s.series_id=o.series_id JOIN gold.dim_indicator gi ON gi.silver_indicator_id=s.indicator_id JOIN gold.dim_series gs ON gs.silver_series_id=s.series_id JOIN gold.dim_source gsrc ON gsrc.silver_source_id=s.source_id JOIN gold.dim_unit gu ON gu.silver_unit_id=s.unit_id JOIN gold.dim_geography gg ON gg.silver_geography_id=s.geography_id JOIN gold.dim_date d ON d.full_date=o.reference_period_start JOIN dq.indicator_score sc ON sc.observation_id=o.observation_id AND sc.dq_execution_id=@dq_id WHERE o.ingestion_batch_id=@batch_id;
UPDATE control.ingestion_batch SET batch_status='VALIDATED',accepted_record_count=2,rejected_record_count=0 WHERE ingestion_batch_id=@batch_id; UPDATE control.pipeline_run SET run_status='SUCCEEDED',ended_at=@now,rows_read=2,rows_written=2,rows_rejected=0 WHERE pipeline_run_id=@run_id;
INSERT audit.pipeline_event(pipeline_run_id,ingestion_batch_id,event_type,event_level,event_message,event_context)VALUES(@run_id,@batch_id,'INE_POPULATION_INITIAL_LOAD','WARN',N'Official 2014 and 2024 resident population census totals published; one-person narrative arithmetic discrepancy documented.',N'{"rows":2,"reportedIncrease":10815656,"calculatedIncrease":10815657,"differencePersons":1}');
COMMIT;
SELECT @run_id pipeline_run_id,@batch_id ingestion_batch_id,2 bronze_rows,2 silver_censuses,2 gold_censuses,1 dq_warning;
GO
