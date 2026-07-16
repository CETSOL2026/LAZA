USE [LAZA_DATA_PLATFORM_DEV];
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

IF EXISTS (SELECT 1 FROM silver.indicator_series WHERE series_code=N'MINFIN_FISCAL_TOTAL_REVENUE')
    THROW 51700, 'Official MINFIN fiscal execution series already exist.', 1;

DECLARE @quarter TABLE
(
 period_label nvarchar(7) PRIMARY KEY, period_start date, period_end date, publication_date date,
 annual_budget decimal(18,2), total_revenue decimal(18,2), current_revenue decimal(18,2), capital_revenue decimal(18,2),
 tax_revenue decimal(18,2), patrimonial_revenue decimal(18,2), petroleum_revenue decimal(18,2),
 total_expenditure decimal(18,2), current_expenditure decimal(18,2), capital_expenditure decimal(18,2),
 personnel_expenditure decimal(18,2), interest_expenditure decimal(18,2), investment_expenditure decimal(18,2),
 budget_balance decimal(18,2), source_url nvarchar(1000), content_sha256 char(64), content_size_bytes int
);

INSERT @quarter VALUES
(N'2025-Q1','2025-01-01','2025-03-31','2025-05-06',34633790,6117043,3427149,2689894,2067773,1348379,2037620,6606405,3135835,3470571,892117,1050268,1351862,-489362,N'https://cms.minfin.gov.ao/api/assets/portal-minfin/df341d44-3601-410d-8fe8-3d42efa2bd5c/',N'CB6F5319A85C893CBA920572EA5312C1B97CCEC7EA3E9FE31B9F832549E46EF3',1663235),
(N'2025-Q2','2025-04-01','2025-06-30','2025-07-11',34633790,5927596,4369123,1558473,2766373,1588180,2517837,6444059,3354634,3089425,922942,1045641,1329912,-516463,N'https://cms.minfin.gov.ao/api/assets/portal-minfin/37498c08-8bdb-4120-b868-ccdd4b2858d6/',N'DFABBB472A58551981ABC2567B8927E5BBB55297B9ACC34ABD9507E875FD81C8',1866630),
(N'2025-Q3','2025-07-01','2025-09-30','2025-10-15',34633790,5948773,4149662,1799111,2529055,1607350,2190860,6310997,2978475,3332522,1025214,585297,1473859,-362224,N'https://cms.minfin.gov.ao/api/assets/portal-minfin/b5aa3d45-196e-489d-8774-09041d565c52/',N'39631F0AB42F8AA5B2FAEC6DC61FF77014F86286AD15E6BA99165067D614F762',1860464),
(N'2025-Q4','2025-10-01','2025-12-31','2026-03-12',34633790,13693239,6777387,6915852,5057435,1708064,4270192,13474841,5229541,8245300,1021932,2360348,2672538,218398,N'https://cms.minfin.gov.ao/api/assets/portal-minfin/6fb282a3-8ce4-4319-86ca-e271ae984b2b/',N'DA66B118BC36A9A1313B19E9614624504EC2D7EEB906B9B5C957BCDAAE76EA7C',1705843),
(N'2026-Q1','2026-01-01','2026-03-31','2026-04-17',33240844,9362095,3826500,5535595,2495731,1313721,1869945,9118187,3528620,5589567,1037195,1014862,1704483,243908,N'https://cms.minfin.gov.ao/api/assets/portal-minfin/91df1c4e-b270-4732-8514-74463db3df96/',N'B0324E30AB9FC3F824569C0357F2969EE675C7D9EB83AB34EB04361ACC3B3F9B',1655528);

IF (SELECT COUNT(*) FROM @quarter)<>5
 OR EXISTS(SELECT 1 FROM @quarter WHERE total_revenue<>current_revenue+capital_revenue)
 OR EXISTS(SELECT 1 FROM @quarter WHERE total_revenue-total_expenditure<>budget_balance)
 OR EXISTS(SELECT 1 FROM @quarter WHERE total_expenditure<>current_expenditure+capital_expenditure AND period_label<>N'2025-Q1')
 OR EXISTS(SELECT 1 FROM @quarter WHERE period_label=N'2025-Q1' AND total_expenditure-current_expenditure-capital_expenditure<>-1)
    THROW 51701, 'MINFIN completeness or fiscal reconciliation validation failed.', 1;

BEGIN TRANSACTION;
DECLARE @now datetime2(3)=SYSUTCDATETIME(), @pipeline_id int, @run_id bigint, @batch_id bigint,
        @source_id int, @frequency_id int, @geo_id int, @dq_id bigint;

IF NOT EXISTS(SELECT 1 FROM control.pipeline_definition WHERE pipeline_code=N'MINFIN_FISCAL_EXECUTION_QUARTERLY')
 INSERT control.pipeline_definition(pipeline_code,pipeline_name,source_system)
 VALUES(N'MINFIN_FISCAL_EXECUTION_QUARTERLY',N'MINFIN quarterly budget execution',N'MINFIN');
SELECT @pipeline_id=pipeline_id FROM control.pipeline_definition WHERE pipeline_code=N'MINFIN_FISCAL_EXECUTION_QUARTERLY';
INSERT control.pipeline_run(pipeline_id,run_status,trigger_type,started_at) VALUES(@pipeline_id,'STARTED','MANUAL',@now);
SET @run_id=SCOPE_IDENTITY();
INSERT control.ingestion_batch(pipeline_run_id,batch_code,data_classification,batch_status,acquired_at,source_record_count)
VALUES(@run_id,N'MINFIN_REOGE_2025Q1_2026Q1','OFFICIAL','RECEIVED',@now,5); SET @batch_id=SCOPE_IDENTITY();

IF NOT EXISTS(SELECT 1 FROM reference.source WHERE source_code=N'MINFIN_REOGE')
 INSERT reference.source(source_code,source_name,organization_name,homepage_url,source_type)
 VALUES(N'MINFIN_REOGE',N'Quarterly General State Budget Execution Reports',N'Ministry of Finance of Angola',N'https://www.minfin.gov.ao/oge/reoge','OFFICIAL');
SELECT @source_id=source_id FROM reference.source WHERE source_code=N'MINFIN_REOGE';

MERGE reference.unit target USING(VALUES
 (N'MILLION_AOA',N'Million Angolan kwanza',N'Kz million',1),
 (N'PERCENT',N'Percent',N'%',1)
) source(unit_code,unit_name,symbol,scale_factor)
ON target.unit_code=source.unit_code
WHEN NOT MATCHED THEN INSERT(unit_code,unit_name,symbol,scale_factor) VALUES(source.unit_code,source.unit_name,source.symbol,source.scale_factor);
SELECT @frequency_id=frequency_id FROM reference.frequency WHERE frequency_code=N'QUARTERLY';
SELECT @geo_id=geography_id FROM reference.geography WHERE geography_code=N'AGO';

DECLARE @series_def TABLE(metric_key nvarchar(60),series_code nvarchar(180),unit_code nvarchar(60),indicator_code nvarchar(100),indicator_name nvarchar(250));
INSERT @series_def VALUES
(N'annualBudget',N'MINFIN_FISCAL_ANNUAL_BUDGET',N'MILLION_AOA',N'fiscal-annual-budget',N'Annual State Budget'),
(N'totalRevenue',N'MINFIN_FISCAL_TOTAL_REVENUE',N'MILLION_AOA',N'fiscal-execution',N'Fiscal Execution Intelligence'),
(N'currentRevenue',N'MINFIN_FISCAL_CURRENT_REVENUE',N'MILLION_AOA',N'fiscal-current-revenue',N'Current Revenue'),
(N'capitalRevenue',N'MINFIN_FISCAL_CAPITAL_REVENUE',N'MILLION_AOA',N'fiscal-capital-revenue',N'Capital Revenue'),
(N'taxRevenue',N'MINFIN_FISCAL_TAX_REVENUE',N'MILLION_AOA',N'fiscal-tax-revenue',N'Tax Revenue'),
(N'patrimonialRevenue',N'MINFIN_FISCAL_PATRIMONIAL_REVENUE',N'MILLION_AOA',N'fiscal-patrimonial-revenue',N'Patrimonial Revenue'),
(N'petroleumRevenue',N'MINFIN_FISCAL_PETROLEUM_REVENUE',N'MILLION_AOA',N'fiscal-petroleum-revenue',N'Petroleum Revenue'),
(N'totalExpenditure',N'MINFIN_FISCAL_TOTAL_EXPENDITURE',N'MILLION_AOA',N'fiscal-total-expenditure',N'Total Expenditure'),
(N'currentExpenditure',N'MINFIN_FISCAL_CURRENT_EXPENDITURE',N'MILLION_AOA',N'fiscal-current-expenditure',N'Current Expenditure'),
(N'capitalExpenditure',N'MINFIN_FISCAL_CAPITAL_EXPENDITURE',N'MILLION_AOA',N'fiscal-capital-expenditure',N'Capital Expenditure'),
(N'personnelExpenditure',N'MINFIN_FISCAL_PERSONNEL_EXPENDITURE',N'MILLION_AOA',N'fiscal-personnel-expenditure',N'Personnel Expenditure'),
(N'interestExpenditure',N'MINFIN_FISCAL_INTEREST_EXPENDITURE',N'MILLION_AOA',N'fiscal-interest-expenditure',N'Interest Expenditure'),
(N'investmentExpenditure',N'MINFIN_FISCAL_INVESTMENT_EXPENDITURE',N'MILLION_AOA',N'fiscal-investment-expenditure',N'Investment Expenditure'),
(N'budgetBalance',N'MINFIN_FISCAL_BUDGET_BALANCE',N'MILLION_AOA',N'fiscal-budget-balance',N'Budget Balance'),
(N'revenueExecutionPct',N'MINFIN_FISCAL_REVENUE_EXECUTION_PCT',N'PERCENT',N'fiscal-revenue-execution',N'Revenue Execution Rate'),
(N'expenditureExecutionPct',N'MINFIN_FISCAL_EXPENDITURE_EXECUTION_PCT',N'PERCENT',N'fiscal-expenditure-execution',N'Expenditure Execution Rate');

INSERT silver.indicator(indicator_code,indicator_name,domain_name,business_definition,favorable_direction,accountable_owner)
SELECT d.indicator_code,d.indicator_name,N'Public finance',
 N'Official quarterly MINFIN fiscal-execution metric included in the LAZA Fiscal Execution Intelligence product.','NEUTRAL',N'LAZA Data Steward'
FROM @series_def d WHERE NOT EXISTS(SELECT 1 FROM silver.indicator i WHERE i.indicator_code=d.indicator_code);
INSERT gold.dim_indicator(silver_indicator_id,indicator_code,indicator_name,domain_name,business_definition,favorable_direction,is_active)
SELECT i.indicator_id,i.indicator_code,i.indicator_name,i.domain_name,i.business_definition,i.favorable_direction,i.is_active
FROM silver.indicator i JOIN @series_def d ON d.indicator_code=i.indicator_code
WHERE NOT EXISTS(SELECT 1 FROM gold.dim_indicator g WHERE g.silver_indicator_id=i.indicator_id);
INSERT silver.indicator_series(series_code,indicator_id,source_id,unit_id,frequency_id,geography_id,methodology_version,methodology_notes,series_status)
SELECT d.series_code,i.indicator_id,@source_id,u.unit_id,@frequency_id,@geo_id,N'MINFIN REOGE tables v1',
 N'Published quarterly values in million kwanza. Execution rates are derived from the published annual budget denominator.',N'VALIDATED'
FROM @series_def d JOIN silver.indicator i ON i.indicator_code=d.indicator_code JOIN reference.unit u ON u.unit_code=d.unit_code;

DECLARE @asset_map TABLE(period_label nvarchar(7) PRIMARY KEY,source_asset_id bigint);
DECLARE @p nvarchar(7),@pub date,@url nvarchar(1000),@hash char(64),@size int,@asset_id bigint;
DECLARE c CURSOR LOCAL FAST_FORWARD FOR SELECT period_label,publication_date,source_url,content_sha256,content_size_bytes FROM @quarter ORDER BY period_start;
OPEN c; FETCH NEXT FROM c INTO @p,@pub,@url,@hash,@size;
WHILE @@FETCH_STATUS=0 BEGIN
 INSERT bronze.source_asset(ingestion_batch_id,source_id,asset_type,asset_name,asset_location,source_version,publication_date,acquired_at,content_hash,content_size_bytes,metadata_json,is_official)
 VALUES(@batch_id,@source_id,'PDF',N'minfin_reoge_'+@p+N'.pdf',@url,N'MINFIN REOGE '+@p,@pub,@now,CONVERT(varbinary(32),@hash,2),@size,
  CONCAT(N'{"referencePeriod":"',@p,N'","sourcePages":{"revenue":16,"expenditure":21,"balance":47},"extractionMethod":"reviewed official PDF tables"}'),1);
 SET @asset_id=SCOPE_IDENTITY(); INSERT @asset_map VALUES(@p,@asset_id);
 FETCH NEXT FROM c INTO @p,@pub,@url,@hash,@size;
END
CLOSE c; DEALLOCATE c;

INSERT bronze.raw_indicator_observation(ingestion_batch_id,source_asset_id,source_row_number,source_record_key,indicator_code_raw,value_raw,unit_raw,period_raw,raw_payload,record_hash,bronze_status)
SELECT @batch_id,a.source_asset_id,ROW_NUMBER() OVER(ORDER BY q.period_start),q.period_label,N'fiscal-execution',CONVERT(nvarchar(40),q.total_revenue),N'Million AOA',q.period_label,
 (SELECT q.period_label period,q.total_revenue totalRevenue,q.total_expenditure totalExpenditure,q.budget_balance budgetBalance FOR JSON PATH,WITHOUT_ARRAY_WRAPPER),
 HASHBYTES('SHA2_256',CONCAT(q.period_label,N'|',q.content_sha256,N'|MINFIN_REOGE')),'ACCEPTED'
FROM @quarter q JOIN @asset_map a ON a.period_label=q.period_label;

DECLARE @values TABLE(period_label nvarchar(7),metric_key nvarchar(60),numeric_value decimal(38,10));
INSERT @values
SELECT q.period_label,v.metric_key,v.numeric_value FROM @quarter q CROSS APPLY(VALUES
 (N'annualBudget',q.annual_budget),(N'totalRevenue',q.total_revenue),(N'currentRevenue',q.current_revenue),(N'capitalRevenue',q.capital_revenue),
 (N'taxRevenue',q.tax_revenue),(N'patrimonialRevenue',q.patrimonial_revenue),(N'petroleumRevenue',q.petroleum_revenue),
 (N'totalExpenditure',q.total_expenditure),(N'currentExpenditure',q.current_expenditure),(N'capitalExpenditure',q.capital_expenditure),
 (N'personnelExpenditure',q.personnel_expenditure),(N'interestExpenditure',q.interest_expenditure),(N'investmentExpenditure',q.investment_expenditure),
 (N'budgetBalance',q.budget_balance),(N'revenueExecutionPct',q.total_revenue/q.annual_budget*100),(N'expenditureExecutionPct',q.total_expenditure/q.annual_budget*100)
) v(metric_key,numeric_value);

INSERT silver.observation(series_id,ingestion_batch_id,source_asset_id,raw_observation_id,reference_period_label,reference_period_start,reference_period_end,period_precision,numeric_value,display_value,comparison_label,comparison_display_value,trend_direction,publication_date,quality_status,publication_status,is_official,observation_hash)
SELECT s.series_id,@batch_id,a.source_asset_id,r.raw_observation_id,q.period_label,q.period_start,q.period_end,'QUARTER',v.numeric_value,
 CASE WHEN d.unit_code=N'PERCENT' THEN CONCAT(CONVERT(decimal(8,1),v.numeric_value),N'%')
      WHEN ABS(v.numeric_value)>=1000000 THEN CONCAT(CONVERT(decimal(10,2),v.numeric_value/1000000),N'T Kz')
      ELSE CONCAT(CONVERT(decimal(10,2),v.numeric_value/1000),N'B Kz') END,
 CASE WHEN v.metric_key=N'budgetBalance' THEN N'revenue minus expenditure' END,NULL,
 CASE WHEN v.metric_key=N'budgetBalance' AND v.numeric_value>0 THEN 'UP' WHEN v.metric_key=N'budgetBalance' AND v.numeric_value<0 THEN 'DOWN' ELSE 'STABLE' END,
 q.publication_date,'PASSED','VALIDATED',0,HASHBYTES('SHA2_256',CONCAT(s.series_id,N'|',q.period_label,N'|',v.numeric_value,N'|MINFIN'))
FROM @values v JOIN @quarter q ON q.period_label=v.period_label JOIN @series_def d ON d.metric_key=v.metric_key
JOIN silver.indicator_series s ON s.series_code=d.series_code JOIN @asset_map a ON a.period_label=q.period_label
JOIN bronze.raw_indicator_observation r ON r.ingestion_batch_id=@batch_id AND r.source_record_key=q.period_label;

MERGE [dq].[rule] target USING(VALUES
 (N'MINFIN_QUARTER_COMPLETENESS',N'Five official quarters are complete','COMPLETENESS','CRITICAL'),
 (N'MINFIN_REVENUE_RECONCILIATION',N'Total revenue equals current plus capital revenue','CONSISTENCY','HIGH'),
 (N'MINFIN_EXPENDITURE_RECONCILIATION',N'Total expenditure equals current plus capital expenditure','CONSISTENCY','MEDIUM'),
 (N'MINFIN_BUDGET_BALANCE_RECONCILIATION',N'Budget balance equals revenue minus expenditure','CONSISTENCY','HIGH'),
 (N'MINFIN_CATALOG_METADATA_VALIDITY',N'Catalog title and date agree with PDF content','VALIDITY','MEDIUM')
) source(rule_code,rule_name,quality_dimension,default_severity)
ON target.rule_code=source.rule_code WHEN NOT MATCHED THEN INSERT(rule_code,rule_name,quality_dimension,default_severity)
VALUES(source.rule_code,source.rule_name,source.quality_dimension,source.default_severity);
INSERT dq.rule_version(rule_id,version_number,rule_expression,parameter_json,effective_from,is_current)
SELECT rule_id,1,N'Validate quarter coverage, fiscal arithmetic and MINFIN catalog metadata.',N'{"expectedQuarters":5,"acceptedSourceExceptions":3}',@now,1
FROM [dq].[rule] r WHERE rule_code LIKE N'MINFIN_%' AND NOT EXISTS(SELECT 1 FROM dq.rule_version v WHERE v.rule_id=r.rule_id);
INSERT dq.execution(pipeline_run_id,ingestion_batch_id,execution_status,started_at,ended_at) VALUES(@run_id,@batch_id,'WARNING',@now,@now); SET @dq_id=SCOPE_IDENTITY();

INSERT dq.result(dq_execution_id,rule_version_id,observation_id,result_status,observed_value,result_message)
SELECT @dq_id,rv.rule_version_id,o.observation_id,
 CASE WHEN dq_rule.rule_code=N'MINFIN_EXPENDITURE_RECONCILIATION' AND o.reference_period_label=N'2025-Q1' AND s.series_code=N'MINFIN_FISCAL_TOTAL_EXPENDITURE' THEN 'WARN'
      WHEN dq_rule.rule_code=N'MINFIN_CATALOG_METADATA_VALIDITY' AND o.reference_period_label IN(N'2025-Q4',N'2026-Q1') AND s.series_code=N'MINFIN_FISCAL_TOTAL_REVENUE' THEN 'WARN' ELSE 'PASS' END,
 o.reference_period_label,
 CASE WHEN dq_rule.rule_code=N'MINFIN_EXPENDITURE_RECONCILIATION' AND o.reference_period_label=N'2025-Q1' AND s.series_code=N'MINFIN_FISCAL_TOTAL_EXPENDITURE' THEN N'Published components differ from the published total by Kz 1 million due to table rounding.'
      WHEN dq_rule.rule_code=N'MINFIN_CATALOG_METADATA_VALIDITY' AND o.reference_period_label=N'2025-Q4' AND s.series_code=N'MINFIN_FISCAL_TOTAL_REVENUE' THEN N'Catalog date precedes the period; PDF technical sheet confirms 12 March 2026.'
      WHEN dq_rule.rule_code=N'MINFIN_CATALOG_METADATA_VALIDITY' AND o.reference_period_label=N'2026-Q1' AND s.series_code=N'MINFIN_FISCAL_TOTAL_REVENUE' THEN N'Catalog label says 2022; PDF title, tables and technical sheet confirm 2026 Q1.' ELSE N'Rule passed.' END
FROM silver.observation o JOIN silver.indicator_series s ON s.series_id=o.series_id
CROSS JOIN [dq].[rule] dq_rule JOIN dq.rule_version rv ON rv.rule_id=dq_rule.rule_id AND rv.is_current=1
WHERE o.ingestion_batch_id=@batch_id AND dq_rule.rule_code LIKE N'MINFIN_%';
INSERT dq.exception(dq_result_id,exception_status,justification,requested_by,requested_at,resolved_by,resolved_at)
SELECT result.dq_result_id,'APPROVED',N'Official PDF value retained; source discrepancy documented without imputation.',SUSER_SNAME(),@now,SUSER_SNAME(),@now
FROM dq.result result WHERE result.dq_execution_id=@dq_id AND result.result_status='WARN';
INSERT dq.indicator_score(dq_execution_id,observation_id,quality_score,passed_rules,warning_rules,failed_rules)
SELECT @dq_id,o.observation_id,CASE WHEN EXISTS(SELECT 1 FROM dq.result r WHERE r.dq_execution_id=@dq_id AND r.observation_id=o.observation_id AND r.result_status='WARN') THEN 95 ELSE 100 END,
 CASE WHEN EXISTS(SELECT 1 FROM dq.result r WHERE r.dq_execution_id=@dq_id AND r.observation_id=o.observation_id AND r.result_status='WARN') THEN 4 ELSE 5 END,
 CASE WHEN EXISTS(SELECT 1 FROM dq.result r WHERE r.dq_execution_id=@dq_id AND r.observation_id=o.observation_id AND r.result_status='WARN') THEN 1 ELSE 0 END,0
FROM silver.observation o WHERE o.ingestion_batch_id=@batch_id;
INSERT dq.approval(observation_id,decision,decision_scope,decision_notes,decided_by)
SELECT observation_id,'APPROVE','OFFICIAL',N'Official MINFIN REOGE metric validated with documented source exceptions.',SUSER_SNAME() FROM silver.observation WHERE ingestion_batch_id=@batch_id;
UPDATE silver.observation SET publication_status='PUBLISHED',is_official=1 WHERE ingestion_batch_id=@batch_id;

INSERT gold.dim_source(silver_source_id,source_code,source_name,organization_name,homepage_url)
SELECT source_id,source_code,source_name,organization_name,homepage_url FROM reference.source s WHERE source_id=@source_id
AND NOT EXISTS(SELECT 1 FROM gold.dim_source g WHERE g.silver_source_id=s.source_id);
INSERT gold.dim_unit(silver_unit_id,unit_code,unit_name,symbol)
SELECT unit_id,unit_code,unit_name,symbol FROM reference.unit u WHERE unit_code IN(N'MILLION_AOA',N'PERCENT') AND NOT EXISTS(SELECT 1 FROM gold.dim_unit g WHERE g.silver_unit_id=u.unit_id);
INSERT gold.dim_series(silver_series_id,series_code,frequency_code,frequency_name,methodology_version)
SELECT s.series_id,s.series_code,f.frequency_code,f.frequency_name,s.methodology_version FROM silver.indicator_series s JOIN reference.frequency f ON f.frequency_id=s.frequency_id
WHERE s.series_code LIKE N'MINFIN_FISCAL_%' AND NOT EXISTS(SELECT 1 FROM gold.dim_series g WHERE g.silver_series_id=s.series_id);
;WITH dates AS(SELECT period_start d FROM @quarter UNION SELECT period_end FROM @quarter)
INSERT gold.dim_date(date_key,full_date,calendar_year,calendar_quarter,calendar_month,month_name)
SELECT CONVERT(int,CONVERT(char(8),d,112)),d,YEAR(d),DATEPART(quarter,d),MONTH(d),DATENAME(month,d) FROM dates x WHERE NOT EXISTS(SELECT 1 FROM gold.dim_date gd WHERE gd.full_date=x.d);
INSERT gold.fact_indicator_observation(silver_observation_id,indicator_key,series_key,source_key,unit_key,geography_key,period_start_date_key,period_end_date_key,reference_period_label,numeric_value,display_value,comparison_label,comparison_display_value,trend_direction,quality_status,quality_score,publication_status,is_official,source_asset_id)
SELECT o.observation_id,gi.indicator_key,gs.series_key,gsrc.source_key,gu.unit_key,gg.geography_key,ds.date_key,de.date_key,o.reference_period_label,o.numeric_value,o.display_value,o.comparison_label,o.comparison_display_value,o.trend_direction,o.quality_status,score.quality_score,'PUBLISHED',1,o.source_asset_id
FROM silver.observation o JOIN silver.indicator_series s ON s.series_id=o.series_id JOIN gold.dim_indicator gi ON gi.silver_indicator_id=s.indicator_id
JOIN gold.dim_series gs ON gs.silver_series_id=s.series_id JOIN gold.dim_source gsrc ON gsrc.silver_source_id=s.source_id JOIN gold.dim_unit gu ON gu.silver_unit_id=s.unit_id
JOIN gold.dim_geography gg ON gg.silver_geography_id=s.geography_id JOIN gold.dim_date ds ON ds.full_date=o.reference_period_start JOIN gold.dim_date de ON de.full_date=o.reference_period_end
JOIN dq.indicator_score score ON score.observation_id=o.observation_id AND score.dq_execution_id=@dq_id WHERE o.ingestion_batch_id=@batch_id;
UPDATE control.ingestion_batch SET batch_status='VALIDATED',accepted_record_count=5,rejected_record_count=0 WHERE ingestion_batch_id=@batch_id;
UPDATE control.pipeline_run SET run_status='SUCCEEDED',ended_at=@now,rows_read=5,rows_written=80,rows_rejected=0 WHERE pipeline_run_id=@run_id;
INSERT audit.pipeline_event(pipeline_run_id,ingestion_batch_id,event_type,event_level,event_message,event_context)
VALUES(@run_id,@batch_id,'MINFIN_FISCAL_EXECUTION_INITIAL_LOAD','WARN',N'Five official MINFIN quarterly reports and 80 metrics published.',N'{"periodStart":"2025-Q1","periodEnd":"2026-Q1","acceptedSourceExceptions":3}');
COMMIT;
GO

CREATE OR ALTER VIEW api.vw_minfin_fiscal_execution_quarterly AS
WITH fiscal AS(
 SELECT f.reference_period_label period,MAX(ds.full_date) period_start,MAX(o.publication_date) publication_date,MAX(asset.asset_location) source_url,
 MAX(CASE WHEN s.series_code=N'MINFIN_FISCAL_ANNUAL_BUDGET' THEN f.numeric_value END) annual_budget,
 MAX(CASE WHEN s.series_code=N'MINFIN_FISCAL_TOTAL_REVENUE' THEN f.numeric_value END) total_revenue,
 MAX(CASE WHEN s.series_code=N'MINFIN_FISCAL_CURRENT_REVENUE' THEN f.numeric_value END) current_revenue,
 MAX(CASE WHEN s.series_code=N'MINFIN_FISCAL_CAPITAL_REVENUE' THEN f.numeric_value END) capital_revenue,
 MAX(CASE WHEN s.series_code=N'MINFIN_FISCAL_TAX_REVENUE' THEN f.numeric_value END) tax_revenue,
 MAX(CASE WHEN s.series_code=N'MINFIN_FISCAL_PATRIMONIAL_REVENUE' THEN f.numeric_value END) patrimonial_revenue,
 MAX(CASE WHEN s.series_code=N'MINFIN_FISCAL_PETROLEUM_REVENUE' THEN f.numeric_value END) petroleum_revenue,
 MAX(CASE WHEN s.series_code=N'MINFIN_FISCAL_TOTAL_EXPENDITURE' THEN f.numeric_value END) total_expenditure,
 MAX(CASE WHEN s.series_code=N'MINFIN_FISCAL_CURRENT_EXPENDITURE' THEN f.numeric_value END) current_expenditure,
 MAX(CASE WHEN s.series_code=N'MINFIN_FISCAL_CAPITAL_EXPENDITURE' THEN f.numeric_value END) capital_expenditure,
 MAX(CASE WHEN s.series_code=N'MINFIN_FISCAL_PERSONNEL_EXPENDITURE' THEN f.numeric_value END) personnel_expenditure,
 MAX(CASE WHEN s.series_code=N'MINFIN_FISCAL_INTEREST_EXPENDITURE' THEN f.numeric_value END) interest_expenditure,
 MAX(CASE WHEN s.series_code=N'MINFIN_FISCAL_INVESTMENT_EXPENDITURE' THEN f.numeric_value END) investment_expenditure,
 MAX(CASE WHEN s.series_code=N'MINFIN_FISCAL_BUDGET_BALANCE' THEN f.numeric_value END) budget_balance,
 MAX(CASE WHEN s.series_code=N'MINFIN_FISCAL_REVENUE_EXECUTION_PCT' THEN f.numeric_value END) revenue_execution_pct,
 MAX(CASE WHEN s.series_code=N'MINFIN_FISCAL_EXPENDITURE_EXECUTION_PCT' THEN f.numeric_value END) expenditure_execution_pct,
 MIN(f.quality_score) quality_score,CONVERT(bit,MAX(CASE WHEN ex.dq_exception_id IS NOT NULL THEN 1 ELSE 0 END)) has_accepted_exception
 FROM gold.fact_indicator_observation f JOIN gold.dim_series s ON s.series_key=f.series_key JOIN gold.dim_date ds ON ds.date_key=f.period_start_date_key
 JOIN silver.observation o ON o.observation_id=f.silver_observation_id JOIN bronze.source_asset asset ON asset.source_asset_id=f.source_asset_id
 LEFT JOIN dq.result r ON r.observation_id=o.observation_id AND r.result_status='WARN' LEFT JOIN dq.exception ex ON ex.dq_result_id=r.dq_result_id AND ex.exception_status='APPROVED'
 WHERE s.series_code LIKE N'MINFIN_FISCAL_%' AND f.publication_status='PUBLISHED' AND f.is_official=1 GROUP BY f.reference_period_label
)
SELECT period,CONVERT(char(10),period_start,23) period_start,CONVERT(char(10),publication_date,23) publication_date,source_url,
 CONVERT(float,annual_budget) annual_budget,CONVERT(float,total_revenue) total_revenue,CONVERT(float,current_revenue) current_revenue,
 CONVERT(float,capital_revenue) capital_revenue,CONVERT(float,tax_revenue) tax_revenue,CONVERT(float,patrimonial_revenue) patrimonial_revenue,
 CONVERT(float,petroleum_revenue) petroleum_revenue,CONVERT(float,total_expenditure) total_expenditure,CONVERT(float,current_expenditure) current_expenditure,
 CONVERT(float,capital_expenditure) capital_expenditure,CONVERT(float,personnel_expenditure) personnel_expenditure,
 CONVERT(float,interest_expenditure) interest_expenditure,CONVERT(float,investment_expenditure) investment_expenditure,
 CONVERT(float,budget_balance) budget_balance,CONVERT(float,revenue_execution_pct) revenue_execution_pct,
 CONVERT(float,expenditure_execution_pct) expenditure_execution_pct,quality_score,has_accepted_exception
FROM fiscal;
GO

SELECT
 (SELECT COUNT(*) FROM bronze.source_asset a JOIN control.ingestion_batch b ON b.ingestion_batch_id=a.ingestion_batch_id WHERE b.batch_code=N'MINFIN_REOGE_2025Q1_2026Q1') bronze_assets,
 (SELECT COUNT(*) FROM silver.observation o JOIN silver.indicator_series s ON s.series_id=o.series_id WHERE s.series_code LIKE N'MINFIN_FISCAL_%') silver_observations,
 (SELECT COUNT(*) FROM gold.fact_indicator_observation f JOIN gold.dim_series s ON s.series_key=f.series_key WHERE s.series_code LIKE N'MINFIN_FISCAL_%') gold_observations,
 (SELECT COUNT(*) FROM api.vw_minfin_fiscal_execution_quarterly) api_quarters;
GO
