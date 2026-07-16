USE [LAZA_DATA_PLATFORM_DEV];
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

IF EXISTS (SELECT 1 FROM silver.indicator_series WHERE series_code=N'INE_GDP_NON_OIL_YOY_QUARTERLY')
    THROW 51900, 'Official INE oil/non-oil GDP series already exist.', 1;

DECLARE @quarterly TABLE
(
    period_label nvarchar(7) NOT NULL PRIMARY KEY,
    oil_nominal_million_aoa decimal(38,10) NOT NULL,
    non_oil_nominal_million_aoa decimal(38,10) NOT NULL,
    total_nominal_million_aoa decimal(38,10) NOT NULL,
    oil_share_pct decimal(18,10) NOT NULL,
    non_oil_share_pct decimal(18,10) NOT NULL,
    total_share_pct decimal(18,10) NOT NULL,
    oil_yoy_pct decimal(18,10) NOT NULL,
    non_oil_yoy_pct decimal(18,10) NOT NULL,
    total_yoy_pct decimal(18,10) NOT NULL,
    oil_contribution_pp decimal(18,10) NOT NULL,
    non_oil_contribution_pp decimal(18,10) NOT NULL,
    total_contribution_pp decimal(18,10) NOT NULL
);

INSERT @quarterly VALUES
(N'2021-Q1',2778783.6683826325,8851453.0301155001,11630236.6984981336,23.8927524901,76.1072475099,100,-19.1818217298,-5.5217236303,-8.2325593603,-3.806617444,-4.4259419163,-8.2325593603),
(N'2021-Q2',3108936.2700000745,9408708.3250165097,12517644.5950165838,24.8364318575,75.1635681425,100,-12.2783705486,6.0727623407,2.4309944441,-2.4366329837,4.8676274278,2.4309944441),
(N'2021-Q3',3295680.9228925356,9811203.2402688619,13106884.1631613970,25.1446559065,74.8553440935,100,-10.7527793362,5.8189752623,2.5303235888,-2.1338806068,4.6642041956,2.5303235888),
(N'2021-Q4',3310396.1837750813,11858586.7356495894,15168982.9194246698,21.8234551476,78.1765448524,100,-2.2438832804,10.8531245072,8.2540336070,-0.4452968731,8.6993304801,8.2540336070),
(N'2022-Q1',3724618.4349571015,11218198.4450854547,14942816.8800425567,24.9258119460,75.0741880540,100,7.0174695346,2.4397813608,3.5307507926,1.6724260064,1.8583247862,3.5307507926),
(N'2022-Q2',3447127.3928064937,13632687.6865060367,17079815.0793125294,20.1824631988,79.8175368012,100,7.3763352195,15.8805513399,13.8537990849,1.7579520355,12.0958470494,13.8537990849),
(N'2022-Q3',3206525.6872932203,11669635.8199669719,14876161.5072601922,21.5547921131,78.4452078869,100,7.8953976144,-5.3931006389,-2.2261428125,1.8816566621,-4.1077994746,-2.2261428125),
(N'2022-Q4',2847190.2750312602,14351493.7197896950,17198683.9948209561,16.5546984635,83.4453015365,100,-2.0579476563,0.5133650538,-0.0994384968,-0.4904567328,0.3910182360,-0.0994384968),
(N'2023-Q1',2677417.1528573190,13420441.2394256238,16097858.3922829423,16.6321325956,83.3678674044,100,-6.2371952974,1.4573167880,-0.1303194125,-1.2869428151,1.1566234026,-0.1303194125),
(N'2023-Q2',3149390.1891115257,17492266.2390615530,20641656.4281730801,15.2574489362,84.7425510638,100,-2.0338249722,10.0165085380,7.5301201229,-0.4196463811,7.9497665040,7.5301201229),
(N'2023-Q3',5117525.7043596432,14570847.1975303441,19688372.9018899873,25.9926288976,74.0073711024,100,-2.7845565801,4.4241622827,2.9367615354,-0.5745475191,3.5113090545,2.9367615354),
(N'2023-Q4',4801636.6807524785,16270343.2395461649,21071979.9202986434,22.7868320818,77.2131679182,100,1.6237707110,-6.5369889071,-4.8531501855,0.3350384188,-5.1881886043,-4.8531501855),
(N'2024-Q1',4826445.1734681698,17678255.3454459757,22504700.5189141445,21.4463870311,78.5536129689,100,5.9557472514,4.2407544775,4.5891966765,1.2100538849,3.3791427915,4.5891966765),
(N'2024-Q2',5077626.4642123599,24217204.8803928196,29294831.3446051814,17.3328407475,82.6671592525,100,3.0398500195,8.0809974503,7.0567666064,0.6176189436,6.4391476628,7.0567666064),
(N'2024-Q3',5244284.6417268068,19754480.2962475605,24998764.9379743673,20.9781749408,79.0218250592,100,4.1480086049,4.7324969326,4.6137440134,0.8427681222,3.7709758913,4.6137440134),
(N'2024-Q4',4710043.2199322097,22502747.7871552184,27212791.0070874281,17.3081960564,82.6918039436,100,0.2609276572,4.0657670060,3.2927220057,0.0530137549,3.2397082508,3.2927220057),
(N'2025-Q1',4815738.5455184840,24289392.4984146692,29105131.0439331532,16.5460122418,83.4539877582,100,-4.0506781669,6.3310896182,4.3489423632,-0.7733789443,5.1223213075,4.3489423632),
(N'2025-Q2',4325858.4784314269,33063152.8268457875,37389011.3052772135,11.5698659243,88.4301340757,100,-8.4421107840,3.9039323455,1.5467542613,-1.6118167024,3.1585709637,1.5467542613),
(N'2025-Q3',4615043.9950043047,25233737.7300758623,29848781.7250801660,15.4614149331,84.5385850669,100,-6.9438571846,3.7580449364,1.7147757792,-1.3257614447,3.0405372240,1.7147757792),
(N'2025-Q4',4139870.2629644633,27819227.5059264638,31959097.7688909285,12.9536518612,87.0463481388,100,-1.2221104741,6.6313514120,5.1319229676,-0.2333324123,5.3652553800,5.1319229676),
(N'2026-Q1',5366999.1825002721,28650131.4901403636,34017130.6726406366,15.7773424048,84.2226575952,100,-0.2072314378,6.2212487213,5.3245569464,-0.0289061677,5.3534631141,5.3245569464);

IF (SELECT COUNT(*) FROM @quarterly)<>21
 OR (SELECT MIN(period_label) FROM @quarterly)<>N'2021-Q1'
 OR (SELECT MAX(period_label) FROM @quarterly)<>N'2026-Q1'
 OR EXISTS (SELECT 1 FROM @quarterly WHERE ABS(oil_nominal_million_aoa+non_oil_nominal_million_aoa-total_nominal_million_aoa)>0.01)
 OR EXISTS (SELECT 1 FROM @quarterly WHERE ABS(oil_share_pct+non_oil_share_pct-total_share_pct)>0.0001)
 OR EXISTS (SELECT 1 FROM @quarterly WHERE ABS(oil_contribution_pp+non_oil_contribution_pp-total_contribution_pp)>0.0001)
    THROW 51901, 'INE GDP completeness, composition or contribution reconciliation failed.', 1;

IF (SELECT COUNT(*)
    FROM @quarterly q
    JOIN gold.fact_indicator_observation f ON f.reference_period_label=q.period_label AND f.publication_status='PUBLISHED' AND f.is_official=1
    JOIN gold.dim_series s ON s.series_key=f.series_key AND s.series_code=N'GDP_GROWTH_AGO_INE_QUARTERLY_YOY_2015'
    WHERE ABS(q.total_yoy_pct-f.numeric_value)<=0.01)<>21
    THROW 51902, 'INE Q1 total GDP growth does not reconcile to the published GDP series.', 1;

BEGIN TRANSACTION;
DECLARE @now datetime2(3)=SYSUTCDATETIME(),@pipeline_id int,@run_id bigint,@batch_id bigint,@source_id int,@asset_id bigint,
        @frequency_id int,@geo_id int,@dq_id bigint;

IF NOT EXISTS(SELECT 1 FROM control.pipeline_definition WHERE pipeline_code=N'INE_GDP_OIL_NON_OIL_QUARTERLY')
 INSERT control.pipeline_definition(pipeline_code,pipeline_name,source_system)
 VALUES(N'INE_GDP_OIL_NON_OIL_QUARTERLY',N'INE quarterly oil and non-oil GDP decomposition',N'INE Angola');
SELECT @pipeline_id=pipeline_id FROM control.pipeline_definition WHERE pipeline_code=N'INE_GDP_OIL_NON_OIL_QUARTERLY';
INSERT control.pipeline_run(pipeline_id,run_status,trigger_type,started_at) VALUES(@pipeline_id,'STARTED','MANUAL',@now); SET @run_id=SCOPE_IDENTITY();
INSERT control.ingestion_batch(pipeline_run_id,batch_code,data_classification,batch_status,acquired_at,source_record_count)
VALUES(@run_id,N'INE_GDP_OIL_NON_OIL_2021Q1_2026Q1_DC34A006','OFFICIAL','RECEIVED',@now,21); SET @batch_id=SCOPE_IDENTITY();

SELECT @source_id=source_id FROM reference.source WHERE source_code=N'INE_GDP_QUARTERLY';
SELECT @frequency_id=frequency_id FROM reference.frequency WHERE frequency_code=N'QUARTERLY';
SELECT @geo_id=geography_id FROM reference.geography WHERE geography_code=N'AGO';

INSERT bronze.source_asset(ingestion_batch_id,source_id,asset_type,asset_name,asset_location,source_version,publication_date,acquired_at,content_hash,content_size_bytes,metadata_json,is_official)
VALUES(@batch_id,@source_id,'XLSX',N'CONTAS NACIONAIS TRIMESTRAIS.xlsx',
N'D:\OneDrive - CA TEIXEIRA INFORMATICA ME\PROJETOS\KEYRUS PORTUGAL\PROJETOS\LAZA\Data Inventory\Datasources Prioritized\CONTAS NACIONAIS TRIMESTRAIS.xlsx',
N'Prioritized workbook updated 2026-06-01; Q1 revised through 2026-Q1','20260529',@now,
CONVERT(varbinary(32),'DC34A0061213F88FC29E6214453C16B0506FB7DB37E5EB47F3A025D174E5C5A5',2),601481,
N'{"sheet":"Q1","table":"Quadro 1 - PIB Petrolifero e Nao Petrolifero","periodDerivation":"quarter year inherited from preceding annual Total row because source first-quarter year cells retain 2003","comparisonCopySha256":"A0221D9A4D33D70E1AA842C5808B0718F0BE61CEEC1051449570933CC4EA6935"}',1);
SET @asset_id=SCOPE_IDENTITY();

INSERT bronze.raw_indicator_observation(ingestion_batch_id,source_asset_id,source_row_number,source_record_key,indicator_code_raw,value_raw,unit_raw,period_raw,raw_payload,record_hash,bronze_status)
SELECT @batch_id,@asset_id,ROW_NUMBER() OVER(ORDER BY period_label),period_label,N'gdp-oil-non-oil',CONVERT(nvarchar(50),non_oil_yoy_pct),N'%',period_label,
       (SELECT q.oil_nominal_million_aoa AS oilNominalMillionAoa,q.non_oil_nominal_million_aoa AS nonOilNominalMillionAoa,q.total_nominal_million_aoa AS totalNominalMillionAoa,
               q.oil_share_pct AS oilSharePct,q.non_oil_share_pct AS nonOilSharePct,q.oil_yoy_pct AS oilYoyPct,q.non_oil_yoy_pct AS nonOilYoyPct,q.total_yoy_pct AS totalYoyPct,
               q.oil_contribution_pp AS oilContributionPp,q.non_oil_contribution_pp AS nonOilContributionPp,q.total_contribution_pp AS totalContributionPp
        FOR JSON PATH,WITHOUT_ARRAY_WRAPPER),
       HASHBYTES('SHA2_256',CONCAT(period_label,N'|',non_oil_yoy_pct,N'|DC34A006')),'ACCEPTED'
FROM @quarterly q;

DECLARE @series_def TABLE(metric_key nvarchar(50),series_code nvarchar(180),unit_code nvarchar(60),indicator_code nvarchar(100),indicator_name nvarchar(250));
INSERT @series_def VALUES
(N'oilNominal',N'INE_GDP_OIL_NOMINAL_QUARTERLY_MAOA',N'MILLION_AOA',N'gdp-oil-nominal',N'Oil GDP at Current Prices'),
(N'nonOilNominal',N'INE_GDP_NON_OIL_NOMINAL_QUARTERLY_MAOA',N'MILLION_AOA',N'gdp-non-oil-nominal',N'Non-Oil GDP at Current Prices'),
(N'oilShare',N'INE_GDP_OIL_SHARE_QUARTERLY',N'PERCENT',N'gdp-oil-share',N'Oil Share of GDP'),
(N'nonOilShare',N'INE_GDP_NON_OIL_SHARE_QUARTERLY',N'PERCENT',N'gdp-non-oil-share',N'Non-Oil Share of GDP'),
(N'oilYoy',N'INE_GDP_OIL_YOY_QUARTERLY',N'PCT_YOY',N'gdp-oil-growth',N'Oil GDP Growth'),
(N'nonOilYoy',N'INE_GDP_NON_OIL_YOY_QUARTERLY',N'PCT_YOY',N'gdp-non-oil-growth',N'Non-Oil GDP Growth'),
(N'oilContribution',N'INE_GDP_OIL_CONTRIBUTION_QUARTERLY_PP',N'PERCENT',N'gdp-oil-contribution',N'Oil Contribution to GDP Growth'),
(N'nonOilContribution',N'INE_GDP_NON_OIL_CONTRIBUTION_QUARTERLY_PP',N'PERCENT',N'gdp-non-oil-contribution',N'Non-Oil Contribution to GDP Growth');

INSERT silver.indicator(indicator_code,indicator_name,domain_name,business_definition,favorable_direction,accountable_owner)
SELECT d.indicator_code,d.indicator_name,N'Economic activity and diversification',
       N'Official INE quarterly national-accounts metric used in the LAZA oil versus non-oil GDP analytical product.','NEUTRAL',N'LAZA Data Steward'
FROM @series_def d WHERE NOT EXISTS(SELECT 1 FROM silver.indicator i WHERE i.indicator_code=d.indicator_code);

INSERT gold.dim_indicator(silver_indicator_id,indicator_code,indicator_name,domain_name,business_definition,favorable_direction,is_active)
SELECT i.indicator_id,i.indicator_code,i.indicator_name,i.domain_name,i.business_definition,i.favorable_direction,i.is_active
FROM silver.indicator i JOIN @series_def d ON d.indicator_code=i.indicator_code
WHERE NOT EXISTS(SELECT 1 FROM gold.dim_indicator g WHERE g.silver_indicator_id=i.indicator_id);

INSERT silver.indicator_series(series_code,indicator_id,source_id,unit_id,frequency_id,geography_id,methodology_version,methodology_notes,series_status)
SELECT d.series_code,i.indicator_id,@source_id,u.unit_id,@frequency_id,@geo_id,N'INE Q1 revised 2026-Q1',
       N'Published workbook values preserved. Quarter year derives from the preceding annual Total row due to a documented source-cell label defect.','VALIDATED'
FROM @series_def d JOIN silver.indicator i ON i.indicator_code=d.indicator_code JOIN reference.unit u ON u.unit_code=d.unit_code;

DECLARE @values TABLE(period_label nvarchar(7),metric_key nvarchar(50),numeric_value decimal(38,10));
INSERT @values
SELECT q.period_label,v.metric_key,v.numeric_value FROM @quarterly q CROSS APPLY(VALUES
 (N'oilNominal',q.oil_nominal_million_aoa),(N'nonOilNominal',q.non_oil_nominal_million_aoa),
 (N'oilShare',q.oil_share_pct),(N'nonOilShare',q.non_oil_share_pct),(N'oilYoy',q.oil_yoy_pct),(N'nonOilYoy',q.non_oil_yoy_pct),
 (N'oilContribution',q.oil_contribution_pp),(N'nonOilContribution',q.non_oil_contribution_pp)
)v(metric_key,numeric_value);

INSERT silver.observation(series_id,ingestion_batch_id,source_asset_id,raw_observation_id,reference_period_label,reference_period_start,reference_period_end,period_precision,numeric_value,display_value,trend_direction,publication_date,quality_status,publication_status,is_official,observation_hash)
SELECT s.series_id,@batch_id,@asset_id,r.raw_observation_id,v.period_label,
       DATEFROMPARTS(CONVERT(int,LEFT(v.period_label,4)),(CONVERT(int,RIGHT(v.period_label,1))-1)*3+1,1),
       EOMONTH(DATEFROMPARTS(CONVERT(int,LEFT(v.period_label,4)),CONVERT(int,RIGHT(v.period_label,1))*3,1)),
       'QUARTER',v.numeric_value,
       CASE WHEN d.unit_code=N'MILLION_AOA' THEN CONCAT(CONVERT(decimal(12,2),v.numeric_value/1000000),N'T Kz') ELSE CONCAT(CONVERT(decimal(12,2),v.numeric_value),N'%') END,
       CASE WHEN v.numeric_value>0 THEN 'UP' WHEN v.numeric_value<0 THEN 'DOWN' ELSE 'STABLE' END,
       '20260529','PASSED','VALIDATED',0,HASHBYTES('SHA2_256',CONCAT(s.series_id,N'|',v.period_label,N'|',v.numeric_value,N'|DC34A006'))
FROM @values v JOIN @series_def d ON d.metric_key=v.metric_key JOIN silver.indicator_series s ON s.series_code=d.series_code
JOIN bronze.raw_indicator_observation r ON r.ingestion_batch_id=@batch_id AND r.source_record_key=v.period_label;

MERGE [dq].[rule] t USING(VALUES
(N'INE_GDP_DECOMP_COMPLETE',N'GDP decomposition has 21 complete quarters','COMPLETENESS','CRITICAL'),
(N'INE_GDP_DECOMP_UNIQUE',N'GDP decomposition quarter is unique','UNIQUENESS','CRITICAL'),
(N'INE_GDP_DECOMP_COMPOSITION',N'Oil plus non-oil nominal GDP equals total GDP','CONSISTENCY','HIGH'),
(N'INE_GDP_DECOMP_SHARES',N'Oil and non-oil shares sum to 100 percent','CONSISTENCY','HIGH'),
(N'INE_GDP_DECOMP_CONTRIBUTIONS',N'Oil and non-oil contributions equal total growth','CONSISTENCY','HIGH'),
(N'INE_GDP_DECOMP_PERIOD_LABEL',N'Quarter year derived from annual block due to source label defect','VALIDITY','LOW')
)s(code,name,dimension,severity) ON t.rule_code=s.code
WHEN NOT MATCHED THEN INSERT(rule_code,rule_name,quality_dimension,default_severity)VALUES(s.code,s.name,s.dimension,s.severity);

INSERT dq.rule_version(rule_id,version_number,rule_expression,parameter_json,effective_from,is_current)
SELECT r.rule_id,1,N'Validate coverage, uniqueness, nominal composition, share sum, growth contribution reconciliation and deterministic period derivation.',
N'{"expectedQuarters":21,"periodStart":"2021-Q1","periodEnd":"2026-Q1","tolerance":0.01,"sourceLabelException":"first-quarter year cells retain 2003; year inherited from preceding Total row"}',@now,1
FROM [dq].[rule] r WHERE r.rule_code LIKE N'INE_GDP_DECOMP_%' AND NOT EXISTS(SELECT 1 FROM dq.rule_version v WHERE v.rule_id=r.rule_id);

INSERT dq.execution(pipeline_run_id,ingestion_batch_id,execution_status,started_at,ended_at)VALUES(@run_id,@batch_id,'WARNING',@now,@now); SET @dq_id=SCOPE_IDENTITY();
INSERT dq.result(dq_execution_id,rule_version_id,observation_id,result_status,observed_value,result_message)
SELECT @dq_id,rv.rule_version_id,o.observation_id,CASE WHEN dq_rule.rule_code=N'INE_GDP_DECOMP_PERIOD_LABEL' THEN 'WARN' ELSE 'PASS' END,o.reference_period_label,
       CASE WHEN dq_rule.rule_code=N'INE_GDP_DECOMP_PERIOD_LABEL' THEN N'Quarter year inherited from the correctly labelled preceding annual Total row; no measure value changed.' ELSE N'Rule passed.' END
FROM silver.observation o CROSS JOIN [dq].[rule] dq_rule JOIN dq.rule_version rv ON rv.rule_id=dq_rule.rule_id AND rv.is_current=1
WHERE o.ingestion_batch_id=@batch_id AND dq_rule.rule_code LIKE N'INE_GDP_DECOMP_%';

INSERT dq.exception(dq_result_id,exception_status,justification,requested_by,requested_at,resolved_by,resolved_at)
SELECT result.dq_result_id,'APPROVED',N'Workbook period-label defect is unambiguous because each four-quarter group follows a correctly labelled annual Total row; all values and total GDP growth reconcile.',SUSER_SNAME(),@now,SUSER_SNAME(),@now
FROM dq.result result JOIN dq.rule_version rv ON rv.rule_version_id=result.rule_version_id JOIN [dq].[rule] dq_rule ON dq_rule.rule_id=rv.rule_id
WHERE result.dq_execution_id=@dq_id AND dq_rule.rule_code=N'INE_GDP_DECOMP_PERIOD_LABEL';
INSERT dq.indicator_score(dq_execution_id,observation_id,quality_score,passed_rules,warning_rules,failed_rules)
SELECT @dq_id,observation_id,99.50,5,1,0 FROM silver.observation WHERE ingestion_batch_id=@batch_id;
INSERT dq.approval(observation_id,decision,decision_scope,decision_notes,decided_by)
SELECT observation_id,'APPROVE','OFFICIAL',N'Official INE values validated with documented period-label derivation.',SUSER_SNAME() FROM silver.observation WHERE ingestion_batch_id=@batch_id;
UPDATE silver.observation SET publication_status='PUBLISHED',is_official=1 WHERE ingestion_batch_id=@batch_id;

INSERT gold.dim_source(silver_source_id,source_code,source_name,organization_name,homepage_url)
SELECT source_id,source_code,source_name,organization_name,homepage_url FROM reference.source s WHERE s.source_id=@source_id AND NOT EXISTS(SELECT 1 FROM gold.dim_source g WHERE g.silver_source_id=s.source_id);
INSERT gold.dim_series(silver_series_id,series_code,frequency_code,frequency_name,methodology_version)
SELECT s.series_id,s.series_code,f.frequency_code,f.frequency_name,s.methodology_version FROM silver.indicator_series s JOIN reference.frequency f ON f.frequency_id=s.frequency_id JOIN @series_def d ON d.series_code=s.series_code;
;WITH dates AS(SELECT DATEFROMPARTS(CONVERT(int,LEFT(period_label,4)),(CONVERT(int,RIGHT(period_label,1))-1)*3+1,1)d FROM @quarterly UNION SELECT EOMONTH(DATEFROMPARTS(CONVERT(int,LEFT(period_label,4)),CONVERT(int,RIGHT(period_label,1))*3,1)) FROM @quarterly)
INSERT gold.dim_date(date_key,full_date,calendar_year,calendar_quarter,calendar_month,month_name)
SELECT CONVERT(int,CONVERT(char(8),d,112)),d,YEAR(d),DATEPART(quarter,d),MONTH(d),DATENAME(month,d) FROM dates x WHERE NOT EXISTS(SELECT 1 FROM gold.dim_date gd WHERE gd.full_date=x.d);
INSERT gold.fact_indicator_observation(silver_observation_id,indicator_key,series_key,source_key,unit_key,geography_key,period_start_date_key,period_end_date_key,reference_period_label,numeric_value,display_value,trend_direction,quality_status,quality_score,publication_status,is_official,source_asset_id)
SELECT o.observation_id,gi.indicator_key,gs.series_key,gsrc.source_key,gu.unit_key,gg.geography_key,ds.date_key,de.date_key,o.reference_period_label,o.numeric_value,o.display_value,o.trend_direction,o.quality_status,99.50,'PUBLISHED',1,o.source_asset_id
FROM silver.observation o JOIN silver.indicator_series s ON s.series_id=o.series_id JOIN gold.dim_indicator gi ON gi.silver_indicator_id=s.indicator_id JOIN gold.dim_series gs ON gs.silver_series_id=s.series_id
JOIN gold.dim_source gsrc ON gsrc.silver_source_id=s.source_id JOIN gold.dim_unit gu ON gu.silver_unit_id=s.unit_id JOIN gold.dim_geography gg ON gg.silver_geography_id=s.geography_id
JOIN gold.dim_date ds ON ds.full_date=o.reference_period_start JOIN gold.dim_date de ON de.full_date=o.reference_period_end WHERE o.ingestion_batch_id=@batch_id;
UPDATE control.ingestion_batch SET batch_status='VALIDATED',accepted_record_count=21,rejected_record_count=0 WHERE ingestion_batch_id=@batch_id;
UPDATE control.pipeline_run SET run_status='SUCCEEDED',ended_at=@now,rows_read=21,rows_written=168,rows_rejected=0 WHERE pipeline_run_id=@run_id;
INSERT audit.pipeline_event(pipeline_run_id,ingestion_batch_id,event_type,event_level,event_message,event_context)
VALUES(@run_id,@batch_id,'INE_GDP_DECOMPOSITION_INITIAL_LOAD','WARN',N'21 official quarters and 168 oil/non-oil GDP observations published.',N'{"sourceQuarters":21,"goldObservations":168,"acceptedPeriodLabelException":true}');
COMMIT;
GO

CREATE OR ALTER VIEW api.vw_ine_oil_non_oil_gdp_quarterly
AS
WITH metrics AS
(
 SELECT f.reference_period_label AS period,MAX(d.full_date) AS period_start,MAX(source.homepage_url) AS source_url,MIN(f.quality_score) AS quality_score,
 MAX(CASE WHEN s.series_code=N'INE_GDP_OIL_NOMINAL_QUARTERLY_MAOA' THEN f.numeric_value END) oil_nominal_million_aoa,
 MAX(CASE WHEN s.series_code=N'INE_GDP_NON_OIL_NOMINAL_QUARTERLY_MAOA' THEN f.numeric_value END) non_oil_nominal_million_aoa,
 MAX(CASE WHEN s.series_code=N'INE_GDP_OIL_SHARE_QUARTERLY' THEN f.numeric_value END) oil_share_pct,
 MAX(CASE WHEN s.series_code=N'INE_GDP_NON_OIL_SHARE_QUARTERLY' THEN f.numeric_value END) non_oil_share_pct,
 MAX(CASE WHEN s.series_code=N'INE_GDP_OIL_YOY_QUARTERLY' THEN f.numeric_value END) oil_yoy_pct,
 MAX(CASE WHEN s.series_code=N'INE_GDP_NON_OIL_YOY_QUARTERLY' THEN f.numeric_value END) non_oil_yoy_pct,
 MAX(CASE WHEN s.series_code=N'INE_GDP_OIL_CONTRIBUTION_QUARTERLY_PP' THEN f.numeric_value END) oil_contribution_pp,
 MAX(CASE WHEN s.series_code=N'INE_GDP_NON_OIL_CONTRIBUTION_QUARTERLY_PP' THEN f.numeric_value END) non_oil_contribution_pp
 FROM gold.fact_indicator_observation f JOIN gold.dim_series s ON s.series_key=f.series_key JOIN gold.dim_date d ON d.date_key=f.period_start_date_key
 JOIN gold.dim_source source ON source.source_key=f.source_key
 WHERE s.series_code IN
 (N'INE_GDP_OIL_NOMINAL_QUARTERLY_MAOA',N'INE_GDP_NON_OIL_NOMINAL_QUARTERLY_MAOA',N'INE_GDP_OIL_SHARE_QUARTERLY',N'INE_GDP_NON_OIL_SHARE_QUARTERLY',
  N'INE_GDP_OIL_YOY_QUARTERLY',N'INE_GDP_NON_OIL_YOY_QUARTERLY',N'INE_GDP_OIL_CONTRIBUTION_QUARTERLY_PP',N'INE_GDP_NON_OIL_CONTRIBUTION_QUARTERLY_PP')
 AND f.publication_status='PUBLISHED' AND f.is_official=1
 GROUP BY f.reference_period_label
), total_growth AS
(
 SELECT f.reference_period_label AS period,f.numeric_value AS total_yoy_pct FROM gold.fact_indicator_observation f JOIN gold.dim_series s ON s.series_key=f.series_key
 WHERE s.series_code=N'GDP_GROWTH_AGO_INE_QUARTERLY_YOY_2015' AND f.publication_status='PUBLISHED' AND f.is_official=1
)
SELECT m.period,CONVERT(char(10),m.period_start,23) period_start,m.source_url,
CONVERT(float,m.oil_nominal_million_aoa) oil_nominal_million_aoa,CONVERT(float,m.non_oil_nominal_million_aoa) non_oil_nominal_million_aoa,
CONVERT(float,m.oil_share_pct) oil_share_pct,CONVERT(float,m.non_oil_share_pct) non_oil_share_pct,
CONVERT(float,m.oil_yoy_pct) oil_yoy_pct,CONVERT(float,m.non_oil_yoy_pct) non_oil_yoy_pct,CONVERT(float,t.total_yoy_pct) total_yoy_pct,
CONVERT(float,m.oil_contribution_pp) oil_contribution_pp,CONVERT(float,m.non_oil_contribution_pp) non_oil_contribution_pp,
CONVERT(float,m.oil_contribution_pp+m.non_oil_contribution_pp) total_contribution_pp,m.quality_score,CONVERT(bit,1) has_accepted_exception
FROM metrics m JOIN total_growth t ON t.period=m.period;
GO

SELECT (SELECT COUNT(*) FROM bronze.raw_indicator_observation WHERE ingestion_batch_id=(SELECT ingestion_batch_id FROM control.ingestion_batch WHERE batch_code=N'INE_GDP_OIL_NON_OIL_2021Q1_2026Q1_DC34A006')) bronze_rows,
       (SELECT COUNT(*) FROM silver.observation o JOIN silver.indicator_series s ON s.series_id=o.series_id WHERE s.series_code IN(N'INE_GDP_OIL_NOMINAL_QUARTERLY_MAOA',N'INE_GDP_NON_OIL_NOMINAL_QUARTERLY_MAOA',N'INE_GDP_OIL_SHARE_QUARTERLY',N'INE_GDP_NON_OIL_SHARE_QUARTERLY',N'INE_GDP_OIL_YOY_QUARTERLY',N'INE_GDP_NON_OIL_YOY_QUARTERLY',N'INE_GDP_OIL_CONTRIBUTION_QUARTERLY_PP',N'INE_GDP_NON_OIL_CONTRIBUTION_QUARTERLY_PP')) silver_rows,
       (SELECT COUNT(*) FROM api.vw_ine_oil_non_oil_gdp_quarterly) api_quarters;
GO
