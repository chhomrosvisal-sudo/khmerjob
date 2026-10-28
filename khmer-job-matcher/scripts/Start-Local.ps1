param()
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$backendDirectory = Join-Path $projectRoot 'backend'
$frontendDirectory = Join-Path $projectRoot 'frontend'
$pythonPath = Join-Path $backendDirectory 'venv/Scripts/python.exe'
$logDirectory = Join-Path $projectRoot '.local-run'

function Test-LocalHttp([string]$Address) {
    try {
        $response = Invoke-WebRequest -Uri $Address -UseBasicParsing -TimeoutSec 2
        return $response.StatusCode -eq 200
    } catch { return $false }
}

foreach ($requiredFile in @($pythonPath, (Join-Path $backendDirectory '.env'), (Join-Path $frontendDirectory '.env'), (Join-Path $frontendDirectory 'node_modules/vite/bin/vite.js'))) {
    if (!(Test-Path -LiteralPath $requiredFile)) { throw "Missing $requiredFile. Follow the installation steps in README.md first." }
}
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null

if (!(Test-LocalHttp 'http://127.0.0.1:8000/api/health')) {
    Start-Process -FilePath $pythonPath -ArgumentList @('-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000') -WorkingDirectory $backendDirectory -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDirectory 'backend.log') -RedirectStandardError (Join-Path $logDirectory 'backend-error.log') | Out-Null
}

if (!(Test-LocalHttp 'http://localhost:5173')) {
    $nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
    $runtimePath = if ($nodeCommand) { $nodeCommand.Source } else { Join-Path $env:LOCALAPPDATA 'Programs/Microsoft VS Code/Code.exe' }
    if (!(Test-Path -LiteralPath $runtimePath)) { throw 'Install Node.js LTS with npm, then reopen your terminal.' }
    $previousElectronMode = $env:ELECTRON_RUN_AS_NODE
    try {
        if (!$nodeCommand) { $env:ELECTRON_RUN_AS_NODE = '1' }
        Start-Process -FilePath $runtimePath -ArgumentList @('node_modules/vite/bin/vite.js', '--host', 'localhost', '--port', '5173', '--strictPort') -WorkingDirectory $frontendDirectory -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDirectory 'frontend.log') -RedirectStandardError (Join-Path $logDirectory 'frontend-error.log') | Out-Null
    } finally { $env:ELECTRON_RUN_AS_NODE = $previousElectronMode }
}

$ready = $false
for ($attempt = 0; $attempt -lt 20; $attempt++) {
    if ((Test-LocalHttp 'http://127.0.0.1:8000/api/jobs') -and (Test-LocalHttp 'http://localhost:5173/api/jobs')) { $ready = $true; break }
    Start-Sleep -Milliseconds 500
}
if (!$ready) { throw "The website/API/database readiness check failed. Start MySQL in XAMPP, confirm migrations, and inspect logs in $logDirectory." }
Write-Output 'Website:             http://localhost:5173'
Write-Output 'Job account dashboard: http://localhost:5173/dashboard'
Write-Output 'Smart Home demo:     http://localhost:5173/smart-home'
Write-Output 'API documentation:   http://127.0.0.1:8000/docs'
Write-Output 'API and database reads passed. This script does not create, reset, or migrate your database.'
