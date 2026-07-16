USE [LAZA_DATA_PLATFORM_DEV];
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

IF EXISTS(SELECT 1 FROM silver.indicator_series WHERE series_code=N'BANKING_ASSETS_AGO_BNA_OSD_MONTHLY')
 THROW 51400,'Official BNA banking-assets series already exists.',1;

DECLARE @assets TABLE(period_label nvarchar(7),total_assets_million bigint,total_liabilities_million bigint);
INSERT @assets VALUES
(N'2021-01',21421355,21421355),(N'2021-02',21008149,21008149),(N'2021-03',21209587,21209587),(N'2021-04',21823897,21823897),
(N'2021-05',21431501,21431501),(N'2021-06',21606593,21606593),(N'2021-07',21399698,21399698),(N'2021-08',21586631,21586631),
(N'2021-09',20585777,20585777),(N'2021-10',20524303,20524303),(N'2021-11',20155477,20155477),(N'2021-12',20525874,20525874),
(N'2022-01',20413342,20413342),(N'2022-02',20486321,20486321),(N'2022-03',19359498,19359498),(N'2022-04',19129726,19129726),
(N'2022-05',19343422,19343422),(N'2022-06',19605076,19605076),(N'2022-07',19838015,19838015),(N'2022-08',19466800,19466800),
(N'2022-09',19680095,19680095),(N'2022-10',20551042,20551042),(N'2022-11',21071499,21071499),(N'2022-12',20654947,20654947),
(N'2023-01',20445368,20445368),(N'2023-02',20699859,20699859),(N'2023-03',20515615,20515615),(N'2023-04',20739067,20739067),
(N'2023-05',22036997,22036997),(N'2023-06',25125348,25125348),(N'2023-07',24975739,24975739),(N'2023-08',25294123,25294123),
(N'2023-09',25389583,25389583),(N'2023-10',25381163,25381163),(N'2023-11',24121858,24121858),(N'2023-12',24487478,24487478),
(N'2024-01',24330915,24330915),(N'2024-02',24283376,24283376),(N'2024-03',24663824,24663824),(N'2024-04',25050326,25050326),
(N'2024-05',24716274,24716274),(N'2024-06',24663432,24663432),(N'2024-07',25338732,25338732),(N'2024-08',25465966,25465966),
(N'2024-09',26359009,26359009),(N'2024-10',26259008,26259008),(N'2024-11',26205260,26205260),(N'2024-12',25714402,25714402),
(N'2025-01',25568791,25568791),(N'2025-02',25588497,25588497),(N'2025-03',26042629,26042629),(N'2025-04',26173125,26173125),
(N'2025-05',26106563,26106563),(N'2025-06',26456939,26456939),(N'2025-07',26695433,26695433),(N'2025-08',26956252,26956252),
(N'2025-09',27738634,27738634),(N'2025-10',27826846,27826846),(N'2025-11',28237016,28237016),(N'2025-12',28251116,28251116),
(N'2026-01',28286857,28286857),(N'2026-02',28428564,28428564),(N'2026-03',29005018,29005018),(N'2026-04',29774581,29774581),
(N'2026-05',29729827,29729827);

IF (SELECT COUNT(*) FROM @assets)<>65
 OR (SELECT MIN(period_label) FROM @assets)<>N'2021-01'
 OR (SELECT MAX(period_label) FROM @assets)<>N'2026-05'
 OR EXISTS(SELECT period_label FROM @assets GROUP BY period_label HAVING COUNT(*)>1)
 OR EXISTS(SELECT 1 FROM @assets WHERE total_assets_million<=0 OR total_assets_million<>total_liabilities_million)
 THROW 51401,'Banking-assets completeness, uniqueness, positivity, or balance reconciliation failed.',1;

BEGIN TRANSACTION;
DECLARE @now datetime2(3)=SYSUTCDATETIME(),@pipeline_id int,@run_id bigint,@batch_id bigint,@source_id int,@asset_id bigint,
 @indicator_id int,@unit_id int,@frequency_id int,@geo_id int,@series_id int,@dq_id bigint;

IF NOT EXISTS(SELECT 1 FROM control.pipeline_definition WHERE pipeline_code=N'BNA_OSD_BANKING_ASSETS')
 INSERT control.pipeline_definition(pipeline_code,pipeline_name,source_system)VALUES(N'BNA_OSD_BANKING_ASSETS',N'BNA other depository corporations total assets',N'Banco Nacional de Angola');
SELECT @pipeline_id=pipeline_id FROM control.pipeline_definition WHERE pipeline_code=N'BNA_OSD_BANKING_ASSETS';
INSERT control.pipeline_run(pipeline_id,run_status,trigger_type,started_at)VALUES(@pipeline_id,'STARTED','MANUAL',@now); SET @run_id=SCOPE_IDENTITY();
INSERT control.ingestion_batch(pipeline_run_id,batch_code,data_classification,batch_status,acquired_at,source_record_count)
VALUES(@run_id,N'BNA_OSD_BALANCE_20260615_AB3B423A47D9','OFFICIAL','RECEIVED',@now,65); SET @batch_id=SCOPE_IDENTITY();

IF NOT EXISTS(SELECT 1 FROM reference.source WHERE source_code=N'BNA_MONETARY_FINANCIAL_STATISTICS')
 INSERT reference.source(source_code,source_name,organization_name,homepage_url,source_type)
 VALUES(N'BNA_MONETARY_FINANCIAL_STATISTICS',N'BNA Monetary and Financial Statistics',N'Banco Nacional de Angola',N'https://www.bna.ao/estatisticas/estatisticas-monetarias-financeiras','OFFICIAL');
SELECT @source_id=source_id FROM reference.source WHERE source_code=N'BNA_MONETARY_FINANCIAL_STATISTICS';
IF NOT EXISTS(SELECT 1 FROM reference.unit WHERE unit_code=N'AOA_TRILLION')
 INSERT reference.unit(unit_code,unit_name,symbol,scale_factor)VALUES(N'AOA_TRILLION',N'Kwanza trillion',N'Kz tn',1000000000000);
SELECT @unit_id=unit_id FROM reference.unit WHERE unit_code=N'AOA_TRILLION';

INSERT bronze.source_asset(ingestion_batch_id,source_id,asset_type,asset_name,asset_location,source_version,publication_date,acquired_at,content_hash,content_size_bytes,metadata_json,is_official)
VALUES(@batch_id,@source_id,'XLSX',N'bna_balance_other_depository_corporations_2026_05.xls',N'https://www.bna.ao/service/rest/file/getPDF/v2?url=_layouts/15/DocIdRedir.aspx?ID=AE2CRDQUTFAC-2123509798-1517',N'BNA OSD balance; CMS item 1517; BIFF8 workbook published 15 June 2026','20260615',@now,
CONVERT(varbinary(32),'AB3B423A47D9AC6C55ED938D6D19EFE32FBDAB62322821C0520DD0DBF1FA3DBB',2),276992,N'{"sheet":"IC2.Balanço das OSD","rows":{"totalAssets":39,"totalLiabilities":72},"sourceUnit":"millions of Kwanzas","publishedThrough":"2026-05","preliminaryYear":2026,"fileFormat":"BIFF8 XLS"}',1); SET @asset_id=SCOPE_IDENTITY();

;WITH normalized AS(
 SELECT a.*,DATEFROMPARTS(CONVERT(int,LEFT(period_label,4)),CONVERT(int,RIGHT(period_label,2)),1) period_start
 FROM @assets a)
INSERT bronze.raw_indicator_observation(ingestion_batch_id,source_asset_id,source_row_number,source_record_key,indicator_code_raw,value_raw,unit_raw,period_raw,raw_payload,record_hash,bronze_status)
SELECT @batch_id,@asset_id,ROW_NUMBER()OVER(ORDER BY period_start),period_label,N'banking-assets',CONVERT(nvarchar(30),total_assets_million),N'million Kz',period_label,
 CONCAT(N'{"period":"',period_label,N'","totalAssetsMillionKz":',total_assets_million,N',"totalLiabilitiesMillionKz":',total_liabilities_million,N',"preliminary":',CASE WHEN YEAR(period_start)=2026 THEN N'true' ELSE N'false' END,N'}'),
 HASHBYTES('SHA2_256',CONCAT(period_label,N'|',total_assets_million,N'|',total_liabilities_million,N'|BNA_OSD_1517')),'ACCEPTED' FROM normalized;

SELECT @indicator_id=indicator_id FROM silver.indicator WHERE indicator_code=N'banking-assets';
SELECT @frequency_id=frequency_id FROM reference.frequency WHERE frequency_code=N'MONTHLY';
SELECT @geo_id=geography_id FROM reference.geography WHERE geography_code=N'AGO';
UPDATE silver.indicator SET business_definition=N'Total assets of Angola other depository corporations at month end, expressed in trillion Kwanzas.',updated_at=@now WHERE indicator_id=@indicator_id;
UPDATE gold.dim_indicator SET business_definition=N'Total assets of Angola other depository corporations at month end, expressed in trillion Kwanzas.',loaded_at=@now WHERE silver_indicator_id=@indicator_id;
INSERT silver.indicator_series(series_code,indicator_id,source_id,unit_id,frequency_id,geography_id,methodology_version,methodology_notes,series_status)
VALUES(N'BANKING_ASSETS_AGO_BNA_OSD_MONTHLY',@indicator_id,@source_id,@unit_id,@frequency_id,@geo_id,N'BNA OSD balance published 15 June 2026',N'Official Total do activo row. Published million-Kwanza balances are divided by 1,000,000 to express trillion Kwanzas. Total assets reconcile exactly to total liabilities after published-value rounding. 2026 is preliminary.','VALIDATED'); SET @series_id=SCOPE_IDENTITY();

;WITH normalized AS(
 SELECT a.*,DATEFROMPARTS(CONVERT(int,LEFT(period_label,4)),CONVERT(int,RIGHT(period_label,2)),1) period_start
 FROM @assets a), compared AS(
 SELECT *,LAG(total_assets_million,12)OVER(ORDER BY period_start) prior_year_assets FROM normalized)
INSERT silver.observation(series_id,ingestion_batch_id,source_asset_id,raw_observation_id,reference_period_label,reference_period_start,reference_period_end,period_precision,numeric_value,display_value,comparison_label,comparison_display_value,trend_direction,publication_date,quality_status,publication_status,is_official,observation_hash)
SELECT @series_id,@batch_id,@asset_id,r.raw_observation_id,c.period_label,c.period_start,EOMONTH(c.period_start),'MONTH',CONVERT(decimal(38,10),c.total_assets_million)/1000000,
 CONCAT(N'Kz ',CONVERT(decimal(10,2),CONVERT(decimal(38,10),c.total_assets_million)/1000000),N'tn'),N'vs same month previous year',
 CASE WHEN prior_year_assets IS NULL THEN NULL ELSE CONCAT(CASE WHEN total_assets_million>=prior_year_assets THEN N'+' ELSE N'' END,CONVERT(decimal(9,2),(CONVERT(decimal(38,10),total_assets_million)/prior_year_assets-1)*100),N'%') END,
 CASE WHEN prior_year_assets IS NULL THEN 'STABLE' WHEN total_assets_million>prior_year_assets THEN 'UP' WHEN total_assets_million<prior_year_assets THEN 'DOWN' ELSE 'STABLE' END,
 '20260615','PASSED','VALIDATED',0,HASHBYTES('SHA2_256',CONCAT(@series_id,N'|',c.period_label,N'|',c.total_assets_million))
FROM compared c JOIN bronze.raw_indicator_observation r ON r.ingestion_batch_id=@batch_id AND r.source_record_key=c.period_label;

MERGE [dq].[rule] t USING(VALUES
 (N'BNA_BANK_ASSETS_COMPLETE_MONTHS',N'Banking assets required monthly fields','COMPLETENESS','CRITICAL'),
 (N'BNA_BANK_ASSETS_UNIQUE_MONTH',N'Banking assets month uniqueness','UNIQUENESS','CRITICAL'),
 (N'BNA_BANK_ASSETS_BALANCE_RECONCILIATION',N'Total assets equal total liabilities','CONSISTENCY','CRITICAL'),
 (N'BNA_BANK_ASSETS_PRELIMINARY_STATUS',N'Preliminary source periods identified','VALIDITY','LOW'))s(code,name,dimension,severity)
ON t.rule_code=s.code WHEN NOT MATCHED THEN INSERT(rule_code,rule_name,quality_dimension,default_severity)VALUES(s.code,s.name,s.dimension,s.severity);
INSERT dq.rule_version(rule_id,version_number,rule_expression,parameter_json,effective_from,is_current)
SELECT r.rule_id,1,N'65 unique complete months; positive values; total assets equal total liabilities; 2026 explicitly preliminary.',N'{"expectedRows":65,"firstPeriod":"2021-01","lastPeriod":"2026-05","preliminaryYear":2026}',@now,1 FROM [dq].[rule] r WHERE r.rule_code LIKE N'BNA_BANK_ASSETS_%' AND NOT EXISTS(SELECT 1 FROM dq.rule_version v WHERE v.rule_id=r.rule_id);
INSERT dq.execution(pipeline_run_id,ingestion_batch_id,execution_status,started_at,ended_at)VALUES(@run_id,@batch_id,'WARNING',@now,@now); SET @dq_id=SCOPE_IDENTITY();
INSERT dq.result(dq_execution_id,rule_version_id,observation_id,result_status,observed_value,result_message)
SELECT @dq_id,v.rule_version_id,o.observation_id,CASE WHEN r.rule_code=N'BNA_BANK_ASSETS_PRELIMINARY_STATUS' AND YEAR(o.reference_period_start)=2026 THEN 'WARN' ELSE 'PASS' END,o.reference_period_label,
 CASE WHEN r.rule_code=N'BNA_BANK_ASSETS_PRELIMINARY_STATUS' AND YEAR(o.reference_period_start)=2026 THEN N'BNA marks 2026 values as preliminary; value retained with explicit warning.' ELSE N'Rule passed.' END
FROM silver.observation o CROSS JOIN [dq].[rule] r JOIN dq.rule_version v ON v.rule_id=r.rule_id AND v.is_current=1 WHERE o.ingestion_batch_id=@batch_id AND r.rule_code LIKE N'BNA_BANK_ASSETS_%';
INSERT dq.indicator_score(dq_execution_id,observation_id,quality_score,passed_rules,warning_rules,failed_rules)
SELECT @dq_id,observation_id,CASE WHEN YEAR(reference_period_start)=2026 THEN 99.50 ELSE 100 END,CASE WHEN YEAR(reference_period_start)=2026 THEN 3 ELSE 4 END,CASE WHEN YEAR(reference_period_start)=2026 THEN 1 ELSE 0 END,0 FROM silver.observation WHERE ingestion_batch_id=@batch_id;
INSERT dq.approval(observation_id,decision,decision_scope,decision_notes,decided_by)SELECT observation_id,'APPROVE','OFFICIAL',N'Official BNA OSD balance validated; 2026 preliminary status retained.',SUSER_SNAME() FROM silver.observation WHERE ingestion_batch_id=@batch_id;
UPDATE silver.observation SET publication_status='PUBLISHED',is_official=1 WHERE ingestion_batch_id=@batch_id;

INSERT gold.dim_source(silver_source_id,source_code,source_name,organization_name,homepage_url)SELECT source_id,source_code,source_name,organization_name,homepage_url FROM reference.source s WHERE source_id=@source_id AND NOT EXISTS(SELECT 1 FROM gold.dim_source g WHERE g.silver_source_id=s.source_id);
INSERT gold.dim_unit(silver_unit_id,unit_code,unit_name,symbol)SELECT unit_id,unit_code,unit_name,symbol FROM reference.unit u WHERE unit_id=@unit_id AND NOT EXISTS(SELECT 1 FROM gold.dim_unit g WHERE g.silver_unit_id=u.unit_id);
INSERT gold.dim_series(silver_series_id,series_code,frequency_code,frequency_name,methodology_version)SELECT s.series_id,s.series_code,f.frequency_code,f.frequency_name,s.methodology_version FROM silver.indicator_series s JOIN reference.frequency f ON f.frequency_id=s.frequency_id WHERE s.series_id=@series_id;
;WITH dates AS(SELECT DATEFROMPARTS(CONVERT(int,LEFT(period_label,4)),CONVERT(int,RIGHT(period_label,2)),1) d FROM @assets UNION SELECT EOMONTH(DATEFROMPARTS(CONVERT(int,LEFT(period_label,4)),CONVERT(int,RIGHT(period_label,2)),1)) FROM @assets)
INSERT gold.dim_date(date_key,full_date,calendar_year,calendar_quarter,calendar_month,month_name)SELECT CONVERT(int,CONVERT(char(8),d,112)),d,YEAR(d),DATEPART(quarter,d),MONTH(d),DATENAME(month,d) FROM dates x WHERE NOT EXISTS(SELECT 1 FROM gold.dim_date gd WHERE gd.full_date=x.d);
INSERT gold.fact_indicator_observation(silver_observation_id,indicator_key,series_key,source_key,unit_key,geography_key,period_start_date_key,period_end_date_key,reference_period_label,numeric_value,display_value,comparison_label,comparison_display_value,trend_direction,quality_status,quality_score,publication_status,is_official,source_asset_id)
SELECT o.observation_id,gi.indicator_key,gs.series_key,gsrc.source_key,gu.unit_key,gg.geography_key,ds.date_key,de.date_key,o.reference_period_label,o.numeric_value,o.display_value,o.comparison_label,o.comparison_display_value,o.trend_direction,o.quality_status,sc.quality_score,'PUBLISHED',1,o.source_asset_id FROM silver.observation o JOIN silver.indicator_series s ON s.series_id=o.series_id JOIN gold.dim_indicator gi ON gi.silver_indicator_id=s.indicator_id JOIN gold.dim_series gs ON gs.silver_series_id=s.series_id JOIN gold.dim_source gsrc ON gsrc.silver_source_id=s.source_id JOIN gold.dim_unit gu ON gu.silver_unit_id=s.unit_id JOIN gold.dim_geography gg ON gg.silver_geography_id=s.geography_id JOIN gold.dim_date ds ON ds.full_date=o.reference_period_start JOIN gold.dim_date de ON de.full_date=o.reference_period_end JOIN dq.indicator_score sc ON sc.observation_id=o.observation_id AND sc.dq_execution_id=@dq_id WHERE o.ingestion_batch_id=@batch_id;
UPDATE control.ingestion_batch SET batch_status='VALIDATED',accepted_record_count=65,rejected_record_count=0 WHERE ingestion_batch_id=@batch_id;
UPDATE control.pipeline_run SET run_status='SUCCEEDED',ended_at=@now,rows_read=65,rows_written=65,rows_rejected=0 WHERE pipeline_run_id=@run_id;
INSERT audit.pipeline_event(pipeline_run_id,ingestion_batch_id,event_type,event_level,event_message,event_context)VALUES(@run_id,@batch_id,'BNA_BANKING_ASSETS_INITIAL_LOAD','WARN',N'65 official BNA monthly total-asset balances published; 2026 observations explicitly preliminary.',N'{"periodStart":"2021-01","periodEnd":"2026-05","rows":65,"balanceDifferences":0,"preliminaryRows":5}');
COMMIT;
SELECT @run_id pipeline_run_id,@batch_id ingestion_batch_id,65 bronze_rows,65 silver_months,65 gold_months,5 dq_warnings;
GO
