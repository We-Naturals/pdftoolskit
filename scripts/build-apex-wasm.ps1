# build-apex-wasm.ps1
# This script automates the compilation of the LibreOffice Headless core to WebAssembly
# for the Apex Engine on Windows using PowerShell. Requires Docker Desktop to be installed.

Write-Host "🚀 Starting Apex Engine Binary Generation (Phase 32.1)..." -ForegroundColor Cyan

# 1. Ensure output directory exists
$wasmDir = Join-Path (Get-Location) "public/wasm"
if (!(Test-Path $wasmDir)) {
    New-Item -ItemType Directory -Force -Path $wasmDir
}

$ErrorActionPreference = "Stop"

# 2. Build the Local Compilation Environment
Write-Host "Verifying Apex WASM Build Environment..." -ForegroundColor Yellow
docker build --load -t apex-wasm-builder:latest -f scripts/Dockerfile.wasm-builder .
if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker build failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}

# 3. Start the compilation
Write-Host "Starting Docker compilation pass (The 4-hour 'No Shortcuts' marathon)..." -ForegroundColor Yellow
$containerName = "apex-doc-builder"
docker rm -f $containerName 2>$null | Out-Null # Suppress PowerShell error stream for clean exit if container missing

# Run synchronously to ensure container exists for extraction
docker run --name $containerName -v "${wasmDir}:/output" apex-wasm-builder:latest
if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker run failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}

# 4. Extract the artifacts
Write-Host "Extracting final artifacts from container..." -ForegroundColor Yellow
$containerExists = docker ps -a --format "{{.Names}}" | Select-String -Pattern "^${containerName}$"
if ($containerExists) {
    docker cp "${containerName}:/src/core/wasm/apex-doc.wasm" "${wasmDir}/apex-doc.wasm"
    docker cp "${containerName}:/src/core/wasm/apex-doc.js" "${wasmDir}/apex-doc.js"
    if (Test-Path "${wasmDir}/apex-doc.wasm") {
        Write-Host "✅ Binary generation complete. Artifacts located at: ./public/wasm/" -ForegroundColor Green
    } else {
        Write-Error "Binary was not found in the container at expected path: /src/core/wasm/apex-doc.wasm"
        exit 1
    }
} else {
    Write-Error "Container $containerName failed to start or was removed."
    exit 1
}
