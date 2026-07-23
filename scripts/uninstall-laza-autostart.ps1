[CmdletBinding()]
param(
    [string]$TaskName = 'LAZA Production Site'
)

$ErrorActionPreference = 'Stop'

$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if (-not $task) {
    Write-Host "Scheduled Task '$TaskName' is not installed."
    exit 0
}

Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
Write-Host "Scheduled Task '$TaskName' removed. No LAZA process, data, database, or other service was changed."
