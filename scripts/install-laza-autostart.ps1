[CmdletBinding()]
param(
    [string]$TaskName = 'LAZA Production Site'
)

$ErrorActionPreference = 'Stop'

$scriptPath = $MyInvocation.MyCommand.Path
$scriptsDirectory = Split-Path -Parent $scriptPath
$projectRoot = Split-Path -Parent $scriptsDirectory
$startupScript = Join-Path $scriptsDirectory 'start-laza-production.ps1'
$distIndex = Join-Path $projectRoot 'dist\index.html'
$node = 'C:\Program Files\nodejs\node.exe'
$sqlcmd = 'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE'
$powershell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

function Assert-PathExists {
    param(
        [Parameter(Mandatory = $true)]
        [string]$LiteralPath,
        [Parameter(Mandatory = $true)]
        [string]$Description
    )

    if (-not (Test-Path -LiteralPath $LiteralPath)) {
        throw "$Description not found at $LiteralPath"
    }
}

Assert-PathExists -LiteralPath $projectRoot -Description 'LAZA project root'
Assert-PathExists -LiteralPath $startupScript -Description 'LAZA production startup script'
Assert-PathExists -LiteralPath $distIndex -Description 'LAZA production build'
Assert-PathExists -LiteralPath $node -Description 'Node.js'
Assert-PathExists -LiteralPath $sqlcmd -Description 'sqlcmd'
Assert-PathExists -LiteralPath $powershell -Description 'Windows PowerShell'

$actionArguments = @(
    '-NoProfile',
    '-NonInteractive',
    '-WindowStyle', 'Hidden',
    '-ExecutionPolicy', 'Bypass',
    '-File', ('"{0}"' -f $startupScript)
) -join ' '

$action = New-ScheduledTaskAction `
    -Execute $powershell `
    -Argument $actionArguments `
    -WorkingDirectory $projectRoot

$trigger = New-ScheduledTaskTrigger -AtLogOn -User $currentUser
$trigger.Delay = 'PT15S'

$principal = New-ScheduledTaskPrincipal `
    -UserId $currentUser `
    -LogonType Interactive `
    -RunLevel Limited

$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -Hidden `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit ([TimeSpan]::Zero) `
    -MultipleInstances IgnoreNew

$description = 'Runs the LAZA production site and analytics API at user logon through the governed PowerShell startup script.'

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Principal $principal `
    -Settings $settings `
    -Description $description `
    -Force | Out-Null

$registeredTask = Get-ScheduledTask -TaskName $TaskName
$registeredAction = $registeredTask.Actions | Select-Object -First 1
$registeredTrigger = $registeredTask.Triggers | Select-Object -First 1

[pscustomobject]@{
    TaskName = $registeredTask.TaskName
    State = $registeredTask.State
    UserId = $registeredTask.Principal.UserId
    LogonType = $registeredTask.Principal.LogonType
    Trigger = $registeredTrigger.CimClass.CimClassName
    Execute = $registeredAction.Execute
    Arguments = $registeredAction.Arguments
    WorkingDirectory = $registeredAction.WorkingDirectory
} | Format-List
