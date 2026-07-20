param(
  [string]$ConfigPath = 'D:\LAZA_DATA\config\laza-admin-auth.json',
  [int]$Iterations = 210000,
  [int]$PasswordLength = 22
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ($Iterations -lt 100000) { throw 'Iterations must be at least 100000.' }
if ($PasswordLength -lt 14) { throw 'Generated passwords must contain at least 14 characters.' }

function New-LazaPassword {
  param([int]$Length)

  $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@$%*-_=+?'
  $bytes = [byte[]]::new($Length)
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $rng.GetBytes($bytes)
  } finally {
    $rng.Dispose()
  }
  $chars = for ($i = 0; $i -lt $Length; $i++) {
    $alphabet[$bytes[$i] % $alphabet.Length]
  }
  -join $chars
}

function ConvertTo-Hex {
  param([byte[]]$Bytes)
  ([System.BitConverter]::ToString($Bytes) -replace '-', '').ToLowerInvariant()
}

function New-LazaCredentialHash {
  param(
    [string]$Password,
    [int]$Iterations
  )

  $salt = [byte[]]::new(16)
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $rng.GetBytes($salt)
  } finally {
    $rng.Dispose()
  }
  $derive = [System.Security.Cryptography.Rfc2898DeriveBytes]::new(
    $Password,
    $salt,
    $Iterations,
    [System.Security.Cryptography.HashAlgorithmName]::SHA256
  )
  try {
    $hash = $derive.GetBytes(32)
  } finally {
    $derive.Dispose()
  }

  [pscustomobject]@{
    SaltHex = ConvertTo-Hex -Bytes $salt
    PasswordHashHex = ConvertTo-Hex -Bytes $hash
  }
}

$profiles = @(
  [pscustomobject]@{
    Username = 'admin'
    DisplayName = 'LAZA Administrator'
    Role = 'admin'
    Scope = 'admin-panel'
  },
  [pscustomobject]@{
    Username = 'reviewer'
    DisplayName = 'LAZA Data Reviewer'
    Role = 'reviewer'
    Scope = 'admin-panel-readonly'
  },
  [pscustomobject]@{
    Username = 'portal-demo'
    DisplayName = 'LAZA Portal Demo'
    Role = 'portal_tester'
    Scope = 'public-portal-validation'
  }
)

$now = (Get-Date).ToUniversalTime().ToString('o')
$generated = foreach ($profile in $profiles) {
  $password = New-LazaPassword -Length $PasswordLength
  $hash = New-LazaCredentialHash -Password $password -Iterations $Iterations

  [pscustomobject]@{
    Username = $profile.Username
    DisplayName = $profile.DisplayName
    Role = $profile.Role
    Scope = $profile.Scope
    Password = $password
    ConfigUser = [ordered]@{
      username = $profile.Username
      displayName = $profile.DisplayName
      role = $profile.Role
      scope = $profile.Scope
      enabled = $true
      iterations = $Iterations
      saltHex = $hash.SaltHex
      passwordHashHex = $hash.PasswordHashHex
      createdAt = $now
      updatedAt = $now
    }
  }
}

$configDirectory = Split-Path -Parent $ConfigPath
if ($configDirectory -and -not (Test-Path -LiteralPath $configDirectory)) {
  New-Item -ItemType Directory -Path $configDirectory | Out-Null
}

$backupPath = $null
if (Test-Path -LiteralPath $ConfigPath) {
  $backupPath = "$ConfigPath.bak.$((Get-Date).ToString('yyyyMMdd-HHmmss'))"
  Copy-Item -LiteralPath $ConfigPath -Destination $backupPath
}

$config = [ordered]@{
  version = 2
  updatedAt = $now
  users = @($generated.ConfigUser)
}

$config | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $ConfigPath -Encoding UTF8

try {
  icacls $ConfigPath /inheritance:r /grant:r "$env:USERNAME`:F" '*S-1-5-18:F' '*S-1-5-32-544:F' | Out-Null
} catch {
  Write-Warning "Could not restrict ACLs for $ConfigPath. Please review file permissions manually."
}

Write-Host ''
Write-Host 'LAZA test users were generated. Store these one-time passwords securely now:' -ForegroundColor Yellow
$generated | Select-Object Username, DisplayName, Role, Scope, Password | Format-Table -AutoSize
Write-Host "Config written to: $ConfigPath"
if ($backupPath) { Write-Host "Previous config backup: $backupPath" }
