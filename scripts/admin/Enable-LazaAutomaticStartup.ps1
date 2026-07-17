[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$taskName = 'LAZA Production Site'
$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$launcher = Join-Path $projectRoot 'scripts\start-laza-production-hidden.vbs'
$backupXml = [System.IO.Path]::GetTempFileName()

try {
    if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw 'This configuration must run as Administrator.'
    }

    Export-ScheduledTask -TaskName $taskName | Set-Content -LiteralPath $backupXml -Encoding Unicode
    $existingTask = Get-ScheduledTask -TaskName $taskName
    $userId = $existingTask.Principal.UserId

    $action = New-ScheduledTaskAction `
        -Execute 'C:\Windows\System32\wscript.exe' `
        -Argument ('"' + $launcher + '"') `
        -WorkingDirectory $projectRoot

    $startupTrigger = New-ScheduledTaskTrigger -AtStartup
    $startupTrigger.Delay = 'PT30S'
    $logonTrigger = New-ScheduledTaskTrigger -AtLogOn -User $userId
    $logonTrigger.Delay = 'PT15S'

    $principal = New-ScheduledTaskPrincipal -UserId $userId -LogonType S4U -RunLevel Limited
    $settings = New-ScheduledTaskSettingsSet `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries `
        -StartWhenAvailable `
        -Hidden `
        -RestartCount 10 `
        -RestartInterval (New-TimeSpan -Minutes 1) `
        -ExecutionTimeLimit ([TimeSpan]::Zero) `
        -MultipleInstances IgnoreNew

    Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    Get-CimInstance Win32_Process |
        Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -match 'server\\indicator-api\.mjs' } |
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force }

    Register-ScheduledTask `
        -TaskName $taskName `
        -Action $action `
        -Trigger @($startupTrigger, $logonTrigger) `
        -Principal $principal `
        -Settings $settings `
        -Description 'Runs the LAZA production site and analytics API invisibly at computer startup, with logon fallback.' `
        -Force | Out-Null

    Set-Service -Name 'MSSQL$SQLEXPRESS' -StartupType Automatic
    Set-Service -Name 'Cloudflared' -StartupType Automatic
    & sc.exe failure Cloudflared reset= 86400 actions= restart/60000/restart/60000/restart/60000 | Out-Null

    Start-ScheduledTask -TaskName $taskName
    $deadline = (Get-Date).AddSeconds(20)
    do {
        Start-Sleep -Seconds 2
        try { $health = Invoke-RestMethod -Uri 'http://127.0.0.1:8790/health' -TimeoutSec 3 } catch { $health = $null }
    } until ($health.status -eq 'ok' -or (Get-Date) -ge $deadline)

    if ($health.status -ne 'ok') { throw 'LAZA health check failed after the startup configuration.' }
    Write-Host 'LAZA automatic startup configured and validated successfully.' -ForegroundColor Green
} catch {
    if (Test-Path -LiteralPath $backupXml) {
        try {
            Register-ScheduledTask -TaskName $taskName -Xml (Get-Content -Raw -LiteralPath $backupXml) -Force | Out-Null
            Start-ScheduledTask -TaskName $taskName
        } catch {
            Write-Warning 'The previous task configuration could not be restored automatically.'
        }
    }
    throw
} finally {
    Remove-Item -LiteralPath $backupXml -Force -ErrorAction SilentlyContinue
}
