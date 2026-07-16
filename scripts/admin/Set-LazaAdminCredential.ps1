[CmdletBinding()]
param(
    [string]$Username = 'admin',
    [string]$Password,
    [string]$ConfigPath = 'D:\LAZA_DATA\config\laza-admin-auth.json'
)

$ErrorActionPreference = 'Stop'
$iterations = 210000

function New-SecurePassword([int]$Length = 20) {
    $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%_-'
    $bytes = New-Object byte[] $Length
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    -join ($bytes | ForEach-Object { $alphabet[$_ % $alphabet.Length] })
}

if ([string]::IsNullOrWhiteSpace($Username)) { throw 'Username cannot be empty.' }
$generatedPassword = [string]::IsNullOrWhiteSpace($Password)
if ($generatedPassword) { $Password = New-SecurePassword }
if ($Password.Length -lt 14) { throw 'The administrator password must contain at least 14 characters.' }

$salt = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($salt)
$derive = [System.Security.Cryptography.Rfc2898DeriveBytes]::new(
    $Password,
    $salt,
    $iterations,
    [System.Security.Cryptography.HashAlgorithmName]::SHA256
)
try { $passwordHash = $derive.GetBytes(32) } finally { $derive.Dispose() }

$config = [ordered]@{
    username = $Username
    iterations = $iterations
    saltHex = ([System.BitConverter]::ToString($salt) -replace '-', '')
    passwordHashHex = ([System.BitConverter]::ToString($passwordHash) -replace '-', '')
    updatedAt = [DateTime]::UtcNow.ToString('o')
}

$parent = Split-Path -Parent $ConfigPath
[System.IO.Directory]::CreateDirectory($parent) | Out-Null
$config | ConvertTo-Json | Set-Content -LiteralPath $ConfigPath -Encoding UTF8
& icacls.exe $ConfigPath /inheritance:r /grant:r "${env:USERNAME}:(F)" 'SYSTEM:(F)' | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Could not restrict the administrator credential file permissions.' }

Write-Host "AdminUsername=$Username"
if ($generatedPassword) { Write-Host "InitialPassword=$Password" }
Write-Host "ConfigPath=$ConfigPath"
