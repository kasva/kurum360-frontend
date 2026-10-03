param([switch]$MigrateOnly)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$configFile = Join-Path $projectRoot '.env.local'
if (!(Test-Path -LiteralPath $configFile)) { throw 'Create .env.local using README instructions before starting the API.' }
foreach ($line in Get-Content -LiteralPath $configFile) {
    if ($line.Trim() -and !$line.Trim().StartsWith('#')) {
        $parts = $line.Split('=', 2)
        if ($parts.Length -ne 2 -or $parts[0] -notmatch '^[A-Za-z][A-Za-z0-9_]*$') { throw 'Invalid .env.local entry.' }
        [Environment]::SetEnvironmentVariable($parts[0], $parts[1], 'Process')
    }
}
$privateSdk = Join-Path $env:LOCALAPPDATA 'kurum360-dotnet'
if (Test-Path (Join-Path $privateSdk 'dotnet.exe')) { $env:DOTNET_ROOT = $privateSdk; $dotnetPath = Join-Path $privateSdk 'dotnet.exe' }
else { $dotnetPath = (Get-Command dotnet).Source }
Push-Location $projectRoot
try {
    & $dotnetPath run --project backend/Kurum360.Api -- --migrate
    if ($LASTEXITCODE -ne 0) { throw 'Migration failed.' }
    if (!$MigrateOnly) { & $dotnetPath run --no-build --project backend/Kurum360.Api }
} finally { Pop-Location }
