[CmdletBinding()]
param(
    [string]$SqlInstance = '.\SQLEXPRESS',
    [string]$Database = 'LAZA_DATA_PLATFORM_DEV',
    [string]$ArchiveRoot = 'D:\LAZA_DATA\archive\official-source-assets'
)

$ErrorActionPreference = 'Stop'
$sqlcmd = 'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE'
$curl = 'C:\Windows\System32\curl.exe'

if (-not (Test-Path -LiteralPath $sqlcmd -PathType Leaf)) { throw "sqlcmd not found at $sqlcmd" }
if (-not (Test-Path -LiteralPath $curl -PathType Leaf)) { throw "curl not found at $curl" }

$archiveRootFull = [System.IO.Path]::GetFullPath($ArchiveRoot).TrimEnd('\')
[System.IO.Directory]::CreateDirectory($archiveRootFull) | Out-Null

$assetQuery = @"
SET NOCOUNT ON;
SELECT a.source_asset_id AS AssetId,
       p.pipeline_code AS PipelineCode,
       a.asset_name AS AssetName,
       a.asset_type AS AssetType,
       a.asset_location AS AssetLocation,
       CONVERT(varchar(64), a.content_hash, 2) AS RegisteredSha256,
       a.content_size_bytes AS RegisteredSizeBytes
FROM bronze.source_asset a
JOIN control.ingestion_batch b ON b.ingestion_batch_id = a.ingestion_batch_id
JOIN control.pipeline_run r ON r.pipeline_run_id = b.pipeline_run_id
JOIN control.pipeline_definition p ON p.pipeline_id = r.pipeline_id
WHERE a.is_official = 1
  AND b.data_classification = 'OFFICIAL'
  AND p.pipeline_code IN
  (N'INE_IPCN_TO_BRONZE',N'BNA_EXCHANGE_REFERENCE_MONTHLY',N'INE_GDP_QUARTERLY_YOY',N'INE_RGPH_POPULATION',
   N'BNA_OSD_BANKING_ASSETS',N'UGD_PUBLIC_DEBT_GDP',N'ANPG_OIL_GAS_MONTHLY',N'MINFIN_FISCAL_EXECUTION_QUARTERLY',
   N'BODIVA_SOVEREIGN_YIELD_CURVE',N'INE_GDP_OIL_NON_OIL_QUARTERLY')
ORDER BY a.source_asset_id
FOR JSON PATH;
"@

$jsonLines = & $sqlcmd -S $SqlInstance -E -C -b -d $Database -y 0 -Q $assetQuery
if ($LASTEXITCODE -ne 0) { throw 'Could not read the official source asset catalog.' }
$json = ($jsonLines | ForEach-Object { $_.Trim() } | Where-Object { $_ }) -join ''
$assets = @(foreach ($item in ($json | ConvertFrom-Json)) { $item })
$assets | ForEach-Object {
    $_.AssetType = $_.AssetType.ToUpperInvariant()
    $_.RegisteredSha256 = $_.RegisteredSha256.ToUpperInvariant()
}

if ($assets.Count -eq 0) { throw 'No official source assets were returned for archival.' }

$results = foreach ($asset in $assets) {
    if ($asset.AssetName -ne [System.IO.Path]::GetFileName($asset.AssetName)) {
        throw "Unsafe asset name for source asset $($asset.AssetId)."
    }

    $pipelineFolder = Join-Path $archiveRootFull $asset.PipelineCode
    [System.IO.Directory]::CreateDirectory($pipelineFolder) | Out-Null
    $targetPath = [System.IO.Path]::GetFullPath((Join-Path $pipelineFolder $asset.AssetName))
    if (-not $targetPath.StartsWith("$archiveRootFull\", [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Archive target escaped the governed root: $targetPath"
    }

    if (-not (Test-Path -LiteralPath $targetPath -PathType Leaf)) {
        $partialPath = "$targetPath.partial"
        try {
            if ($asset.AssetLocation -match '^https?://') {
                & $curl --fail --silent --show-error --location --retry 2 --connect-timeout 15 --max-time 90 --user-agent 'LAZA-Source-Archive/1.0' --output $partialPath $asset.AssetLocation
                if ($LASTEXITCODE -ne 0) { throw "Official source download failed with curl exit code $LASTEXITCODE." }
            }
            else {
                if (-not (Test-Path -LiteralPath $asset.AssetLocation -PathType Leaf)) {
                    throw "Registered local source does not exist: $($asset.AssetLocation)"
                }
                Copy-Item -LiteralPath $asset.AssetLocation -Destination $partialPath -Force
            }
            Move-Item -LiteralPath $partialPath -Destination $targetPath -Force
        }
        finally {
            if (Test-Path -LiteralPath $partialPath -PathType Leaf) {
                Remove-Item -LiteralPath $partialPath -Force
            }
        }
    }

    $file = Get-Item -LiteralPath $targetPath
    $actualSha256 = (Get-FileHash -LiteralPath $targetPath -Algorithm SHA256).Hash.ToUpperInvariant()
    $matchesRegistered = $actualSha256 -eq $asset.RegisteredSha256
    if (-not $matchesRegistered -and $asset.AssetType -ne 'HTML') {
        throw "Hash mismatch for non-HTML asset $($asset.AssetId): $($asset.AssetName)"
    }
    $status = if ($matchesRegistered) { 'VERIFIED' } else { 'PUBLISHER_UPDATED_HTML' }
    $escapedPath = $targetPath.Replace("'", "''")
    $mergeQuery = @"
SET NOCOUNT ON;
MERGE control.source_asset_mirror AS target
USING (SELECT CAST($($asset.AssetId) AS bigint) AS source_asset_id) AS source
ON target.source_asset_id = source.source_asset_id
WHEN MATCHED THEN UPDATE SET
    mirror_path = N'$escapedPath',
    mirror_size_bytes = $($file.Length),
    mirror_sha256 = CONVERT(binary(32), '$actualSha256', 2),
    hash_matches_registered = $(if ($matchesRegistered) { 1 } else { 0 }),
    mirror_status = '$status',
    last_verified_at = SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT
    (source_asset_id, mirror_path, mirror_size_bytes, mirror_sha256, hash_matches_registered, mirror_status)
VALUES
    ($($asset.AssetId), N'$escapedPath', $($file.Length), CONVERT(binary(32), '$actualSha256', 2), $(if ($matchesRegistered) { 1 } else { 0 }), '$status');
"@
    & $sqlcmd -S $SqlInstance -E -C -b -d $Database -Q $mergeQuery | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Could not register mirror for source asset $($asset.AssetId)." }

    [pscustomobject]@{
        AssetId = $asset.AssetId
        PipelineCode = $asset.PipelineCode
        AssetName = $asset.AssetName
        SizeBytes = $file.Length
        MirrorStatus = $status
        MirrorPath = $targetPath
    }
}

$results | Sort-Object AssetId | Format-Table AssetId, PipelineCode, AssetName, SizeBytes, MirrorStatus -AutoSize
Write-Host "Archived and registered $($results.Count) official source assets under $archiveRootFull."
