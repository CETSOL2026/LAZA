USE [LAZA_DATA_PLATFORM_DEV];
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

IF EXISTS(SELECT 1 FROM silver.indicator_series WHERE series_code=N'PUBLIC_DEBT_GDP_AGO_UGD_OFFICIAL_COMPONENTS')
 THROW 51500,'Official UGD public-debt-to-GDP series already exists.',1;

DECLARE @debt TABLE(period_label nvarchar(20),period_start date,period_end date,public_debt_pct decimal(9,2),government_debt_pct decimal(9,2),soe_unguaranteed_pct decimal(9,2),value_method varchar(20));
INSERT @debt VALUES
(N'2025','20250101','20251231',52.17,50.51,1.64,'PUBLISHED'),
(N'2026-Q1','20260101','20260331',48.09,46.39,1.70,'DERIVED');

IF (SELECT COUNT(*) FROM @debt)<>2 OR EXISTS(SELECT period_start FROM @debt GROUP BY period_start HAVING COUNT(*)>1)
 OR EXISTS(SELECT 1 FROM @debt WHERE public_debt_pct<=0 OR public_debt_pct>200 OR ABS(public_debt_pct-government_debt_pct-soe_unguaranteed_pct)>0.05)
 THROW 51501,'Public-debt completeness, uniqueness, range, or component reconciliation failed.',1;

BEGIN TRANSACTION;
DECLARE @now datetime2(3)=SYSUTCDATETIME(),@pipeline_id int,@run_id bigint,@batch_id bigint,@source_id int,@asset_2025 bigint,@asset_2026 bigint,
 @indicator_id int,@unit_id int,@frequency_id int,@geo_id int,@series_id int,@dq_id bigint;
IF NOT EXISTS(SELECT 1 FROM control.pipeline_definition WHERE pipeline_code=N'UGD_PUBLIC_DEBT_GDP')
 INSERT control.pipeline_definition(pipeline_code,pipeline_name,source_system)VALUES(N'UGD_PUBLIC_DEBT_GDP',N'UGD public debt to nominal GDP',N'UGD - Ministry of Finance Angola');
SELECT @pipeline_id=pipeline_id FROM control.pipeline_definition WHERE pipeline_code=N'UGD_PUBLIC_DEBT_GDP';
INSERT control.pipeline_run(pipeline_id,run_status,trigger_type,started_at)VALUES(@pipeline_id,'STARTED','MANUAL',@now); SET @run_id=SCOPE_IDENTITY();
INSERT control.ingestion_batch(pipeline_run_id,batch_code,data_classification,batch_status,acquired_at,source_record_count)
VALUES(@run_id,N'UGD_PUBLIC_DEBT_2025_2026Q1_E5E981C11611','OFFICIAL','RECEIVED',@now,2); SET @batch_id=SCOPE_IDENTITY();

IF NOT EXISTS(SELECT 1 FROM reference.source WHERE source_code=N'UGD_PUBLIC_DEBT_BULLETINS')
 INSERT reference.source(source_code,source_name,organization_name,homepage_url,source_type)
 VALUES(N'UGD_PUBLIC_DEBT_BULLETINS',N'UGD Public Debt Statistical Bulletins',N'Unidade de Gestao da Divida Publica - Ministerio das Financas',N'https://www.ugd.minfin.gov.ao/publicacoes/boletins-da-divida-publica','OFFICIAL');
SELECT @source_id=source_id FROM reference.source WHERE source_code=N'UGD_PUBLIC_DEBT_BULLETINS';

INSERT bronze.source_asset(ingestion_batch_id,source_id,asset_type,asset_name,asset_location,source_version,publication_date,acquired_at,content_hash,content_size_bytes,metadata_json,is_official)
VALUES(@batch_id,@source_id,'PDF',N'ugd_public_debt_annual_2025_pt.pdf',N'https://cms.minfin.gov.ao/api/assets/portal-ugd/d1635362-8e8d-4886-b8a3-9ed025708b84/',N'Annual Public Debt Statistical Bulletin 2025; CMS revision 20 February 2026','20260220',@now,CONVERT(varbinary(32),'8D8756A56A3373D6D97A9CEF4A91673A4B662FE1967985467F139035CF5B809E',2),953471,N'{"pages":{"publicRatio":6,"governmentRatios":8,"soeDebt":19},"publicDebtToGdpPublished":52.17,"governmentDebtToGdp":50.51,"soeDebtToGdp":1.64}',1); SET @asset_2025=SCOPE_IDENTITY();
INSERT bronze.source_asset(ingestion_batch_id,source_id,asset_type,asset_name,asset_location,source_version,publication_date,acquired_at,content_hash,content_size_bytes,metadata_json,is_official)
VALUES(@batch_id,@source_id,'PDF',N'ugd_public_debt_2026_q1.pdf',N'https://cms.minfin.gov.ao/api/assets/portal-ugd/fd0eba6e-19a6-4c32-9640-db86c605c75a/',N'Public Debt Statistical Bulletin Q1 2026; CMS revision 19 May 2026','20260519',@now,CONVERT(varbinary(32),'E5E981C116116CF5EC280C297693AEC3B2AB75138F540621DFE125B5013B2DC7',2),912617,N'{"pages":{"governmentRatio":8,"soeDebt":19},"formula":"public debt to GDP = government debt to GDP + unguaranteed SOE debt to GDP","governmentDebtToGdp":46.39,"soeDebtToGdp":1.70,"derivedPublicDebtToGdp":48.09}',1); SET @asset_2026=SCOPE_IDENTITY();

INSERT bronze.raw_indicator_observation(ingestion_batch_id,source_asset_id,source_row_number,source_record_key,indicator_code_raw,value_raw,unit_raw,period_raw,raw_payload,record_hash,bronze_status)
SELECT @batch_id,CASE WHEN period_label=N'2025' THEN @asset_2025 ELSE @asset_2026 END,ROW_NUMBER()OVER(ORDER BY period_start),period_label,N'public-debt-gdp',CONVERT(nvarchar(30),public_debt_pct),N'% GDP',period_label,
 CONCAT(N'{"period":"',period_label,N'","publicDebtToGdp":',public_debt_pct,N',"governmentDebtToGdp":',government_debt_pct,N',"unguaranteedSoeDebtToGdp":',soe_unguaranteed_pct,N',"valueMethod":"',value_method,N'"}'),
 HASHBYTES('SHA2_256',CONCAT(period_label,N'|',public_debt_pct,N'|',government_debt_pct,N'|',soe_unguaranteed_pct,N'|UGD')),'ACCEPTED' FROM @debt;

SELECT @indicator_id=indicator_id FROM silver.indicator WHERE indicator_code=N'public-debt-gdp';
SELECT @unit_id=unit_id FROM reference.unit WHERE unit_code=N'PCT_GDP'; SELECT @frequency_id=frequency_id FROM reference.frequency WHERE frequency_code=N'ANNUAL_QUARTERLY'; SELECT @geo_id=geography_id FROM reference.geography WHERE geography_code=N'AGO';
UPDATE silver.indicator SET business_definition=N'Government debt plus unguaranteed debt of public enterprises as a percentage of nominal GDP.',updated_at=@now WHERE indicator_id=@indicator_id;
UPDATE gold.dim_indicator SET business_definition=N'Government debt plus unguaranteed debt of public enterprises as a percentage of nominal GDP.',loaded_at=@now WHERE silver_indicator_id=@indicator_id;
INSERT silver.indicator_series(series_code,indicator_id,source_id,unit_id,frequency_id,geography_id,methodology_version,methodology_notes,series_status)
VALUES(N'PUBLIC_DEBT_GDP_AGO_UGD_OFFICIAL_COMPONENTS',@indicator_id,@source_id,@unit_id,@frequency_id,@geo_id,N'UGD annual 2025 and Q1 2026 bulletins',N'2025 is explicitly published by UGD. Q1 2026 is transparently derived from official bulletin components: 46.39% government debt/GDP plus 1.70% unguaranteed public-enterprise debt/GDP equals 48.09%.','VALIDATED'); SET @series_id=SCOPE_IDENTITY();

;WITH compared AS(SELECT *,LAG(public_debt_pct)OVER(ORDER BY period_start) previous_value FROM @debt)
INSERT silver.observation(series_id,ingestion_batch_id,source_asset_id,raw_observation_id,reference_period_label,reference_period_start,reference_period_end,period_precision,numeric_value,display_value,comparison_label,comparison_display_value,trend_direction,publication_date,quality_status,publication_status,is_official,observation_hash)
SELECT @series_id,@batch_id,CASE WHEN d.period_label=N'2025' THEN @asset_2025 ELSE @asset_2026 END,r.raw_observation_id,d.period_label,d.period_start,d.period_end,CASE WHEN d.period_label=N'2025' THEN 'YEAR' ELSE 'QUARTER' END,d.public_debt_pct,CONCAT(d.public_debt_pct,N'%'),N'vs previous published period',
 CASE WHEN previous_value IS NULL THEN NULL ELSE CONCAT(CASE WHEN public_debt_pct-previous_value>=0 THEN N'+' ELSE N'' END,CONVERT(decimal(9,2),public_debt_pct-previous_value),N' pp') END,
 CASE WHEN previous_value IS NULL THEN 'STABLE' WHEN public_debt_pct>previous_value THEN 'UP' WHEN public_debt_pct<previous_value THEN 'DOWN' ELSE 'STABLE' END,
 CASE WHEN d.period_label=N'2025' THEN '20260220' ELSE '20260519' END,'PASSED','VALIDATED',0,HASHBYTES('SHA2_256',CONCAT(@series_id,N'|',d.period_label,N'|',d.public_debt_pct))
FROM compared d JOIN bronze.raw_indicator_observation r ON r.ingestion_batch_id=@batch_id AND r.source_record_key=d.period_label;

MERGE [dq].[rule] t USING(VALUES
 (N'UGD_DEBT_REQUIRED_FIELDS',N'Public debt required fields','COMPLETENESS','CRITICAL'),
 (N'UGD_DEBT_UNIQUE_PERIOD',N'Public debt period uniqueness','UNIQUENESS','CRITICAL'),
 (N'UGD_DEBT_COMPONENT_RECONCILIATION',N'Public debt component reconciliation','CONSISTENCY','HIGH'),
 (N'UGD_DEBT_EXACT_PUBLICATION_STATUS',N'Exact versus derived publication status','VALIDITY','LOW'))s(code,name,dimension,severity)
ON t.rule_code=s.code WHEN NOT MATCHED THEN INSERT(rule_code,rule_name,quality_dimension,default_severity)VALUES(s.code,s.name,s.dimension,s.severity);
INSERT dq.rule_version(rule_id,version_number,rule_expression,parameter_json,effective_from,is_current)
SELECT r.rule_id,1,N'Required and unique periods; value within 0-200%; public ratio reconciles to government plus unguaranteed SOE ratios within 0.05 percentage points; derived values explicitly flagged.',N'{"componentTolerancePp":0.05,"derivedPeriods":["2026-Q1"]}',@now,1 FROM [dq].[rule] r WHERE r.rule_code LIKE N'UGD_DEBT_%' AND NOT EXISTS(SELECT 1 FROM dq.rule_version v WHERE v.rule_id=r.rule_id);
INSERT dq.execution(pipeline_run_id,ingestion_batch_id,execution_status,started_at,ended_at)VALUES(@run_id,@batch_id,'WARNING',@now,@now); SET @dq_id=SCOPE_IDENTITY();
INSERT dq.result(dq_execution_id,rule_version_id,observation_id,result_status,observed_value,result_message)
SELECT @dq_id,v.rule_version_id,o.observation_id,CASE WHEN r.rule_code=N'UGD_DEBT_EXACT_PUBLICATION_STATUS' AND o.reference_period_label=N'2026-Q1' THEN 'WARN' ELSE 'PASS' END,o.reference_period_label,
 CASE WHEN r.rule_code=N'UGD_DEBT_EXACT_PUBLICATION_STATUS' AND o.reference_period_label=N'2026-Q1' THEN N'Public ratio is derived from two explicitly published official components; formula and inputs are retained in Bronze.' ELSE N'Rule passed.' END
FROM silver.observation o CROSS JOIN [dq].[rule] r JOIN dq.rule_version v ON v.rule_id=r.rule_id AND v.is_current=1 WHERE o.ingestion_batch_id=@batch_id AND r.rule_code LIKE N'UGD_DEBT_%';
INSERT dq.indicator_score(dq_execution_id,observation_id,quality_score,passed_rules,warning_rules,failed_rules)
SELECT @dq_id,observation_id,CASE WHEN reference_period_label=N'2026-Q1' THEN 99.50 ELSE 100 END,CASE WHEN reference_period_label=N'2026-Q1' THEN 3 ELSE 4 END,CASE WHEN reference_period_label=N'2026-Q1' THEN 1 ELSE 0 END,0 FROM silver.observation WHERE ingestion_batch_id=@batch_id;
INSERT dq.approval(observation_id,decision,decision_scope,decision_notes,decided_by)SELECT observation_id,'APPROVE','OFFICIAL',CASE WHEN reference_period_label=N'2026-Q1' THEN N'Approved official-component derivation with explicit formula.' ELSE N'Approved exact official UGD published value.' END,SUSER_SNAME() FROM silver.observation WHERE ingestion_batch_id=@batch_id;
UPDATE silver.observation SET publication_status='PUBLISHED',is_official=1 WHERE ingestion_batch_id=@batch_id;

INSERT gold.dim_source(silver_source_id,source_code,source_name,organization_name,homepage_url)SELECT source_id,source_code,source_name,organization_name,homepage_url FROM reference.source s WHERE source_id=@source_id AND NOT EXISTS(SELECT 1 FROM gold.dim_source g WHERE g.silver_source_id=s.source_id);
INSERT gold.dim_series(silver_series_id,series_code,frequency_code,frequency_name,methodology_version)SELECT s.series_id,s.series_code,f.frequency_code,f.frequency_name,s.methodology_version FROM silver.indicator_series s JOIN reference.frequency f ON f.frequency_id=s.frequency_id WHERE s.series_id=@series_id;
INSERT gold.dim_date(date_key,full_date,calendar_year,calendar_quarter,calendar_month,month_name)SELECT CONVERT(int,CONVERT(char(8),d,112)),d,YEAR(d),DATEPART(quarter,d),MONTH(d),DATENAME(month,d) FROM(SELECT period_start d FROM @debt UNION SELECT period_end FROM @debt)x WHERE NOT EXISTS(SELECT 1 FROM gold.dim_date gd WHERE gd.full_date=x.d);
INSERT gold.fact_indicator_observation(silver_observation_id,indicator_key,series_key,source_key,unit_key,geography_key,period_start_date_key,period_end_date_key,reference_period_label,numeric_value,display_value,comparison_label,comparison_display_value,trend_direction,quality_status,quality_score,publication_status,is_official,source_asset_id)
SELECT o.observation_id,gi.indicator_key,gs.series_key,gsrc.source_key,gu.unit_key,gg.geography_key,ds.date_key,de.date_key,o.reference_period_label,o.numeric_value,o.display_value,o.comparison_label,o.comparison_display_value,o.trend_direction,o.quality_status,sc.quality_score,'PUBLISHED',1,o.source_asset_id FROM silver.observation o JOIN silver.indicator_series s ON s.series_id=o.series_id JOIN gold.dim_indicator gi ON gi.silver_indicator_id=s.indicator_id JOIN gold.dim_series gs ON gs.silver_series_id=s.series_id JOIN gold.dim_source gsrc ON gsrc.silver_source_id=s.source_id JOIN gold.dim_unit gu ON gu.silver_unit_id=s.unit_id JOIN gold.dim_geography gg ON gg.silver_geography_id=s.geography_id JOIN gold.dim_date ds ON ds.full_date=o.reference_period_start JOIN gold.dim_date de ON de.full_date=o.reference_period_end JOIN dq.indicator_score sc ON sc.observation_id=o.observation_id AND sc.dq_execution_id=@dq_id WHERE o.ingestion_batch_id=@batch_id;
UPDATE control.ingestion_batch SET batch_status='VALIDATED',accepted_record_count=2,rejected_record_count=0 WHERE ingestion_batch_id=@batch_id;
UPDATE control.pipeline_run SET run_status='SUCCEEDED',ended_at=@now,rows_read=2,rows_written=2,rows_rejected=0 WHERE pipeline_run_id=@run_id;
INSERT audit.pipeline_event(pipeline_run_id,ingestion_batch_id,event_type,event_level,event_message,event_context)VALUES(@run_id,@batch_id,'UGD_PUBLIC_DEBT_GDP_INITIAL_LOAD','WARN',N'Official 2025 public-debt ratio and transparently derived Q1 2026 ratio published.',N'{"rows":2,"publishedExactRows":1,"officialComponentDerivedRows":1,"latestPublicDebtToGdp":48.09}');
COMMIT;
SELECT @run_id pipeline_run_id,@batch_id ingestion_batch_id,2 bronze_rows,2 silver_periods,2 gold_periods,1 dq_warning;
GO
