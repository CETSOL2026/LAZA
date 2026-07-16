[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$node = 'C:\Program Files\nodejs\node.exe'
$sqlcmd = 'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE'

try {
    $health = Invoke-RestMethod -Uri 'http://127.0.0.1:8790/health' -TimeoutSec 3
    if ($health.status -eq 'ok') { exit 0 }
} catch {
    # No healthy instance is running; start the governed production process.
}

if (-not (Test-Path -LiteralPath $node)) { throw "Node.js not found at $node" }
if (-not (Test-Path -LiteralPath $sqlcmd)) { throw "sqlcmd not found at $sqlcmd" }
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'dist\index.html'))) {
    throw 'Production build not found. Run npm run build before starting LAZA.'
}

$env:LAZA_SQLCMD = $sqlcmd
$env:LAZA_SQL_INSTANCE = '.\SQLEXPRESS'
$env:LAZA_SQL_DATABASE = 'LAZA_DATA_PLATFORM_DEV'
$env:LAZA_API_PORT = '8790'

Set-Location -LiteralPath $projectRoot
& $node 'server\indicator-api.mjs'
exit $LASTEXITCODE
