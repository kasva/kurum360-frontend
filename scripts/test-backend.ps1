$ErrorActionPreference = 'Stop'
$privateSdk = Join-Path $env:LOCALAPPDATA 'kurum360-dotnet'
if (Test-Path (Join-Path $privateSdk 'dotnet.exe')) { $env:DOTNET_ROOT = $privateSdk; $dotnetPath = Join-Path $privateSdk 'dotnet.exe' }
else { $dotnetPath = (Get-Command dotnet).Source }
if (!$env:TEST_DATABASE) { Write-Warning 'TEST_DATABASE is unset: PostgreSQL integration tests will be skipped.' }
& $dotnetPath test (Join-Path $PSScriptRoot '../backend/Kurum360.Tests/Kurum360.Tests.csproj')
exit $LASTEXITCODE
