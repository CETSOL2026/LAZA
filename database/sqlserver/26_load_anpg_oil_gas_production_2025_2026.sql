USE [LAZA_DATA_PLATFORM_DEV];
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

IF EXISTS (SELECT 1 FROM silver.indicator_series WHERE series_code=N'ANPG_OIL_ACTUAL_BOPD')
    THROW 51600, 'Official ANPG oil and gas series already exist.', 1;

DECLARE @monthly TABLE
(
    period_label nvarchar(7) NOT NULL,
    publication_date date NOT NULL,
    oil_total_barrels bigint NOT NULL,
    oil_actual_bopd int NOT NULL,
    oil_forecast_bopd int NOT NULL,
    gas_total_mmcf int NOT NULL,
    gas_actual_mmscfd int NOT NULL,
    gas_reinjected_mmscfd int NOT NULL,
    gas_to_alng_mmscfd int NOT NULL,
    gas_to_power_mmscfd int NOT NULL,
    alng_actual_boe bigint NULL,
    alng_forecast_boe bigint NULL,
    alng_actual_boepd int NULL,
    alng_lng_boepd int NULL,
    alng_propane_boepd int NULL,
    alng_butane_boepd int NULL,
    alng_condensate_boepd int NULL,
    source_url nvarchar(1000) NOT NULL,
    content_sha256 char(64) NOT NULL,
    content_size_bytes int NOT NULL
);

INSERT @monthly VALUES
(N'2025-01','2025-02-19',32673375,1053980,1096363,85476,2757,897,860,285,NULL,NULL,NULL,NULL,NULL,NULL,NULL,N'https://anpg.co.ao/producao/resumo-mensal-sobre-a-producao-petrolifera-janeiro-2025/','642F61334A09362E08A7BE1BCFB7119D87445F71C607F5D041985CF906D7B117',161267),
(N'2025-02','2025-03-17',29530823,1054672,1072085,76776,2742,940,929,289,NULL,NULL,NULL,NULL,NULL,NULL,NULL,N'https://anpg.co.ao/producao/resumo-mensal-sobre-a-producao-petrolifera-fevereiro-2025/','12C4A5F04BFAD235ED1D3FB2E929AD39B581ED52DCB5F28D1C7727EA90C3313B',161543),
(N'2025-03','2025-04-22',32165328,1037591,1089674,82996,2677,950,642,296,2745661,4475659,88570,NULL,NULL,NULL,NULL,N'https://anpg.co.ao/producao/resumo-mensal-sobre-a-producao-petrolifera-marco-2025/','E813A8A5F2756B3D6D23883A00035C9AD1AF7CC06EAF07948DFA7B7168240DB8',161772),
(N'2025-04','2025-05-29',30051122,1001704,1087632,75398,2513,1177,834,372,3877605,4331282,129254,109572,8388,6359,4934,N'https://anpg.co.ao/producao/resumo-mensal-sobre-a-producao-petrolifera-abril-2025/','9493A1382EF91B6703E6A1982D031D2A5590ECC00CEF2C7FFF7407C7C5DA386C',161768),
(N'2025-05','2025-06-13',31480001,1015484,1165853,81095,2616,1130,881,304,4482790,4475659,144606,124704,8586,6479,4837,N'https://anpg.co.ao/producao/resumo-mensal-sobre-a-producao-petrolifera-maio-2025/','2C1D47FA07980C475B088FC14FB0D508D3E60F502C475C4AB472949B58420A4F',161166),
(N'2025-06','2025-07-14',30085813,1002860,1026433,71929,2398,1073,873,278,3361319,4331282,112044,95081,7203,5468,4292,N'https://anpg.co.ao/producao/resumo-mensal-sobre-a-producao-petrolifera-junho-2025/','9C8AA03649A2A23AA6CB3D200567A0CEA79C4363E32D0F4E1C77423AE8EFCF85',161410),
(N'2025-07','2025-08-20',30961452,998757,1073542,82307,2655,1059,1019,307,5445258,4523941,175653,152860,10036,7600,5157,N'https://anpg.co.ao/producao/resumo-mensal-sobre-a-producao-petrolifera-julho-2025/','3AD6E2FDA67A35E35271AD2C517628E3ECA1055CFF8409B5AE77EA8EBDB04DDF',163177),
(N'2025-08','2025-09-19',32074313,1034655,1086727,81696,2635,1402,962,307,4936748,4523766,159250,136486,9885,7444,5435,N'https://anpg.co.ao/producao/resumo-mensal-sobre-a-producao-petrolifera-agosto-2025/','1E08C922BCB6915A2FD15ED35A4C066CB7F632839259354A94430411806846BC',162126),
(N'2025-09','2025-10-15',31775907,1059197,1127185,71823,2394,1323,964,323,5027076,4377838,167569,146900,9120,6665,4883,N'https://anpg.co.ao/producao/resumo-mensal-sobre-a-producao-petrolifera-setembro-2025/','E4520ECBC1327E076F2CC97AA10D74CD5628525C261238BCD9DF62AA7807A521',162306),
(N'2025-10','2025-11-20',33057447,1066369,1060906,92953,2998,1330,896,357,4744390,4523766,153045,130210,9971,7341,5524,N'https://anpg.co.ao/producao/resumo-mensal-sobre-a-producao-petrolifera-outubro-2025/','39E925424281CA42726256829E637F64744224C48D61937DD8D8A7C2F456737D',163317),
(N'2025-11','2025-12-16',31819812,1060660,1100809,97212,3240,1261,992,375,5233684,4377838,174456,147358,11878,8776,6444,N'https://anpg.co.ao/producao/resumo-mensal-sobre-a-producao-petrolifera-novembro-2025/','F1AF88924CA0B0C290EF8E0DFC9D69607CC4834E93E45FDE8F1D281D17E7C0E7',162616),
(N'2025-12','2026-01-28',31863172,1027844,1080238,85425,2756,1210,856,318,4808336,4524156,155108,131643,10390,7608,5466,N'https://anpg.co.ao/producao/resumo-mensal-sobre-a-producao-petrolifera-dezembro-2025/','F0FF23C2B50C310E32E57C0004D26AA543C5CB91EE45381367C16BB9C98205CB',161365),
(N'2026-01','2026-02-13',32310532,1042275,1019277,84629,2730,1171,874,341,4632671,4801404,149441,125469,10897,7777,5297,N'https://anpg.co.ao/producao/resumo-mensal-sobre-a-producao-petrolifera-janeiro-2026/','A7CE7BA4C6E1373243F6B7F65BBD5307125D1124B973FA949B33C3C0FC85C3CE',161680),
(N'2026-02','2026-03-25',28156157,1005577,1029936,72306,2582,1222,928,315,4212515,4373068,150447,128652,9814,7135,4846,N'https://anpg.co.ao/producao/resumo-mensal-sobre-a-producao-petrolifera-fevereiro-2026/','537D5116B406346EC15A4C228CDF88E458E7AE502B0E4C0546B4A10329251D01',161275),
(N'2026-03','2026-04-27',31670636,1021633,1108226,83383,2690,1112,900,299,4770102,4795297,153874,134365,8660,6199,4650,N'https://anpg.co.ao/producao/resumo-mensal-sobre-a-producao-petrolifera-marco-2026/','DD9A19101DAD72205A3BA26CF3DAAC35DA239A83A06EF594537B12F37CDE0C9F',160928),
(N'2026-04','2026-05-21',30906317,1030211,1065071,70396,2347,852,853,286,4377000,4449120,145900,127774,7480,5506,5140,N'https://anpg.co.ao/producao/resumo-mensal-sobre-a-producao-petrolifera-abril-2026/','F2759A00D051A6AB492A2ABD61155084041327448B816B6DCB2141064E8F71CD',161421),
(N'2026-05','2026-06-30',32706727,1055056,1061017,81378,2625,1205,827,317,4972881,4846323,160414,134652,8943,6199,10621,N'https://anpg.co.ao/producao/resumo-mensal-sobre-a-producao-petrolifera-maio-2026/','8D985B81E222D7E0C1D8B1441CCEA9C03C8709CD3BF1EACCE0959DB6328926ED',161344),
(N'2026-06','2026-07-16',31199375,1039979,1026704,79885,2663,1253,869,317,4972881,4845540,166014,142293,10147,7532,6041,N'https://anpg.co.ao/producao/resumo-mensal-sobre-a-producao-petrolifera-junho-2026/','66043E9FCD8EC93AE01C2036395F7B101C0A008B906D1B22AD7E78449565B24B',160880);

IF (SELECT COUNT(*) FROM @monthly) <> 18
 OR (SELECT MIN(period_label) FROM @monthly) <> N'2025-01'
 OR (SELECT MAX(period_label) FROM @monthly) <> N'2026-06'
 OR EXISTS (SELECT period_label FROM @monthly GROUP BY period_label HAVING COUNT(*) > 1)
 OR EXISTS (SELECT 1 FROM @monthly WHERE oil_actual_bopd <= 0 OR oil_forecast_bopd <= 0 OR gas_actual_mmscfd <= 0)
 OR EXISTS
 (
     SELECT 1 FROM @monthly
     WHERE ABS(oil_total_barrels - CONVERT(bigint, oil_actual_bopd) * DAY(EOMONTH(CONVERT(date, period_label + N'-01')))) > DAY(EOMONTH(CONVERT(date, period_label + N'-01')))
        OR ABS(gas_total_mmcf - gas_actual_mmscfd * DAY(EOMONTH(CONVERT(date, period_label + N'-01')))) > DAY(EOMONTH(CONVERT(date, period_label + N'-01')))
 )
 OR EXISTS
 (
     SELECT 1 FROM @monthly
     WHERE gas_reinjected_mmscfd + gas_to_alng_mmscfd + gas_to_power_mmscfd > gas_actual_mmscfd
       AND period_label NOT IN (N'2025-08', N'2025-09')
 )
    THROW 51601, 'ANPG completeness, uniqueness, positivity or reconciliation validation failed.', 1;

BEGIN TRANSACTION;

DECLARE @now datetime2(3)=SYSUTCDATETIME(), @pipeline_id int, @run_id bigint, @batch_id bigint,
        @source_id int, @indicator_id int, @frequency_id int, @geo_id int, @dq_id bigint;

IF NOT EXISTS (SELECT 1 FROM control.pipeline_definition WHERE pipeline_code=N'ANPG_OIL_GAS_MONTHLY')
    INSERT control.pipeline_definition(pipeline_code,pipeline_name,source_system)
    VALUES(N'ANPG_OIL_GAS_MONTHLY',N'ANPG monthly oil and gas production',N'ANPG');
SELECT @pipeline_id=pipeline_id FROM control.pipeline_definition WHERE pipeline_code=N'ANPG_OIL_GAS_MONTHLY';
INSERT control.pipeline_run(pipeline_id,run_status,trigger_type,started_at)
VALUES(@pipeline_id,'STARTED','MANUAL',@now); SET @run_id=SCOPE_IDENTITY();
INSERT control.ingestion_batch(pipeline_run_id,batch_code,data_classification,batch_status,acquired_at,source_record_count)
VALUES(@run_id,N'ANPG_OIL_GAS_202501_202606','OFFICIAL','RECEIVED',@now,18); SET @batch_id=SCOPE_IDENTITY();

IF NOT EXISTS (SELECT 1 FROM reference.source WHERE source_code=N'ANPG_MONTHLY_PRODUCTION')
    INSERT reference.source(source_code,source_name,organization_name,homepage_url,source_type)
    VALUES(N'ANPG_MONTHLY_PRODUCTION',N'ANPG Monthly Oil Production Summary',N'Agência Nacional de Petróleo, Gás e Biocombustíveis',N'https://anpg.co.ao/producao/','OFFICIAL');
SELECT @source_id=source_id FROM reference.source WHERE source_code=N'ANPG_MONTHLY_PRODUCTION';

MERGE reference.unit AS target
USING (VALUES
 (N'BARREL',N'Barrel',N'bbl',1),(N'BOPD',N'Barrels of oil per day',N'BOPD',1),
 (N'MMCF',N'Million cubic feet',N'MMcf',1),(N'MMSCFD',N'Million standard cubic feet per day',N'MMSCFD',1),
 (N'BOE',N'Barrel of oil equivalent',N'BOE',1),(N'BOEPD',N'Barrels of oil equivalent per day',N'BOEPD',1)
) AS source(unit_code,unit_name,symbol,scale_factor)
ON target.unit_code=source.unit_code
WHEN NOT MATCHED THEN INSERT(unit_code,unit_name,symbol,scale_factor)
VALUES(source.unit_code,source.unit_name,source.symbol,source.scale_factor);

IF NOT EXISTS (SELECT 1 FROM silver.indicator WHERE indicator_code=N'oil-gas-production')
    INSERT silver.indicator(indicator_code,indicator_name,domain_name,business_definition,favorable_direction,accountable_owner)
    VALUES(N'oil-gas-production',N'Oil & Gas Production Intelligence',N'Energy and extractive industries',
           N'Monthly official oil, associated-gas and Angola LNG production, including actual-versus-forecast performance and gas allocation.',
           'NEUTRAL',N'LAZA Data Steward');
SELECT @indicator_id=indicator_id FROM silver.indicator WHERE indicator_code=N'oil-gas-production';
SELECT @frequency_id=frequency_id FROM reference.frequency WHERE frequency_code=N'MONTHLY';
SELECT @geo_id=geography_id FROM reference.geography WHERE geography_code=N'AGO';

IF NOT EXISTS (SELECT 1 FROM gold.dim_indicator WHERE silver_indicator_id=@indicator_id)
    INSERT gold.dim_indicator(silver_indicator_id,indicator_code,indicator_name,domain_name,business_definition,favorable_direction,is_active)
    SELECT indicator_id,indicator_code,indicator_name,domain_name,business_definition,favorable_direction,is_active
    FROM silver.indicator WHERE indicator_id=@indicator_id;

DECLARE @asset_map TABLE(period_label nvarchar(7) PRIMARY KEY, source_asset_id bigint NOT NULL);
DECLARE @period nvarchar(7), @publication_date date, @source_url nvarchar(1000), @hash char(64), @size int, @asset_id bigint;
DECLARE asset_cursor CURSOR LOCAL FAST_FORWARD FOR
SELECT period_label,publication_date,source_url,content_sha256,content_size_bytes FROM @monthly ORDER BY period_label;
OPEN asset_cursor;
FETCH NEXT FROM asset_cursor INTO @period,@publication_date,@source_url,@hash,@size;
WHILE @@FETCH_STATUS=0
BEGIN
    INSERT bronze.source_asset(ingestion_batch_id,source_id,asset_type,asset_name,asset_location,source_version,publication_date,acquired_at,content_hash,content_size_bytes,metadata_json,is_official)
    VALUES(@batch_id,@source_id,'HTML',N'anpg_monthly_oil_gas_' + @period + N'.html',@source_url,N'ANPG monthly publication ' + @period,@publication_date,@now,
           CONVERT(varbinary(32),@hash,2),@size,CONCAT(N'{"referencePeriod":"',@period,N'","extractionMethod":"official HTML text","sourceArchive":"https://anpg.co.ao/producao/"}'),1);
    SET @asset_id=SCOPE_IDENTITY();
    INSERT @asset_map VALUES(@period,@asset_id);
    FETCH NEXT FROM asset_cursor INTO @period,@publication_date,@source_url,@hash,@size;
END
CLOSE asset_cursor; DEALLOCATE asset_cursor;

INSERT bronze.raw_indicator_observation(ingestion_batch_id,source_asset_id,source_row_number,source_record_key,indicator_code_raw,value_raw,unit_raw,period_raw,raw_payload,record_hash,bronze_status)
SELECT @batch_id,a.source_asset_id,ROW_NUMBER() OVER(ORDER BY m.period_label),m.period_label,N'oil-gas-production',CONVERT(nvarchar(30),m.oil_actual_bopd),N'BOPD',m.period_label,
       (SELECT m.period_label AS [period],m.oil_total_barrels AS oilTotalBarrels,m.oil_actual_bopd AS oilActualBopd,m.oil_forecast_bopd AS oilForecastBopd,
               m.gas_total_mmcf AS gasTotalMillionCubicFeet,m.gas_actual_mmscfd AS gasActualMmscfd,m.gas_reinjected_mmscfd AS gasReinjectedMmscfd,
               m.gas_to_alng_mmscfd AS gasToAlngMmscfd,m.gas_to_power_mmscfd AS gasToPowerMmscfd,m.alng_actual_boe AS alngActualBoe,
               m.alng_forecast_boe AS alngForecastBoe,m.alng_actual_boepd AS alngActualBoepd,m.alng_lng_boepd AS alngLngBoepd,
               m.alng_propane_boepd AS alngPropaneBoepd,m.alng_butane_boepd AS alngButaneBoepd,m.alng_condensate_boepd AS alngCondensateBoepd
        FOR JSON PATH,WITHOUT_ARRAY_WRAPPER),
       HASHBYTES('SHA2_256',CONCAT(m.period_label,N'|',m.content_sha256,N'|ANPG_OIL_GAS')),'ACCEPTED'
FROM @monthly m JOIN @asset_map a ON a.period_label=m.period_label;

DECLARE @series_def TABLE(metric_key nvarchar(60),series_code nvarchar(180),unit_code nvarchar(60),indicator_code nvarchar(100),indicator_name nvarchar(250));
INSERT @series_def VALUES
(N'oilTotalBarrels',N'ANPG_OIL_TOTAL_BARRELS',N'BARREL',N'oil-production-total',N'Monthly Oil Production'),
(N'oilActualBopd',N'ANPG_OIL_ACTUAL_BOPD',N'BOPD',N'oil-gas-production',N'Oil & Gas Production Intelligence'),
(N'oilForecastBopd',N'ANPG_OIL_FORECAST_BOPD',N'BOPD',N'oil-production-forecast',N'Forecast Daily Oil Production'),
(N'gasTotalMmcf',N'ANPG_GAS_TOTAL_MMCF',N'MMCF',N'associated-gas-total',N'Monthly Associated Gas Production'),
(N'gasActualMmscfd',N'ANPG_GAS_ACTUAL_MMSCFD',N'MMSCFD',N'associated-gas-daily',N'Daily Associated Gas Production'),
(N'gasReinjectedMmscfd',N'ANPG_GAS_REINJECTED_MMSCFD',N'MMSCFD',N'associated-gas-reinjected',N'Gas Reinjected'),
(N'gasToAlngMmscfd',N'ANPG_GAS_TO_ALNG_MMSCFD',N'MMSCFD',N'associated-gas-to-alng',N'Gas Supplied to Angola LNG'),
(N'gasToPowerMmscfd',N'ANPG_GAS_TO_POWER_MMSCFD',N'MMSCFD',N'associated-gas-to-power',N'Gas Used for Facility Power'),
(N'alngActualBoe',N'ANPG_ALNG_ACTUAL_BOE',N'BOE',N'alng-output-total',N'Angola LNG Monthly Output'),
(N'alngForecastBoe',N'ANPG_ALNG_FORECAST_BOE',N'BOE',N'alng-output-forecast',N'Forecast Angola LNG Output'),
(N'alngActualBoepd',N'ANPG_ALNG_ACTUAL_BOEPD',N'BOEPD',N'alng-output-daily',N'Angola LNG Daily Output'),
(N'alngLngBoepd',N'ANPG_ALNG_LNG_BOEPD',N'BOEPD',N'alng-lng-output',N'Angola LNG Product Output'),
(N'alngPropaneBoepd',N'ANPG_ALNG_PROPANE_BOEPD',N'BOEPD',N'alng-propane-output',N'Angola LNG Propane Output'),
(N'alngButaneBoepd',N'ANPG_ALNG_BUTANE_BOEPD',N'BOEPD',N'alng-butane-output',N'Angola LNG Butane Output'),
(N'alngCondensateBoepd',N'ANPG_ALNG_CONDENSATE_BOEPD',N'BOEPD',N'alng-condensate-output',N'Angola LNG Condensate Output');

INSERT silver.indicator(indicator_code,indicator_name,domain_name,business_definition,favorable_direction,accountable_owner)
SELECT d.indicator_code,d.indicator_name,N'Energy and extractive industries',
       N'Official ANPG monthly metric included in the LAZA Oil & Gas Production Intelligence analytical product.',
       'NEUTRAL',N'LAZA Data Steward'
FROM @series_def d
WHERE NOT EXISTS(SELECT 1 FROM silver.indicator i WHERE i.indicator_code=d.indicator_code);

INSERT gold.dim_indicator(silver_indicator_id,indicator_code,indicator_name,domain_name,business_definition,favorable_direction,is_active)
SELECT i.indicator_id,i.indicator_code,i.indicator_name,i.domain_name,i.business_definition,i.favorable_direction,i.is_active
FROM silver.indicator i JOIN @series_def d ON d.indicator_code=i.indicator_code
WHERE NOT EXISTS(SELECT 1 FROM gold.dim_indicator g WHERE g.silver_indicator_id=i.indicator_id);

INSERT silver.indicator_series(series_code,indicator_id,source_id,unit_id,frequency_id,geography_id,methodology_version,methodology_notes,series_status)
SELECT d.series_code,i.indicator_id,@source_id,u.unit_id,@frequency_id,@geo_id,N'ANPG monthly HTML v1',
       N'Official ANPG published value preserved without interpolation. Derived ratios are calculated only in the analytical API view.',N'VALIDATED'
FROM @series_def d JOIN reference.unit u ON u.unit_code=d.unit_code JOIN silver.indicator i ON i.indicator_code=d.indicator_code;

DECLARE @values TABLE(period_label nvarchar(7),metric_key nvarchar(60),numeric_value decimal(38,10));
INSERT @values
SELECT m.period_label,v.metric_key,CONVERT(decimal(38,10),v.numeric_value)
FROM @monthly m
CROSS APPLY (VALUES
 (N'oilTotalBarrels',CONVERT(decimal(38,10),m.oil_total_barrels)),(N'oilActualBopd',m.oil_actual_bopd),(N'oilForecastBopd',m.oil_forecast_bopd),
 (N'gasTotalMmcf',m.gas_total_mmcf),(N'gasActualMmscfd',m.gas_actual_mmscfd),(N'gasReinjectedMmscfd',m.gas_reinjected_mmscfd),
 (N'gasToAlngMmscfd',m.gas_to_alng_mmscfd),(N'gasToPowerMmscfd',m.gas_to_power_mmscfd),(N'alngActualBoe',CONVERT(decimal(38,10),m.alng_actual_boe)),
 (N'alngForecastBoe',CONVERT(decimal(38,10),m.alng_forecast_boe)),(N'alngActualBoepd',m.alng_actual_boepd),(N'alngLngBoepd',m.alng_lng_boepd),
 (N'alngPropaneBoepd',m.alng_propane_boepd),(N'alngButaneBoepd',m.alng_butane_boepd),(N'alngCondensateBoepd',m.alng_condensate_boepd)
) v(metric_key,numeric_value)
WHERE v.numeric_value IS NOT NULL;

INSERT silver.observation(series_id,ingestion_batch_id,source_asset_id,raw_observation_id,reference_period_label,reference_period_start,reference_period_end,period_precision,numeric_value,display_value,comparison_label,comparison_display_value,trend_direction,publication_date,quality_status,publication_status,is_official,observation_hash)
SELECT s.series_id,@batch_id,a.source_asset_id,r.raw_observation_id,m.period_label,CONVERT(date,m.period_label+N'-01'),EOMONTH(CONVERT(date,m.period_label+N'-01')),'MONTH',v.numeric_value,
       CASE d.unit_code
         WHEN N'BOPD' THEN CONCAT(CONVERT(decimal(10,3),v.numeric_value/1000000),N'M BOPD')
         WHEN N'MMSCFD' THEN CONCAT(CONVERT(bigint,v.numeric_value),N' MMSCFD')
         WHEN N'BOEPD' THEN CONCAT(CONVERT(decimal(10,1),v.numeric_value/1000),N'k BOEPD')
         WHEN N'BARREL' THEN CONCAT(CONVERT(decimal(10,2),v.numeric_value/1000000),N'M bbl')
         WHEN N'MMCF' THEN CONCAT(CONVERT(bigint,v.numeric_value),N' MMcf')
         ELSE CONCAT(CONVERT(decimal(10,2),v.numeric_value/1000000),N'M BOE') END,
       CASE WHEN v.metric_key=N'oilActualBopd' THEN N'actual vs ANPG forecast' END,
       CASE WHEN v.metric_key=N'oilActualBopd' THEN CONCAT(CONVERT(decimal(8,2),(CONVERT(decimal(38,10),m.oil_actual_bopd)/m.oil_forecast_bopd-1)*100),N'%') END,
       CASE WHEN v.metric_key=N'oilActualBopd' AND m.oil_actual_bopd>m.oil_forecast_bopd THEN 'UP'
            WHEN v.metric_key=N'oilActualBopd' AND m.oil_actual_bopd<m.oil_forecast_bopd THEN 'DOWN' ELSE 'STABLE' END,
       m.publication_date,'PASSED','VALIDATED',0,HASHBYTES('SHA2_256',CONCAT(s.series_id,N'|',m.period_label,N'|',v.numeric_value,N'|ANPG'))
FROM @values v
JOIN @monthly m ON m.period_label=v.period_label
JOIN @series_def d ON d.metric_key=v.metric_key
JOIN silver.indicator_series s ON s.series_code=d.series_code
JOIN @asset_map a ON a.period_label=m.period_label
JOIN bronze.raw_indicator_observation r ON r.ingestion_batch_id=@batch_id AND r.source_record_key=m.period_label;

MERGE [dq].[rule] AS target
USING (VALUES
 (N'ANPG_CORE_MONTH_COMPLETENESS',N'ANPG core monthly fields complete','COMPLETENESS','CRITICAL'),
 (N'ANPG_MONTH_UNIQUENESS',N'ANPG reference month unique','UNIQUENESS','CRITICAL'),
 (N'ANPG_OIL_DAILY_MONTHLY_RECONCILIATION',N'Oil total reconciles to BOPD and calendar days','CONSISTENCY','HIGH'),
 (N'ANPG_GAS_DAILY_MONTHLY_RECONCILIATION',N'Gas total reconciles to MMSCFD and calendar days','CONSISTENCY','HIGH'),
 (N'ANPG_GAS_ALLOCATION_RECONCILIATION',N'Published gas allocations do not exceed total gas','CONSISTENCY','MEDIUM')
) source(rule_code,rule_name,quality_dimension,default_severity)
ON target.rule_code=source.rule_code
WHEN NOT MATCHED THEN INSERT(rule_code,rule_name,quality_dimension,default_severity)
VALUES(source.rule_code,source.rule_name,source.quality_dimension,source.default_severity);

INSERT dq.rule_version(rule_id,version_number,rule_expression,parameter_json,effective_from,is_current)
SELECT r.rule_id,1,N'Validate 18 unique contiguous months, positive core metrics, daily/monthly reconciliation and gas allocation consistency.',
       N'{"firstPeriod":"2025-01","lastPeriod":"2026-06","expectedMonths":18,"acceptedSourceExceptions":["2025-08","2025-09"]}',@now,1
FROM [dq].[rule] r WHERE r.rule_code LIKE N'ANPG_%'
AND NOT EXISTS(SELECT 1 FROM dq.rule_version v WHERE v.rule_id=r.rule_id);

INSERT dq.execution(pipeline_run_id,ingestion_batch_id,execution_status,started_at,ended_at)
VALUES(@run_id,@batch_id,'WARNING',@now,@now); SET @dq_id=SCOPE_IDENTITY();

INSERT dq.result(dq_execution_id,rule_version_id,observation_id,result_status,observed_value,result_message)
SELECT @dq_id,rv.rule_version_id,o.observation_id,
       CASE WHEN dq_rule.rule_code=N'ANPG_GAS_ALLOCATION_RECONCILIATION' AND o.reference_period_label IN(N'2025-08',N'2025-09')
                 AND ds.series_code=N'ANPG_GAS_ACTUAL_MMSCFD' THEN 'WARN' ELSE 'PASS' END,
       o.reference_period_label,
       CASE WHEN dq_rule.rule_code=N'ANPG_GAS_ALLOCATION_RECONCILIATION' AND o.reference_period_label IN(N'2025-08',N'2025-09')
                 AND ds.series_code=N'ANPG_GAS_ACTUAL_MMSCFD'
            THEN N'Official ANPG allocation components exceed the published gas total; source values preserved and residual suppressed.' ELSE N'Rule passed.' END
FROM silver.observation o
JOIN silver.indicator_series ds ON ds.series_id=o.series_id
CROSS JOIN [dq].[rule] dq_rule
JOIN dq.rule_version rv ON rv.rule_id=dq_rule.rule_id AND rv.is_current=1
WHERE o.ingestion_batch_id=@batch_id AND dq_rule.rule_code LIKE N'ANPG_%';

INSERT dq.exception(dq_result_id,exception_status,justification,requested_by,requested_at,resolved_by,resolved_at)
SELECT result.dq_result_id,'APPROVED',
       N'Published-source internal reconciliation discrepancy; no LAZA correction or imputation applied. Approved with explicit quality warning and no residual-allocation calculation.',
       SUSER_SNAME(),@now,SUSER_SNAME(),@now
FROM dq.result result
JOIN dq.rule_version rv ON rv.rule_version_id=result.rule_version_id
JOIN [dq].[rule] dq_rule ON dq_rule.rule_id=rv.rule_id
WHERE result.dq_execution_id=@dq_id AND result.result_status='WARN' AND dq_rule.rule_code=N'ANPG_GAS_ALLOCATION_RECONCILIATION';

INSERT dq.indicator_score(dq_execution_id,observation_id,quality_score,passed_rules,warning_rules,failed_rules)
SELECT @dq_id,o.observation_id,
       CASE WHEN o.reference_period_label IN(N'2025-08',N'2025-09') AND s.series_code=N'ANPG_GAS_ACTUAL_MMSCFD' THEN 95 ELSE 100 END,
       CASE WHEN o.reference_period_label IN(N'2025-08',N'2025-09') AND s.series_code=N'ANPG_GAS_ACTUAL_MMSCFD' THEN 4 ELSE 5 END,
       CASE WHEN o.reference_period_label IN(N'2025-08',N'2025-09') AND s.series_code=N'ANPG_GAS_ACTUAL_MMSCFD' THEN 1 ELSE 0 END,0
FROM silver.observation o JOIN silver.indicator_series s ON s.series_id=o.series_id WHERE o.ingestion_batch_id=@batch_id;

INSERT dq.approval(observation_id,decision,decision_scope,decision_notes,decided_by)
SELECT observation_id,'APPROVE','OFFICIAL',N'Official ANPG monthly publication validated; documented source exceptions retained.',SUSER_SNAME()
FROM silver.observation WHERE ingestion_batch_id=@batch_id;
UPDATE silver.observation SET publication_status='PUBLISHED',is_official=1 WHERE ingestion_batch_id=@batch_id;

INSERT gold.dim_source(silver_source_id,source_code,source_name,organization_name,homepage_url)
SELECT source_id,source_code,source_name,organization_name,homepage_url FROM reference.source s WHERE source_id=@source_id
AND NOT EXISTS(SELECT 1 FROM gold.dim_source g WHERE g.silver_source_id=s.source_id);
INSERT gold.dim_unit(silver_unit_id,unit_code,unit_name,symbol)
SELECT u.unit_id,u.unit_code,u.unit_name,u.symbol FROM reference.unit u
WHERE u.unit_code IN(N'BARREL',N'BOPD',N'MMCF',N'MMSCFD',N'BOE',N'BOEPD')
AND NOT EXISTS(SELECT 1 FROM gold.dim_unit g WHERE g.silver_unit_id=u.unit_id);
INSERT gold.dim_series(silver_series_id,series_code,frequency_code,frequency_name,methodology_version)
SELECT s.series_id,s.series_code,f.frequency_code,f.frequency_name,s.methodology_version
FROM silver.indicator_series s JOIN reference.frequency f ON f.frequency_id=s.frequency_id
WHERE s.series_code LIKE N'ANPG_%' AND NOT EXISTS(SELECT 1 FROM gold.dim_series g WHERE g.silver_series_id=s.series_id);
;WITH dates AS
(
 SELECT CONVERT(date,period_label+N'-01') d FROM @monthly
 UNION SELECT EOMONTH(CONVERT(date,period_label+N'-01')) FROM @monthly
)
INSERT gold.dim_date(date_key,full_date,calendar_year,calendar_quarter,calendar_month,month_name)
SELECT CONVERT(int,CONVERT(char(8),d,112)),d,YEAR(d),DATEPART(quarter,d),MONTH(d),DATENAME(month,d)
FROM dates x WHERE NOT EXISTS(SELECT 1 FROM gold.dim_date gd WHERE gd.full_date=x.d);

INSERT gold.fact_indicator_observation(silver_observation_id,indicator_key,series_key,source_key,unit_key,geography_key,period_start_date_key,period_end_date_key,reference_period_label,numeric_value,display_value,comparison_label,comparison_display_value,trend_direction,quality_status,quality_score,publication_status,is_official,source_asset_id)
SELECT o.observation_id,gi.indicator_key,gs.series_key,gsrc.source_key,gu.unit_key,gg.geography_key,ds.date_key,de.date_key,o.reference_period_label,
       o.numeric_value,o.display_value,o.comparison_label,o.comparison_display_value,o.trend_direction,o.quality_status,score.quality_score,'PUBLISHED',1,o.source_asset_id
FROM silver.observation o
JOIN silver.indicator_series s ON s.series_id=o.series_id
JOIN gold.dim_indicator gi ON gi.silver_indicator_id=s.indicator_id
JOIN gold.dim_series gs ON gs.silver_series_id=s.series_id
JOIN gold.dim_source gsrc ON gsrc.silver_source_id=s.source_id
JOIN gold.dim_unit gu ON gu.silver_unit_id=s.unit_id
JOIN gold.dim_geography gg ON gg.silver_geography_id=s.geography_id
JOIN gold.dim_date ds ON ds.full_date=o.reference_period_start
JOIN gold.dim_date de ON de.full_date=o.reference_period_end
JOIN dq.indicator_score score ON score.observation_id=o.observation_id AND score.dq_execution_id=@dq_id
WHERE o.ingestion_batch_id=@batch_id;

UPDATE control.ingestion_batch SET batch_status='VALIDATED',accepted_record_count=18,rejected_record_count=0 WHERE ingestion_batch_id=@batch_id;
UPDATE control.pipeline_run SET run_status='SUCCEEDED',ended_at=@now,rows_read=18,rows_written=(SELECT COUNT(*) FROM @values),rows_rejected=0 WHERE pipeline_run_id=@run_id;
INSERT audit.pipeline_event(pipeline_run_id,ingestion_batch_id,event_type,event_level,event_message,event_context)
VALUES(@run_id,@batch_id,'ANPG_OIL_GAS_INITIAL_LOAD','WARN',N'18 official ANPG monthly publications and 252 metric observations published.',
       N'{"periodStart":"2025-01","periodEnd":"2026-06","sourceMonths":18,"goldObservations":252,"acceptedSourceExceptions":["2025-08","2025-09"],"missingTextAlngDetail":["2025-01","2025-02"]}');
COMMIT;
GO

CREATE OR ALTER VIEW api.vw_anpg_oil_gas_monthly
AS
WITH monthly AS
(
    SELECT f.reference_period_label AS period,
           MAX(d.full_date) AS period_start,
           MAX(o.publication_date) AS publication_date,
           MAX(asset.asset_location) AS source_url,
           MAX(CASE WHEN series.series_code=N'ANPG_OIL_TOTAL_BARRELS' THEN f.numeric_value END) AS oil_total_barrels,
           MAX(CASE WHEN series.series_code=N'ANPG_OIL_ACTUAL_BOPD' THEN f.numeric_value END) AS oil_actual_bopd,
           MAX(CASE WHEN series.series_code=N'ANPG_OIL_FORECAST_BOPD' THEN f.numeric_value END) AS oil_forecast_bopd,
           MAX(CASE WHEN series.series_code=N'ANPG_GAS_TOTAL_MMCF' THEN f.numeric_value END) AS gas_total_mmcf,
           MAX(CASE WHEN series.series_code=N'ANPG_GAS_ACTUAL_MMSCFD' THEN f.numeric_value END) AS gas_actual_mmscfd,
           MAX(CASE WHEN series.series_code=N'ANPG_GAS_REINJECTED_MMSCFD' THEN f.numeric_value END) AS gas_reinjected_mmscfd,
           MAX(CASE WHEN series.series_code=N'ANPG_GAS_TO_ALNG_MMSCFD' THEN f.numeric_value END) AS gas_to_alng_mmscfd,
           MAX(CASE WHEN series.series_code=N'ANPG_GAS_TO_POWER_MMSCFD' THEN f.numeric_value END) AS gas_to_power_mmscfd,
           MAX(CASE WHEN series.series_code=N'ANPG_ALNG_ACTUAL_BOE' THEN f.numeric_value END) AS alng_actual_boe,
           MAX(CASE WHEN series.series_code=N'ANPG_ALNG_FORECAST_BOE' THEN f.numeric_value END) AS alng_forecast_boe,
           MAX(CASE WHEN series.series_code=N'ANPG_ALNG_ACTUAL_BOEPD' THEN f.numeric_value END) AS alng_actual_boepd,
           MAX(CASE WHEN series.series_code=N'ANPG_ALNG_LNG_BOEPD' THEN f.numeric_value END) AS alng_lng_boepd,
           MAX(CASE WHEN series.series_code=N'ANPG_ALNG_PROPANE_BOEPD' THEN f.numeric_value END) AS alng_propane_boepd,
           MAX(CASE WHEN series.series_code=N'ANPG_ALNG_BUTANE_BOEPD' THEN f.numeric_value END) AS alng_butane_boepd,
           MAX(CASE WHEN series.series_code=N'ANPG_ALNG_CONDENSATE_BOEPD' THEN f.numeric_value END) AS alng_condensate_boepd,
           MIN(f.quality_score) AS quality_score,
           CONVERT(bit,MAX(CASE WHEN exception.dq_exception_id IS NOT NULL THEN 1 ELSE 0 END)) AS has_accepted_exception
    FROM gold.fact_indicator_observation f
    JOIN gold.dim_indicator indicator ON indicator.indicator_key=f.indicator_key
    JOIN gold.dim_series series ON series.series_key=f.series_key
    JOIN gold.dim_date d ON d.date_key=f.period_start_date_key
    JOIN silver.observation o ON o.observation_id=f.silver_observation_id
    JOIN bronze.source_asset asset ON asset.source_asset_id=f.source_asset_id
    LEFT JOIN dq.result result ON result.observation_id=o.observation_id AND result.result_status='WARN'
    LEFT JOIN dq.exception exception ON exception.dq_result_id=result.dq_result_id AND exception.exception_status='APPROVED'
    WHERE series.series_code LIKE N'ANPG_%' AND f.publication_status='PUBLISHED' AND f.is_official=1
    GROUP BY f.reference_period_label
), movement AS
(
    SELECT monthly.*,LAG(oil_actual_bopd) OVER(ORDER BY period_start) AS prior_oil_actual_bopd
    FROM monthly
)
SELECT period,CONVERT(char(10),period_start,23) AS period_start,CONVERT(char(10),publication_date,23) AS publication_date,source_url,
       CONVERT(float,oil_total_barrels) AS oil_total_barrels,CONVERT(float,oil_actual_bopd) AS oil_actual_bopd,CONVERT(float,oil_forecast_bopd) AS oil_forecast_bopd,
       CONVERT(float,(oil_actual_bopd/oil_forecast_bopd-1)*100) AS oil_variance_pct,
       CONVERT(float,CASE WHEN prior_oil_actual_bopd IS NULL THEN NULL ELSE (oil_actual_bopd/prior_oil_actual_bopd-1)*100 END) AS oil_monthly_change_pct,
       CONVERT(float,gas_total_mmcf) AS gas_total_mmcf,CONVERT(float,gas_actual_mmscfd) AS gas_actual_mmscfd,
       CONVERT(float,gas_reinjected_mmscfd) AS gas_reinjected_mmscfd,CONVERT(float,gas_to_alng_mmscfd) AS gas_to_alng_mmscfd,
       CONVERT(float,gas_to_power_mmscfd) AS gas_to_power_mmscfd,
       CONVERT(float,CASE WHEN gas_reinjected_mmscfd+gas_to_alng_mmscfd+gas_to_power_mmscfd<=gas_actual_mmscfd
                          THEN gas_actual_mmscfd-gas_reinjected_mmscfd-gas_to_alng_mmscfd-gas_to_power_mmscfd END) AS gas_other_mmscfd,
       CONVERT(float,alng_actual_boe) AS alng_actual_boe,CONVERT(float,alng_forecast_boe) AS alng_forecast_boe,
       CONVERT(float,alng_actual_boepd) AS alng_actual_boepd,CONVERT(float,alng_lng_boepd) AS alng_lng_boepd,
       CONVERT(float,alng_propane_boepd) AS alng_propane_boepd,CONVERT(float,alng_butane_boepd) AS alng_butane_boepd,
       CONVERT(float,alng_condensate_boepd) AS alng_condensate_boepd,quality_score,has_accepted_exception
FROM movement;
GO

SELECT
 (SELECT COUNT(*) FROM bronze.source_asset a JOIN control.ingestion_batch b ON b.ingestion_batch_id=a.ingestion_batch_id WHERE b.batch_code=N'ANPG_OIL_GAS_202501_202606') AS bronze_assets,
 (SELECT COUNT(*) FROM silver.observation o JOIN silver.indicator_series s ON s.series_id=o.series_id WHERE s.series_code LIKE N'ANPG_%') AS silver_observations,
 (SELECT COUNT(*) FROM gold.fact_indicator_observation f JOIN gold.dim_series s ON s.series_key=f.series_key WHERE s.series_code LIKE N'ANPG_%') AS gold_observations,
 (SELECT COUNT(*) FROM api.vw_anpg_oil_gas_monthly) AS api_months;
GO
