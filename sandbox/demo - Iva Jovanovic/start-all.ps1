$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Join-Path $repoRoot 'sandbox\event-demo'
$backendPath = Join-Path $projectRoot 'backend'
$frontendPath = Join-Path $projectRoot 'frontend'

if (-not (Test-Path $backendPath)) {
    Write-Error "Backend folder not found: $backendPath"
}

if (-not (Test-Path $frontendPath)) {
    Write-Error "Frontend folder not found: $frontendPath"
}

Write-Host 'Starting EventHub demo project...' -ForegroundColor Cyan
Write-Host "Backend path : $backendPath"
Write-Host "Frontend path: $frontendPath"

Start-Process powershell.exe -ArgumentList @(
    '-NoExit',
    '-Command',
    "Set-Location '$backendPath'; dotnet run"
)

Start-Process powershell.exe -ArgumentList @(
    '-NoExit',
    '-Command',
    "Set-Location '$frontendPath'; npm.cmd start"
)

Write-Host ''
Write-Host 'Services are starting in separate windows.' -ForegroundColor Green
Write-Host 'Backend URL : http://localhost:5000'
Write-Host 'Frontend URL: http://localhost:4200'
Write-Host 'Admin login : admin / admin'
