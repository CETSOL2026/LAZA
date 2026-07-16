[CmdletBinding()]
param(
    [ValidateSet('Discover', 'Run')]
    [string]$Mode = 'Run',
    [string]$ConfigPath = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Set-Location -LiteralPath $projectRoot

if ([string]::IsNullOrWhiteSpace($ConfigPath)) {
    $ConfigPath = Join-Path $projectRoot 'config\data-platform.local.json'
}

if (-not (Test-Path -LiteralPath $ConfigPath)) {
    throw "Configuration file not found: $ConfigPath"
}
$config = Get-Content -Raw -LiteralPath $ConfigPath | ConvertFrom-Json
$instance = [string]$config.sqlServer.instance
$database = [string]$config.sqlServer.database
$landingRoot = Join-Path ([string]$config.storage.landing) 'ine\inflation'
$archiveRoot = Join-Path ([string]$config.storage.archive) 'ine\inflation'
$rejectedRoot = Join-Path ([string]$config.storage.rejected) 'ine\inflation'
$manifestRoot = [string]$config.storage.manifests
$logRoot = [string]$config.storage.logs
$listTemplate = 'https://www.ine.gov.ao/publicacoes/Listagempublicacoes/{0}%2CIPCN'
$baseUri = [uri]'https://www.ine.gov.ao'
$monthNumbers = @{
    Janeiro = 1; Fevereiro = 2; 'Março' = 3; Marco = 3; Abril = 4; Maio = 5; Junho = 6
    Julho = 7; Agosto = 8; Setembro = 9; Outubro = 10; Novembro = 11; Dezembro = 12
}

foreach ($path in @($landingRoot, $archiveRoot, $rejectedRoot, $manifestRoot, $logRoot)) {
    New-Item -ItemType Directory -Force -Path $path | Out-Null
}

$runId = Get-Date -Format 'yyyyMMdd_HHmmss'
$logPath = Join-Path $logRoot "ipcn_incremental_$runId.log"
function Write-RunLog([string]$Level, [string]$Message) {
    $line = "{0:o} [{1}] {2}" -f (Get-Date), $Level, $Message
    Add-Content -LiteralPath $logPath -Value $line -Encoding utf8
    Write-Host $line
}
function ConvertTo-SqlLiteral([AllowNull()][string]$Value) {
    if ($null -eq $Value) { return 'NULL' }
    return "N'$($Value.Replace("'", "''"))'"
}
function Invoke-SqlScalar([string]$Query) {
    $output = & sqlcmd.exe -S $instance -E -C -b -d $database -h -1 -W -Q "SET NOCOUNT ON; $Query"
    if ($LASTEXITCODE -ne 0) { throw "sqlcmd scalar query failed: $output" }
    return ($output | Where-Object { $_.Trim() } | Select-Object -First 1).Trim()
}

Write-RunLog 'INFO' "Starting IPCN pipeline in $Mode mode."

$publications = [System.Collections.Generic.List[object]]::new()
foreach ($page in 1..12) {
    try {
        $html = (Invoke-WebRequest -Uri ($listTemplate -f $page) -UseBasicParsing -TimeoutSec 30).Content
    } catch {
        Write-RunLog 'WARN' "Unable to read INE listing page ${page}: $($_.Exception.Message)"
        continue
    }
    $matches = [regex]::Matches(
        $html,
        '<h2[^>]*>\s*<a href="([^\"]*?/publicacoes/detalhes/[^\"]+)">(.*?)</a>',
        [Text.RegularExpressions.RegexOptions]::IgnoreCase -bor [Text.RegularExpressions.RegexOptions]::Singleline
    )
    foreach ($match in $matches) {
        $title = [Net.WebUtility]::HtmlDecode((([regex]::Replace($match.Groups[2].Value, '<[^>]+>', ' ')) -replace '\s+', ' ').Trim())
        $titleMatch = [regex]::Match($title, '(?i)(Janeiro|Fevereiro|Março|Marco|Abril|Maio|Junho|Julho|Agosto|Setembro|Outubro|Novembro|Dezembro)\s+(20\d{2})')
        if (-not $titleMatch.Success -or $title -notmatch '(?i)Consumidor.*\(IPCN\)') { continue }
        $monthName = $titleMatch.Groups[1].Value
        $year = [int]$titleMatch.Groups[2].Value
        $month = [int]$monthNumbers[$monthName]
        $publications.Add([pscustomobject]@{
            ReferenceDate = [datetime]::new($year, $month, 1)
            ReferencePeriod = ('{0:D4}-{1:D2}' -f $year, $month)
            Title = $title
            DetailUrl = [uri]::new($baseUri, $match.Groups[1].Value).AbsoluteUri
            ListingPage = $page
        })
    }
}

if ($publications.Count -eq 0) { throw 'No dated IPCN publications were discovered on the official listing.' }
$latest = $publications | Sort-Object ReferenceDate, DetailUrl -Descending | Select-Object -First 1
$databaseLatestText = Invoke-SqlScalar "SELECT CONVERT(char(7), MAX(o.reference_period_start), 126) FROM silver.observation AS o INNER JOIN silver.indicator_series AS s ON s.series_id=o.series_id WHERE s.series_code=N'INFLATION_RATE_AGO_INE_IPCN_YOY' AND o.is_current=1;"

$discovery = [ordered]@{
    status = if ($latest.ReferencePeriod -gt $databaseLatestText) { 'NEW_PUBLICATION' } else { 'NO_NEW_DATA' }
    discoveredReferencePeriod = $latest.ReferencePeriod
    databaseLatestReferencePeriod = $databaseLatestText
    title = $latest.Title
    detailUrl = $latest.DetailUrl
    checkedAt = (Get-Date).ToUniversalTime().ToString('o')
}
Write-RunLog 'INFO' "Latest official portal period is $($latest.ReferencePeriod); database maximum is $databaseLatestText."

if ($Mode -eq 'Discover') {
    $discovery | ConvertTo-Json -Depth 5
    exit 0
}
if ($discovery.status -eq 'NO_NEW_DATA') {
    Write-RunLog 'INFO' 'NO_NEW_DATA - no download or database write is required.'
    $discovery | ConvertTo-Json -Depth 5
    exit 0
}

$detailHtml = (Invoke-WebRequest -Uri $latest.DetailUrl -UseBasicParsing -TimeoutSec 30).Content
$assetCandidates = [regex]::Matches(
    $detailHtml,
    '<a[^>]+href\s*=\s*["'']?([^"'' >]+\.pdf)["'']?[^>]*>(.*?)</a>',
    [Text.RegularExpressions.RegexOptions]::IgnoreCase -bor [Text.RegularExpressions.RegexOptions]::Singleline
) | ForEach-Object {
    [pscustomobject]@{
        Href = $_.Groups[1].Value
        Text = [Net.WebUtility]::HtmlDecode((([regex]::Replace($_.Groups[2].Value, '<[^>]+>', ' ')) -replace '\s+', ' ').Trim())
    }
}
$primaryAsset = $assetCandidates | Where-Object { $_.Text -match '(?i)^Publicação\s*-.*Consumidor' } | Select-Object -First 1
if (-not $primaryAsset) { throw 'The primary official IPCN PDF link was not found on the detail page.' }
$assetUrl = [uri]::new($baseUri, $primaryAsset.Href).AbsoluteUri

$publicationHeader = [regex]::Match($detailHtml, '<div class="h4 m-0">\s*(\d{1,2})\s*</div>\s*<small>([A-Za-z]{3})</small>', 'IgnoreCase,Singleline')
if (-not $publicationHeader.Success) { throw 'Publication date header was not found on the detail page.' }
$publicationMonthNumbers = @{ Jan=1; Fev=2; Mar=3; Abr=4; Mai=5; Jun=6; Jul=7; Ago=8; Set=9; Out=10; Nov=11; Dez=12 }
$publicationDay = [int]$publicationHeader.Groups[1].Value
$publicationMonth = [int]$publicationMonthNumbers[$publicationHeader.Groups[2].Value]
$publicationYear = if ($publicationMonth -lt $latest.ReferenceDate.Month) { $latest.ReferenceDate.Year + 1 } else { $latest.ReferenceDate.Year }
$publicationDate = [datetime]::new($publicationYear, $publicationMonth, $publicationDay)

$assetName = "ine_ipcn_$($latest.ReferencePeriod)_publication.pdf"
$landingPath = Join-Path $landingRoot $assetName
$partialPath = "$landingPath.download"
$archivePath = Join-Path $archiveRoot $assetName
try {
    Invoke-WebRequest -Uri $assetUrl -UseBasicParsing -OutFile $partialPath -TimeoutSec 120
    $signature = [Text.Encoding]::ASCII.GetString([IO.File]::ReadAllBytes($partialPath), 0, 5)
    if ($signature -ne '%PDF-') { throw "Downloaded file does not have a PDF signature: $signature" }
    Move-Item -LiteralPath $partialPath -Destination $landingPath -Force

    $python = Get-Command python.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -First 1
    if (-not $python) {
        $python = Get-ChildItem -LiteralPath (Join-Path $env:LOCALAPPDATA 'Python') -Filter python.exe -Recurse -ErrorAction SilentlyContinue |
            Select-Object -ExpandProperty FullName -First 1
    }
    if (-not $python) { throw 'Python runtime with pypdf was not found.' }
    $extractor = Join-Path $PSScriptRoot 'extract_ipcn_pdf.py'
    $extractionJson = & $python $extractor --pdf $landingPath --period $latest.ReferencePeriod
    if ($LASTEXITCODE -ne 0) { throw 'IPCN PDF extraction failed.' }
    $extraction = $extractionJson | ConvertFrom-Json
    if ($extraction.reconciliationStatus -ne 'PASS' -or [decimal]$extraction.absoluteDifferencePercentagePoints -gt [decimal]0.01) {
        throw "IPCN reconciliation failed with difference $($extraction.absoluteDifferencePercentagePoints)."
    }

    $hash = (Get-FileHash -LiteralPath $landingPath -Algorithm SHA256).Hash
    $size = (Get-Item -LiteralPath $landingPath).Length
    Move-Item -LiteralPath $landingPath -Destination $archivePath -Force

    $sourceVersion = 'IPCN-NI-{0:D2}-{1:D4}' -f $latest.ReferenceDate.Month, $latest.ReferenceDate.Year
    $sql = @"
EXEC [control].[usp_publish_ipcn_month]
    @reference_period = '$($latest.ReferencePeriod)-01',
    @index_value = $($extraction.indexValue.ToString([Globalization.CultureInfo]::InvariantCulture)),
    @prior_year_index_value = $($extraction.priorYearIndexValue.ToString([Globalization.CultureInfo]::InvariantCulture)),
    @reported_yoy = $($extraction.reportedYoyPercent.ToString([Globalization.CultureInfo]::InvariantCulture)),
    @publication_date = '$($publicationDate.ToString('yyyy-MM-dd'))',
    @source_version = $(ConvertTo-SqlLiteral $sourceVersion),
    @asset_name = $(ConvertTo-SqlLiteral $assetName),
    @asset_location = $(ConvertTo-SqlLiteral $archivePath),
    @asset_url = $(ConvertTo-SqlLiteral $assetUrl),
    @publication_page = $(ConvertTo-SqlLiteral $latest.DetailUrl),
    @content_hash_hex = '$hash',
    @content_size_bytes = $size,
    @simulation = 0;
"@
    $sqlOutput = & sqlcmd.exe -S $instance -E -C -b -d $database -Q $sql
    if ($LASTEXITCODE -ne 0) { throw "Incremental SQL publication failed: $sqlOutput" }

    $manifest = [ordered]@{
        status = 'PUBLISHED'
        referencePeriod = $latest.ReferencePeriod
        publicationDate = $publicationDate.ToString('yyyy-MM-dd')
        detailUrl = $latest.DetailUrl
        assetUrl = $assetUrl
        archivePath = $archivePath
        sha256 = $hash
        bytes = $size
        extraction = $extraction
        publishedAt = (Get-Date).ToUniversalTime().ToString('o')
        pipelineOutput = ($sqlOutput -join "`n")
    }
    $manifestPath = Join-Path $manifestRoot "ine-ipcn-$($latest.ReferencePeriod)-incremental.json"
    $manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $manifestPath -Encoding utf8
    Write-RunLog 'INFO' "PUBLISHED $($latest.ReferencePeriod); manifest: $manifestPath"
    $manifest | ConvertTo-Json -Depth 8
} catch {
    foreach ($path in @($partialPath, $landingPath)) {
        if (Test-Path -LiteralPath $path) {
            $rejectedPath = Join-Path $rejectedRoot (Split-Path $path -Leaf)
            Move-Item -LiteralPath $path -Destination $rejectedPath -Force
        }
    }
    Write-RunLog 'ERROR' $_.Exception.Message
    throw
}
