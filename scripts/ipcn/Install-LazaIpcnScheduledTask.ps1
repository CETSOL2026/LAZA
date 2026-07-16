[CmdletBinding()]
param(
    [string]$TaskName = 'LAZA IPCN Monthly Pipeline',
    [string]$DailyAt = '09:15'
)

$ErrorActionPreference = 'Stop'
$pipelineScript = Join-Path $PSScriptRoot 'Invoke-LazaIpcnPipeline.ps1'
if (-not (Test-Path -LiteralPath $pipelineScript)) { throw "Pipeline script not found: $pipelineScript" }

$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument (
    "-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$pipelineScript`" -Mode Run"
)
$trigger = New-ScheduledTaskTrigger -Daily -At $DailyAt
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 30)
$principal = New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description (
    'Checks the official INE IPCN portal daily and publishes only the next consecutive validated month.'
) -Force | Out-Null

Get-ScheduledTask -TaskName $TaskName | Select-Object TaskName, State, Description
Get-ScheduledTaskInfo -TaskName $TaskName | Select-Object LastRunTime, LastTaskResult, NextRunTime
