[CmdletBinding()]
param(
    [string]$SqlInstance = '.\SQLEXPRESS',
    [string]$Database = 'LAZA_DATA_PLATFORM_DEV',
    [string]$StartDate = '2021-01-01',
    [string]$EndDate = '2026-06-30',
    [string]$LandingDirectory = 'D:\LAZA_DATA\landing\bna\exchange-rate'
)

$ErrorActionPreference = 'Stop'
$endpoint = 'https://www.bna.ao/service/rest/taxas/get/evolucao/taxa/intervalo'
$url = "$endpoint`?datainicio=$StartDate&datafim=$EndDate"
$response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 90
$payload = $response.Content | ConvertFrom-Json
$rows = @($payload.genericResponse)
if (-not $payload.success -or $rows.Count -eq 0) { throw 'BNA endpoint returned no successful data payload.' }
$invalid = @($rows | Where-Object { $_.codigoMoeda -ne 'USD' -or $_.tipoCambio -ne 'M' -or [decimal]$_.taxa -le 0 })
if ($invalid.Count -gt 0) { throw "BNA contract validation failed for $($invalid.Count) rows." }

[IO.Directory]::CreateDirectory($LandingDirectory) | Out-Null
$assetName = "bna_usd_aoa_reference_daily_${StartDate}_${EndDate}.json"
$assetPath = Join-Path $LandingDirectory $assetName
$utf8 = New-Object Text.UTF8Encoding($false)
[IO.File]::WriteAllText($assetPath, $response.Content, $utf8)
$sha = [Security.Cryptography.SHA256]::Create()
try { $hashHex = ([BitConverter]::ToString($sha.ComputeHash([IO.File]::ReadAllBytes($assetPath)))).Replace('-', '').ToLowerInvariant() } finally { $sha.Dispose() }
$duplicateRows = ($rows.Count - @($rows | Group-Object data,codigoMoeda,tipoCambio,taxa).Count)
$manifest = [pscustomobject]@{
    endpoint = $url
    contract = 'USD/AOA daily average reference rate (tipoCambio=M)'
    extractedAtUtc = [DateTime]::UtcNow.ToString('o')
    startDate = $rows[0].data
    endDate = $rows[-1].data
    rowCount = $rows.Count
    monthCount = @($rows | Group-Object { $_.data.Substring(0, 7) }).Count
    duplicateSourceRows = $duplicateRows
    sha256 = $hashHex
    assetPath = $assetPath
}
$manifestPath = Join-Path $LandingDirectory "$([IO.Path]::GetFileNameWithoutExtension($assetName)).manifest.json"
[IO.File]::WriteAllText($manifestPath, ($manifest | ConvertTo-Json -Depth 5), $utf8)

$sqlFile = Join-Path (Split-Path $PSScriptRoot -Parent | Split-Path -Parent) 'database\sqlserver\21_create_bna_exchange_initial_procedure.sql'
& sqlcmd.exe -S $SqlInstance -E -C -b -d $Database -i $sqlFile
if ($LASTEXITCODE -ne 0) { throw 'Could not create the BNA load procedure.' }

$connection = New-Object System.Data.SqlClient.SqlConnection
$connection.ConnectionString = "Server=$SqlInstance;Database=$Database;Integrated Security=True;TrustServerCertificate=True;"
$command = $connection.CreateCommand()
$command.CommandText = 'control.usp_load_bna_exchange_initial'
$command.CommandType = [System.Data.CommandType]::StoredProcedure
$command.CommandTimeout = 180
[void]$command.Parameters.Add('@raw_json', [System.Data.SqlDbType]::NVarChar, -1)
$command.Parameters['@raw_json'].Value = [IO.File]::ReadAllText($manifest.assetPath, [Text.Encoding]::UTF8)
[void]$command.Parameters.Add('@asset_name', [System.Data.SqlDbType]::NVarChar, 500)
$command.Parameters['@asset_name'].Value = [IO.Path]::GetFileName($manifest.assetPath)
[void]$command.Parameters.Add('@asset_location', [System.Data.SqlDbType]::NVarChar, 2000)
$command.Parameters['@asset_location'].Value = $manifest.assetPath
[void]$command.Parameters.Add('@content_hash_hex', [System.Data.SqlDbType]::VarChar, 64)
$command.Parameters['@content_hash_hex'].Value = $manifest.sha256
[void]$command.Parameters.Add('@content_size_bytes', [System.Data.SqlDbType]::BigInt)
$command.Parameters['@content_size_bytes'].Value = (Get-Item -LiteralPath $manifest.assetPath).Length
[void]$command.Parameters.Add('@expected_start', [System.Data.SqlDbType]::Date)
$command.Parameters['@expected_start'].Value = [datetime]$StartDate
[void]$command.Parameters.Add('@expected_end', [System.Data.SqlDbType]::Date)
$command.Parameters['@expected_end'].Value = [datetime]$EndDate

$connection.Open()
try {
    $reader = $command.ExecuteReader()
    $table = New-Object System.Data.DataTable
    $table.Load($reader)
    $table | Format-Table -AutoSize
} finally {
    $connection.Close()
}
