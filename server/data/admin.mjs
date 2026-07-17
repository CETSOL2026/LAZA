import { runJsonQuery } from '../lib/sqlClient.mjs';

export async function readAdminPipelineSummary() {
  const rows = await runJsonQuery(`
SET NOCOUNT ON;
SELECT
  (SELECT COUNT_BIG(*) FROM control.pipeline_definition WHERE is_active=1) AS activePipelines,
  (SELECT COUNT_BIG(*) FROM control.pipeline_run) AS totalRuns,
  (SELECT COUNT_BIG(*) FROM control.pipeline_run WHERE run_status='SUCCEEDED') AS successfulRuns,
  (SELECT COUNT_BIG(*) FROM control.pipeline_run WHERE run_status IN ('FAILED','ERROR')) AS failedRuns,
  (SELECT COUNT_BIG(*) FROM control.pipeline_run WHERE run_status IN ('RUNNING','STARTED')) AS runningRuns,
  CAST(100.0 * (SELECT COUNT_BIG(*) FROM control.pipeline_run WHERE run_status='SUCCEEDED') /
       NULLIF((SELECT COUNT_BIG(*) FROM control.pipeline_run),0) AS decimal(5,2)) AS successRatePct,
  (SELECT COALESCE(SUM(rows_read),0) FROM control.pipeline_run) AS totalRowsRead,
  (SELECT COALESCE(SUM(rows_written),0) FROM control.pipeline_run) AS totalRowsWritten,
  (SELECT COALESCE(SUM(rows_rejected),0) FROM control.pipeline_run) AS totalRowsRejected,
  (SELECT MAX(started_at) FROM control.pipeline_run) AS lastRunAt,
  (SELECT MAX(ended_at) FROM control.pipeline_run) AS lastCompletedAt
FOR JSON PATH;
`);
  return rows[0] ?? {};
}

export async function readAdminPipelines() {
  return runJsonQuery(`
SET NOCOUNT ON;
SELECT p.pipeline_id AS pipelineId,
       p.pipeline_code AS pipelineCode,
       p.pipeline_name AS pipelineName,
       p.source_system AS sourceSystem,
       CONVERT(bit,p.is_active) AS isActive,
       r.pipeline_run_id AS latestRunId,
       r.run_status AS latestStatus,
       r.trigger_type AS triggerType,
       r.started_at AS startedAt,
       r.ended_at AS endedAt,
       CASE WHEN r.started_at IS NULL THEN NULL
            ELSE DATEDIFF_BIG(millisecond,r.started_at,COALESCE(r.ended_at,SYSUTCDATETIME())) END AS durationMs,
       COALESCE(r.rows_read,0) AS rowsRead,
       COALESCE(r.rows_written,0) AS rowsWritten,
       COALESCE(r.rows_rejected,0) AS rowsRejected,
       r.error_message AS errorMessage,
       r.initiated_by AS initiatedBy,
       COALESCE(batchInfo.batchCount,0) AS batchCount,
       COALESCE(dqInfo.passCount,0) AS dqPassCount,
       COALESCE(dqInfo.warningCount,0) AS dqWarningCount,
       COALESCE(dqInfo.failCount,0) AS dqFailCount
FROM control.pipeline_definition p
OUTER APPLY (
  SELECT TOP (1) pr.*
  FROM control.pipeline_run pr
  WHERE pr.pipeline_id=p.pipeline_id
  ORDER BY pr.started_at DESC,pr.pipeline_run_id DESC
) r
OUTER APPLY (
  SELECT COUNT_BIG(*) AS batchCount
  FROM control.ingestion_batch b
  WHERE b.pipeline_run_id=r.pipeline_run_id
) batchInfo
OUTER APPLY (
  SELECT SUM(CASE WHEN dr.result_status='PASS' THEN 1 ELSE 0 END) AS passCount,
         SUM(CASE WHEN dr.result_status='WARN' THEN 1 ELSE 0 END) AS warningCount,
         SUM(CASE WHEN dr.result_status NOT IN ('PASS','WARN') THEN 1 ELSE 0 END) AS failCount
  FROM dq.execution de
  JOIN dq.result dr ON dr.dq_execution_id=de.dq_execution_id
  WHERE de.pipeline_run_id=r.pipeline_run_id
) dqInfo
ORDER BY p.pipeline_code
FOR JSON PATH;
`);
}

export async function readAdminPipelineDetail(pipelineId) {
  const [pipelineRows,runs,batches,dqResults,events,assets] = await Promise.all([
    runJsonQuery(`SET NOCOUNT ON; SELECT pipeline_id AS pipelineId,pipeline_code AS pipelineCode,pipeline_name AS pipelineName,source_system AS sourceSystem,CONVERT(bit,is_active) AS isActive,created_at AS createdAt FROM control.pipeline_definition WHERE pipeline_id=${pipelineId} FOR JSON PATH;`),
    runJsonQuery(`SET NOCOUNT ON; SELECT TOP (25) pipeline_run_id AS runId,run_correlation_id AS correlationId,run_status AS status,trigger_type AS triggerType,started_at AS startedAt,ended_at AS endedAt,CASE WHEN started_at IS NULL THEN NULL ELSE DATEDIFF_BIG(millisecond,started_at,COALESCE(ended_at,SYSUTCDATETIME())) END AS durationMs,rows_read AS rowsRead,rows_written AS rowsWritten,rows_rejected AS rowsRejected,error_message AS errorMessage,initiated_by AS initiatedBy FROM control.pipeline_run WHERE pipeline_id=${pipelineId} ORDER BY started_at DESC,pipeline_run_id DESC FOR JSON PATH;`),
    runJsonQuery(`SET NOCOUNT ON; SELECT TOP (50) b.ingestion_batch_id AS batchId,b.batch_code AS batchCode,b.data_classification AS dataClassification,b.batch_status AS status,b.acquired_at AS acquiredAt,b.loaded_at AS loadedAt,b.source_record_count AS sourceRecordCount,b.accepted_record_count AS acceptedRecordCount,b.rejected_record_count AS rejectedRecordCount FROM control.ingestion_batch b JOIN control.pipeline_run r ON r.pipeline_run_id=b.pipeline_run_id WHERE r.pipeline_id=${pipelineId} ORDER BY b.acquired_at DESC,b.ingestion_batch_id DESC FOR JSON PATH;`),
    runJsonQuery(`SET NOCOUNT ON; SELECT dr.result_status AS status,COUNT_BIG(*) AS total FROM dq.execution de JOIN control.pipeline_run r ON r.pipeline_run_id=de.pipeline_run_id JOIN dq.result dr ON dr.dq_execution_id=de.dq_execution_id WHERE r.pipeline_id=${pipelineId} GROUP BY dr.result_status ORDER BY dr.result_status FOR JSON PATH;`),
    runJsonQuery(`SET NOCOUNT ON; SELECT TOP (50) e.pipeline_event_id AS eventId,e.event_type AS eventType,e.event_level AS eventLevel,e.event_message AS message,e.occurred_at AS occurredAt FROM audit.pipeline_event e JOIN control.pipeline_run r ON r.pipeline_run_id=e.pipeline_run_id WHERE r.pipeline_id=${pipelineId} ORDER BY e.occurred_at DESC,e.pipeline_event_id DESC FOR JSON PATH;`),
    runJsonQuery(`SET NOCOUNT ON; SELECT TOP (50) a.source_asset_id AS assetId,a.asset_name AS assetName,a.asset_type AS assetType,a.publication_date AS publicationDate,a.content_size_bytes AS registeredSizeBytes,m.mirror_size_bytes AS mirrorSizeBytes,m.mirror_status AS mirrorStatus,CONVERT(bit,m.hash_matches_registered) AS hashMatchesRegistered,m.last_verified_at AS lastVerifiedAt FROM bronze.source_asset a JOIN control.ingestion_batch b ON b.ingestion_batch_id=a.ingestion_batch_id JOIN control.pipeline_run r ON r.pipeline_run_id=b.pipeline_run_id LEFT JOIN control.source_asset_mirror m ON m.source_asset_id=a.source_asset_id WHERE r.pipeline_id=${pipelineId} ORDER BY a.publication_date DESC,a.source_asset_id DESC FOR JSON PATH;`),
  ]);
  if (!pipelineRows[0]) return null;
  return { pipeline: pipelineRows[0], runs, batches, dqResults, events, assets };
}

export async function readAdminDataQualitySummary() {
  const summary = await runJsonQuery(`
SET NOCOUNT ON;
SELECT (SELECT COUNT_BIG(*) FROM dq.execution) AS totalExecutions,
       (SELECT COUNT_BIG(*) FROM dq.execution WHERE execution_status='PASSED') AS passedExecutions,
       (SELECT COUNT_BIG(*) FROM dq.execution WHERE execution_status='WARNING') AS warningExecutions,
       (SELECT COUNT_BIG(*) FROM dq.result WHERE result_status='PASS') AS passedResults,
       (SELECT COUNT_BIG(*) FROM dq.result WHERE result_status='WARN') AS warningResults,
       (SELECT COUNT_BIG(*) FROM dq.result WHERE result_status NOT IN ('PASS','WARN')) AS failedResults,
       (SELECT CAST(AVG(CAST(quality_score AS decimal(10,2))) AS decimal(10,2)) FROM dq.indicator_score) AS averageQualityScore,
       (SELECT COUNT_BIG(*) FROM dq.exception WHERE exception_status='APPROVED') AS approvedExceptions,
       (SELECT COUNT_BIG(*) FROM dq.exception WHERE exception_status NOT IN ('APPROVED','RESOLVED','REJECTED')) AS openExceptions,
       (SELECT COUNT_BIG(*) FROM dq.approval WHERE decision='APPROVE') AS approvals
FOR JSON PATH;
`);
  return summary[0] ?? {};
}

export async function readAdminAssetSummary() {
  const [summary,statuses] = await Promise.all([
    runJsonQuery(`SET NOCOUNT ON; SELECT COUNT_BIG(*) AS totalAssets,COALESCE(SUM(mirror_size_bytes),0) AS totalMirrorBytes,SUM(CASE WHEN hash_matches_registered=1 THEN 1 ELSE 0 END) AS hashVerifiedAssets,SUM(CASE WHEN hash_matches_registered=0 THEN 1 ELSE 0 END) AS hashMismatchAssets,MAX(last_verified_at) AS lastVerifiedAt FROM control.source_asset_mirror FOR JSON PATH;`),
    runJsonQuery(`SET NOCOUNT ON; SELECT mirror_status AS status,COUNT_BIG(*) AS total,COALESCE(SUM(mirror_size_bytes),0) AS totalBytes FROM control.source_asset_mirror GROUP BY mirror_status ORDER BY mirror_status FOR JSON PATH;`),
  ]);
  return { ...(summary[0] ?? {}), statuses };
}

export async function readAdminDataLayersSummary() {
  const [summary,reconciliation] = await Promise.all([
    runJsonQuery(`
SET NOCOUNT ON;
SELECT
  (SELECT COUNT_BIG(*) FROM bronze.source_asset) AS bronzeAssets,
  (SELECT COUNT_BIG(*) FROM control.source_asset_mirror) AS bronzeMirroredAssets,
  (SELECT COUNT_BIG(*) FROM bronze.raw_indicator_observation) AS bronzeRawRecords,
  (SELECT COUNT_BIG(*) FROM bronze.raw_indicator_observation WHERE bronze_status='ACCEPTED') AS bronzeAcceptedRecords,
  (SELECT COUNT_BIG(*) FROM bronze.raw_indicator_observation WHERE bronze_status<>'ACCEPTED') AS bronzeRejectedRecords,
  (SELECT MAX(ingested_at) FROM bronze.raw_indicator_observation) AS bronzeFreshnessAt,
  (SELECT COUNT_BIG(*) FROM silver.indicator) AS silverIndicators,
  (SELECT COUNT_BIG(*) FROM silver.indicator_series WHERE is_current=1) AS silverSeries,
  (SELECT COUNT_BIG(*) FROM silver.observation WHERE is_current=1) AS silverObservations,
  (SELECT COUNT_BIG(*) FROM silver.observation WHERE is_current=1 AND quality_status='PASSED') AS silverPassedObservations,
  (SELECT COUNT_BIG(*) FROM silver.observation WHERE is_current=1 AND quality_status='WARNING') AS silverWarningObservations,
  (SELECT COUNT_BIG(*) FROM silver.observation WHERE is_current=1 AND raw_observation_id IS NOT NULL) AS silverLineageRecords,
  (SELECT MAX(created_at) FROM silver.observation) AS silverFreshnessAt,
  (SELECT COUNT_BIG(*) FROM gold.dim_indicator WHERE is_active=1) AS goldIndicators,
  (SELECT COUNT_BIG(*) FROM gold.dim_series) AS goldSeries,
  (SELECT COUNT_BIG(*) FROM gold.fact_indicator_observation) AS goldFacts,
  (SELECT COUNT_BIG(*) FROM gold.fact_indicator_observation WHERE publication_status='PUBLISHED' AND is_official=1) AS goldPublishedFacts,
  (SELECT COUNT_BIG(*) FROM gold.fact_indicator_observation WHERE publication_status='DEMONSTRATION' OR is_official=0) AS goldDemonstrationFacts,
  (SELECT COUNT_BIG(*) FROM gold.fact_indicator_observation WHERE silver_observation_id IS NOT NULL AND source_asset_id IS NOT NULL) AS goldLineageRecords,
  (SELECT MAX(published_at) FROM gold.fact_indicator_observation) AS goldFreshnessAt,
  CAST(100.0*(SELECT COUNT_BIG(*) FROM silver.observation WHERE is_current=1)/NULLIF((SELECT COUNT_BIG(*) FROM bronze.raw_indicator_observation),0) AS decimal(7,2)) AS bronzeToSilverYieldPct,
  CAST(100.0*(SELECT COUNT_BIG(*) FROM gold.fact_indicator_observation)/NULLIF((SELECT COUNT_BIG(*) FROM silver.observation WHERE is_current=1),0) AS decimal(7,2)) AS silverToGoldCoveragePct,
  CAST(100.0*(SELECT COUNT_BIG(*) FROM silver.observation WHERE is_current=1 AND raw_observation_id IS NOT NULL)/NULLIF((SELECT COUNT_BIG(*) FROM silver.observation WHERE is_current=1),0) AS decimal(7,2)) AS silverLineageCoveragePct,
  CAST(100.0*(SELECT COUNT_BIG(*) FROM gold.fact_indicator_observation WHERE silver_observation_id IS NOT NULL AND source_asset_id IS NOT NULL)/NULLIF((SELECT COUNT_BIG(*) FROM gold.fact_indicator_observation),0) AS decimal(7,2)) AS goldLineageCoveragePct
FOR JSON PATH;
`),
    runJsonQuery(`
SET NOCOUNT ON;
SELECT p.pipeline_id AS pipelineId,p.pipeline_code AS pipelineCode,p.pipeline_name AS pipelineName,p.source_system AS sourceSystem,
       COALESCE(bz.assetCount,0) AS bronzeAssets,COALESCE(bz.rawCount,0) AS bronzeRecords,
       COALESCE(sv.observationCount,0) AS silverObservations,COALESCE(gd.factCount,0) AS goldFacts,
       COALESCE(sv.warningCount,0) AS warnings,COALESCE(gd.publishedCount,0) AS publishedFacts,
       COALESCE(gd.demoCount,0) AS demonstrationFacts,
       CASE WHEN COALESCE(sv.observationCount,0)=0 THEN NULL ELSE CAST(100.0*COALESCE(gd.factCount,0)/sv.observationCount AS decimal(7,2)) END AS silverToGoldPct
FROM control.pipeline_definition p
OUTER APPLY (SELECT COUNT(DISTINCT a.source_asset_id) assetCount,COUNT(DISTINCT ro.raw_observation_id) rawCount FROM control.pipeline_run r JOIN control.ingestion_batch b ON b.pipeline_run_id=r.pipeline_run_id LEFT JOIN bronze.source_asset a ON a.ingestion_batch_id=b.ingestion_batch_id LEFT JOIN bronze.raw_indicator_observation ro ON ro.ingestion_batch_id=b.ingestion_batch_id WHERE r.pipeline_id=p.pipeline_id) bz
OUTER APPLY (SELECT COUNT_BIG(*) observationCount,SUM(CASE WHEN o.quality_status='WARNING' THEN 1 ELSE 0 END) warningCount FROM silver.observation o JOIN control.ingestion_batch b ON b.ingestion_batch_id=o.ingestion_batch_id JOIN control.pipeline_run r ON r.pipeline_run_id=b.pipeline_run_id WHERE r.pipeline_id=p.pipeline_id AND o.is_current=1) sv
OUTER APPLY (SELECT COUNT_BIG(*) factCount,SUM(CASE WHEN f.publication_status='PUBLISHED' AND f.is_official=1 THEN 1 ELSE 0 END) publishedCount,SUM(CASE WHEN f.publication_status='DEMONSTRATION' OR f.is_official=0 THEN 1 ELSE 0 END) demoCount FROM gold.fact_indicator_observation f JOIN silver.observation o ON o.observation_id=f.silver_observation_id JOIN control.ingestion_batch b ON b.ingestion_batch_id=o.ingestion_batch_id JOIN control.pipeline_run r ON r.pipeline_run_id=b.pipeline_run_id WHERE r.pipeline_id=p.pipeline_id) gd
WHERE p.is_active=1
ORDER BY p.pipeline_code
FOR JSON PATH;
`),
  ]);
  return { ...(summary[0] ?? {}), reconciliation };
}

export async function readAdminBronzeLayer() {
  return runJsonQuery(`
SET NOCOUNT ON;
SELECT a.source_asset_id AS assetId,a.asset_name AS assetName,a.asset_type AS assetType,
       src.source_name AS sourceName,src.organization_name AS organizationName,
       p.pipeline_code AS pipelineCode,b.batch_code AS batchCode,b.batch_status AS batchStatus,
       a.publication_date AS publicationDate,a.acquired_at AS acquiredAt,a.content_size_bytes AS sourceSizeBytes,
       CONVERT(bit,a.is_official) AS isOfficial,COUNT(ro.raw_observation_id) AS rawRecords,
       SUM(CASE WHEN ro.bronze_status='ACCEPTED' THEN 1 ELSE 0 END) AS acceptedRecords,
       SUM(CASE WHEN ro.bronze_status<>'ACCEPTED' THEN 1 ELSE 0 END) AS rejectedRecords,
       m.mirror_status AS mirrorStatus,m.mirror_size_bytes AS mirrorSizeBytes,
       CONVERT(bit,m.hash_matches_registered) AS hashMatchesRegistered,m.last_verified_at AS lastVerifiedAt
FROM bronze.source_asset a
JOIN reference.source src ON src.source_id=a.source_id
JOIN control.ingestion_batch b ON b.ingestion_batch_id=a.ingestion_batch_id
JOIN control.pipeline_run r ON r.pipeline_run_id=b.pipeline_run_id
JOIN control.pipeline_definition p ON p.pipeline_id=r.pipeline_id
LEFT JOIN bronze.raw_indicator_observation ro ON ro.source_asset_id=a.source_asset_id
LEFT JOIN control.source_asset_mirror m ON m.source_asset_id=a.source_asset_id
GROUP BY a.source_asset_id,a.asset_name,a.asset_type,src.source_name,src.organization_name,p.pipeline_code,b.batch_code,b.batch_status,a.publication_date,a.acquired_at,a.content_size_bytes,a.is_official,m.mirror_status,m.mirror_size_bytes,m.hash_matches_registered,m.last_verified_at
ORDER BY a.acquired_at DESC,a.source_asset_id DESC
FOR JSON PATH;
`);
}

export async function readAdminSilverLayer() {
  return runJsonQuery(`
SET NOCOUNT ON;
SELECT i.indicator_id AS indicatorId,i.indicator_code AS indicatorCode,i.indicator_name AS indicatorName,
       i.domain_name AS domainName,i.accountable_owner AS accountableOwner,CONVERT(bit,i.is_active) AS isActive,
       COUNT(DISTINCT s.series_id) AS seriesCount,COUNT(o.observation_id) AS observationCount,
       COUNT(DISTINCT s.source_id) AS sourceCount,
       SUM(CASE WHEN o.quality_status='PASSED' THEN 1 ELSE 0 END) AS passedCount,
       SUM(CASE WHEN o.quality_status='WARNING' THEN 1 ELSE 0 END) AS warningCount,
       SUM(CASE WHEN o.is_official=1 THEN 1 ELSE 0 END) AS officialCount,
       MIN(o.reference_period_start) AS firstPeriod,MAX(o.reference_period_end) AS lastPeriod,MAX(o.created_at) AS refreshedAt
FROM silver.indicator i
LEFT JOIN silver.indicator_series s ON s.indicator_id=i.indicator_id AND s.is_current=1
LEFT JOIN silver.observation o ON o.series_id=s.series_id AND o.is_current=1
GROUP BY i.indicator_id,i.indicator_code,i.indicator_name,i.domain_name,i.accountable_owner,i.is_active
ORDER BY i.domain_name,i.indicator_name
FOR JSON PATH;
`);
}

export async function readAdminGoldLayer() {
  return runJsonQuery(`
SET NOCOUNT ON;
SELECT i.indicator_key AS indicatorKey,i.indicator_code AS indicatorCode,i.indicator_name AS indicatorName,i.domain_name AS domainName,
       CONVERT(bit,i.is_active) AS isActive,COUNT(DISTINCT f.series_key) AS seriesCount,COUNT(f.fact_observation_id) AS factCount,
       COUNT(DISTINCT f.source_key) AS sourceCount,
       SUM(CASE WHEN f.publication_status='PUBLISHED' AND f.is_official=1 THEN 1 ELSE 0 END) AS publishedCount,
       SUM(CASE WHEN f.publication_status='DEMONSTRATION' OR f.is_official=0 THEN 1 ELSE 0 END) AS demonstrationCount,
       CAST(AVG(f.quality_score) AS decimal(7,2)) AS averageQualityScore,
       MAX(f.reference_period_label) AS latestPeriod,MAX(f.published_at) AS publishedAt,
       MAX(sourceList.sources) AS sources
FROM gold.dim_indicator i
LEFT JOIN gold.fact_indicator_observation f ON f.indicator_key=i.indicator_key
OUTER APPLY (
  SELECT STRING_AGG(CONVERT(nvarchar(max),sourceNames.source_name),N', ') WITHIN GROUP (ORDER BY sourceNames.source_name) AS sources
  FROM (SELECT DISTINCT src.source_name FROM gold.fact_indicator_observation f2 JOIN gold.dim_source src ON src.source_key=f2.source_key WHERE f2.indicator_key=i.indicator_key) sourceNames
) sourceList
GROUP BY i.indicator_key,i.indicator_code,i.indicator_name,i.domain_name,i.is_active
ORDER BY i.domain_name,i.indicator_name
FOR JSON PATH;
`);
}
