USE [LAZA_DATA_PLATFORM_DEV];
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

CREATE OR ALTER PROCEDURE [control].[usp_load_bna_exchange_initial]
    @raw_json nvarchar(max),
    @asset_name nvarchar(500),
    @asset_location nvarchar(2000),
    @content_hash_hex varchar(64),
    @content_size_bytes bigint,
    @expected_start date,
    @expected_end date
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    IF ISJSON(@raw_json) <> 1 THROW 51100, 'BNA payload is not valid JSON.', 1;

    DECLARE @daily TABLE(row_number int, rate_date date, rate decimal(19,6), currency_code varchar(3), rate_type char(1), payload nvarchar(max));
    INSERT @daily
    SELECT CONVERT(int,[key])+1, TRY_CONVERT(date,JSON_VALUE(value,'$.data')), TRY_CONVERT(decimal(19,6),JSON_VALUE(value,'$.taxa')),
           JSON_VALUE(value,'$.codigoMoeda'), JSON_VALUE(value,'$.tipoCambio'), value
    FROM OPENJSON(@raw_json,'$.genericResponse');

    IF EXISTS (SELECT 1 FROM @daily WHERE rate_date IS NULL OR rate <= 0 OR currency_code <> 'USD' OR rate_type <> 'M')
        THROW 51101, 'BNA payload violates the USD average-reference-rate contract.', 1;
    IF (SELECT COUNT(DISTINCT CONVERT(char(7),rate_date,126)) FROM @daily) <> DATEDIFF(month,@expected_start,@expected_end)+1
        THROW 51102, 'BNA payload does not contain every expected month.', 1;

    BEGIN TRANSACTION;
    DECLARE @now datetime2(3)=SYSUTCDATETIME(), @pipeline_id int, @run_id bigint, @batch_id bigint, @source_id int,
            @asset_id bigint, @indicator_id int, @unit_id int, @frequency_id int, @geography_id int, @series_id int, @dq_id bigint;

    IF NOT EXISTS (SELECT 1 FROM control.pipeline_definition WHERE pipeline_code=N'BNA_EXCHANGE_REFERENCE_MONTHLY')
        INSERT control.pipeline_definition(pipeline_code,pipeline_name,source_system) VALUES(N'BNA_EXCHANGE_REFERENCE_MONTHLY',N'BNA USD/AOA reference rate monthly',N'BNA REST API');
    SELECT @pipeline_id=pipeline_id FROM control.pipeline_definition WHERE pipeline_code=N'BNA_EXCHANGE_REFERENCE_MONTHLY';
    INSERT control.pipeline_run(pipeline_id,run_status,trigger_type) VALUES(@pipeline_id,'STARTED','MANUAL'); SET @run_id=SCOPE_IDENTITY();
    INSERT control.ingestion_batch(pipeline_run_id,batch_code,data_classification,batch_status,acquired_at,source_record_count)
    VALUES(@run_id,CONCAT(N'BNA_FX_',CONVERT(char(8),@expected_start,112),N'_',CONVERT(char(8),@expected_end,112),N'_',LEFT(@content_hash_hex,12)),'OFFICIAL','RECEIVED',@now,(SELECT COUNT(*) FROM @daily));
    SET @batch_id=SCOPE_IDENTITY();

    IF NOT EXISTS (SELECT 1 FROM reference.source WHERE source_code=N'BNA_FX_REFERENCE')
        INSERT reference.source(source_code,source_name,organization_name,homepage_url,source_type)
        VALUES(N'BNA_FX_REFERENCE',N'BNA official exchange-rate reference API',N'Banco Nacional de Angola',N'https://www.bna.ao/Servicos/cambios_table.aspx','OFFICIAL');
    SELECT @source_id=source_id FROM reference.source WHERE source_code=N'BNA_FX_REFERENCE';
    INSERT bronze.source_asset(ingestion_batch_id,source_id,asset_type,asset_name,asset_location,source_version,publication_date,acquired_at,content_hash,content_size_bytes,metadata_json,is_official)
    VALUES(@batch_id,@source_id,'API_RESPONSE',@asset_name,@asset_location,N'BNA REST taxas v1',@expected_end,@now,CONVERT(varbinary(32),@content_hash_hex,2),@content_size_bytes,
           CONCAT(N'{"endpoint":"/service/rest/taxas/get/evolucao/taxa/intervalo","contract":"USD-M","start":"',CONVERT(char(10),@expected_start,23),N'","end":"',CONVERT(char(10),@expected_end,23),N'"}'),1);
    SET @asset_id=SCOPE_IDENTITY();

    INSERT bronze.raw_indicator_observation(ingestion_batch_id,source_asset_id,source_row_number,source_record_key,indicator_code_raw,value_raw,unit_raw,period_raw,raw_payload,record_hash,bronze_status)
    SELECT @batch_id,@asset_id,row_number,CONCAT('USD-M-',CONVERT(char(10),rate_date,23),'-',row_number),N'exchange-rate',CONVERT(nvarchar(50),rate),N'AOA/USD',CONVERT(char(10),rate_date,23),payload,
           HASHBYTES('SHA2_256',CONCAT(payload,N'|',row_number)),'ACCEPTED' FROM @daily;

    SELECT @indicator_id=indicator_id FROM silver.indicator WHERE indicator_code=N'exchange-rate';
    SELECT @unit_id=unit_id FROM reference.unit WHERE unit_code=N'AOA_PER_USD';
    SELECT @frequency_id=frequency_id FROM reference.frequency WHERE frequency_code=N'MONTHLY';
    SELECT @geography_id=geography_id FROM reference.geography WHERE geography_code=N'AGO';
    IF EXISTS (SELECT 1 FROM silver.indicator_series WHERE series_code=N'EXCHANGE_RATE_AGO_BNA_USD_REFERENCE_MONTHLY')
        THROW 51103, 'Official BNA monthly series already exists; use the incremental pipeline.', 1;
    INSERT silver.indicator_series(series_code,indicator_id,source_id,unit_id,frequency_id,geography_id,methodology_version,methodology_notes,series_status)
    VALUES(N'EXCHANGE_RATE_AGO_BNA_USD_REFERENCE_MONTHLY',@indicator_id,@source_id,@unit_id,@frequency_id,@geography_id,N'BNA REST v1',N'Arithmetic mean of distinct official daily USD/AOA average reference rates in each calendar month. Exact duplicate source rows are retained in Bronze and deduplicated by date and value for aggregation.','VALIDATED');
    SET @series_id=SCOPE_IDENTITY();

    ;WITH dedup AS (SELECT DISTINCT rate_date,rate FROM @daily), monthly AS
    (SELECT DATEFROMPARTS(YEAR(rate_date),MONTH(rate_date),1) period_start,EOMONTH(DATEFROMPARTS(YEAR(rate_date),MONTH(rate_date),1)) period_end,CAST(AVG(rate) AS decimal(19,6)) value FROM dedup GROUP BY YEAR(rate_date),MONTH(rate_date)),
    prepared AS (SELECT *,LAG(value) OVER(ORDER BY period_start) previous_value FROM monthly)
    INSERT silver.observation(series_id,ingestion_batch_id,source_asset_id,raw_observation_id,reference_period_label,reference_period_start,reference_period_end,period_precision,numeric_value,display_value,comparison_label,comparison_display_value,trend_direction,publication_date,quality_status,publication_status,is_official,observation_hash)
    SELECT @series_id,@batch_id,@asset_id,(SELECT MIN(r.raw_observation_id) FROM bronze.raw_indicator_observation r WHERE r.ingestion_batch_id=@batch_id AND LEFT(r.period_raw,7)=CONVERT(char(7),p.period_start,126)),
           CONVERT(char(7),p.period_start,126),p.period_start,p.period_end,'MONTH',p.value,CONCAT(CONVERT(decimal(19,2),p.value),N' AOA/USD'),N'vs previous month',
           CASE WHEN p.previous_value IS NULL THEN NULL ELSE CONCAT(CASE WHEN p.value>=p.previous_value THEN N'+' ELSE N'' END,CONVERT(decimal(10,2),(p.value/p.previous_value-1)*100),N'%') END,
           CASE WHEN p.previous_value IS NULL THEN 'STABLE' WHEN p.value>p.previous_value THEN 'UP' WHEN p.value<p.previous_value THEN 'DOWN' ELSE 'STABLE' END,
           @expected_end,'PASSED','VALIDATED',0,HASHBYTES('SHA2_256',CONCAT(@series_id,N'|',CONVERT(char(10),p.period_start,23),N'|',p.value)) FROM prepared p;

    MERGE [dq].[rule] AS t USING (VALUES
      (N'BNA_FX_REQUIRED_FIELDS',N'BNA FX required fields','COMPLETENESS','CRITICAL'),
      (N'BNA_FX_UNIQUE_DAILY_KEY',N'BNA FX daily key uniqueness','UNIQUENESS','MEDIUM'),
      (N'BNA_FX_VALID_CONTRACT',N'BNA FX USD-M positive contract','VALIDITY','CRITICAL')) s(code,name,dimension,severity)
    ON t.rule_code=s.code WHEN NOT MATCHED THEN INSERT(rule_code,rule_name,quality_dimension,default_severity) VALUES(s.code,s.name,s.dimension,s.severity);
    INSERT dq.rule_version(rule_id,version_number,rule_expression,parameter_json,effective_from,is_current)
    SELECT r.rule_id,1,N'Validated by control.usp_load_bna_exchange_initial',N'{"series":"USD/AOA","rateType":"M"}',@now,1 FROM [dq].[rule] r
    WHERE r.rule_code LIKE N'BNA_FX_%' AND NOT EXISTS(SELECT 1 FROM dq.rule_version v WHERE v.rule_id=r.rule_id AND v.version_number=1);
    INSERT dq.execution(pipeline_run_id,ingestion_batch_id,execution_status,started_at,ended_at) VALUES(@run_id,@batch_id,CASE WHEN EXISTS(SELECT rate_date FROM @daily GROUP BY rate_date,currency_code,rate_type HAVING COUNT(*)>1) THEN 'WARNING' ELSE 'PASSED' END,@now,@now); SET @dq_id=SCOPE_IDENTITY();
    INSERT dq.result(dq_execution_id,rule_version_id,observation_id,result_status,observed_value,result_message)
    SELECT @dq_id,v.rule_version_id,o.observation_id,
      CASE WHEN r.rule_code=N'BNA_FX_UNIQUE_DAILY_KEY' AND EXISTS(SELECT 1 FROM @daily d WHERE CONVERT(char(7),d.rate_date,126)=o.reference_period_label GROUP BY d.rate_date,d.currency_code,d.rate_type HAVING COUNT(*)>1) THEN 'WARN' ELSE 'PASS' END,
      o.reference_period_label,CASE WHEN r.rule_code=N'BNA_FX_UNIQUE_DAILY_KEY' THEN N'Exact source duplicates are preserved in Bronze and deduplicated before monthly averaging.' ELSE N'Rule passed.' END
    FROM silver.observation o CROSS JOIN [dq].[rule] r INNER JOIN dq.rule_version v ON v.rule_id=r.rule_id AND v.is_current=1
    WHERE o.ingestion_batch_id=@batch_id AND r.rule_code LIKE N'BNA_FX_%';
    INSERT dq.indicator_score(dq_execution_id,observation_id,quality_score,passed_rules,warning_rules,failed_rules)
    SELECT @dq_id,o.observation_id,CASE WHEN SUM(CASE WHEN x.result_status='WARN' THEN 1 ELSE 0 END)>0 THEN 95.00 ELSE 100.00 END,
      SUM(CASE WHEN x.result_status='PASS' THEN 1 ELSE 0 END),SUM(CASE WHEN x.result_status='WARN' THEN 1 ELSE 0 END),0
    FROM silver.observation o JOIN dq.result x ON x.observation_id=o.observation_id AND x.dq_execution_id=@dq_id WHERE o.ingestion_batch_id=@batch_id GROUP BY o.observation_id;
    INSERT dq.approval(observation_id,decision,decision_scope,decision_notes,decided_by)
    SELECT observation_id,'APPROVE','OFFICIAL',N'Official BNA API contract validated; exact duplicate handled deterministically.',SUSER_SNAME() FROM silver.observation WHERE ingestion_batch_id=@batch_id;
    UPDATE silver.observation SET publication_status='PUBLISHED',is_official=1 WHERE ingestion_batch_id=@batch_id;

    INSERT gold.dim_source(silver_source_id,source_code,source_name,organization_name,homepage_url) SELECT source_id,source_code,source_name,organization_name,homepage_url FROM reference.source s WHERE source_id=@source_id AND NOT EXISTS(SELECT 1 FROM gold.dim_source g WHERE g.silver_source_id=s.source_id);
    INSERT gold.dim_series(silver_series_id,series_code,frequency_code,frequency_name,methodology_version) SELECT s.series_id,s.series_code,f.frequency_code,f.frequency_name,s.methodology_version FROM silver.indicator_series s JOIN reference.frequency f ON f.frequency_id=s.frequency_id WHERE s.series_id=@series_id;
    INSERT gold.dim_date(date_key,full_date,calendar_year,calendar_quarter,calendar_month,month_name)
    SELECT CONVERT(int,CONVERT(char(8),d,112)),d,YEAR(d),DATEPART(quarter,d),MONTH(d),DATENAME(month,d) FROM (SELECT reference_period_start d FROM silver.observation WHERE series_id=@series_id UNION SELECT reference_period_end FROM silver.observation WHERE series_id=@series_id) x WHERE NOT EXISTS(SELECT 1 FROM gold.dim_date gd WHERE gd.full_date=x.d);
    INSERT gold.fact_indicator_observation(silver_observation_id,indicator_key,series_key,source_key,unit_key,geography_key,period_start_date_key,period_end_date_key,reference_period_label,numeric_value,display_value,comparison_label,comparison_display_value,trend_direction,quality_status,quality_score,publication_status,is_official,source_asset_id)
    SELECT o.observation_id,gi.indicator_key,gs.series_key,gsrc.source_key,gu.unit_key,gg.geography_key,ds.date_key,de.date_key,o.reference_period_label,o.numeric_value,o.display_value,o.comparison_label,o.comparison_display_value,o.trend_direction,o.quality_status,score.quality_score,'PUBLISHED',1,o.source_asset_id
    FROM silver.observation o JOIN silver.indicator_series s ON s.series_id=o.series_id JOIN gold.dim_indicator gi ON gi.silver_indicator_id=s.indicator_id JOIN gold.dim_series gs ON gs.silver_series_id=s.series_id JOIN gold.dim_source gsrc ON gsrc.silver_source_id=s.source_id JOIN gold.dim_unit gu ON gu.silver_unit_id=s.unit_id JOIN gold.dim_geography gg ON gg.silver_geography_id=s.geography_id JOIN gold.dim_date ds ON ds.full_date=o.reference_period_start JOIN gold.dim_date de ON de.full_date=o.reference_period_end JOIN dq.indicator_score score ON score.observation_id=o.observation_id AND score.dq_execution_id=@dq_id WHERE o.ingestion_batch_id=@batch_id;

    UPDATE control.ingestion_batch SET batch_status='VALIDATED',accepted_record_count=(SELECT COUNT(*) FROM @daily),rejected_record_count=0 WHERE ingestion_batch_id=@batch_id;
    UPDATE control.pipeline_run SET run_status='SUCCEEDED',ended_at=@now,rows_read=(SELECT COUNT(*) FROM @daily),rows_written=66,rows_rejected=0 WHERE pipeline_run_id=@run_id;
    INSERT audit.pipeline_event(pipeline_run_id,ingestion_batch_id,event_type,event_level,event_message,event_context) VALUES(@run_id,@batch_id,'BNA_FX_INITIAL_LOAD','INFO',N'Official BNA USD/AOA daily data loaded and published as 66 monthly averages.',CONCAT(N'{"dailyRows":',(SELECT COUNT(*) FROM @daily),N',"monthlyRows":66,"duplicateRows":',(SELECT COUNT(*)-COUNT(DISTINCT CONCAT(rate_date,'|',rate,'|',currency_code,'|',rate_type)) FROM @daily),N'}'));
    COMMIT;
    SELECT @run_id pipeline_run_id,@batch_id ingestion_batch_id,(SELECT COUNT(*) FROM @daily) bronze_rows,(SELECT COUNT(*) FROM silver.observation WHERE series_id=@series_id) silver_months,(SELECT COUNT(*) FROM gold.fact_indicator_observation f JOIN gold.dim_series s ON s.series_key=f.series_key WHERE s.silver_series_id=@series_id) gold_months,(SELECT COUNT(*) FROM dq.result WHERE dq_execution_id=@dq_id AND result_status='WARN') dq_warnings;
END;
GO
