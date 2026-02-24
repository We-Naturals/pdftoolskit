#!/bin/bash
set -e

# APEX ENGINE BUILD ORCHESTRATOR
# This script manages the 14-hour 'God Asset' compilation cycle.

echo "🏗️  Starting Apex Engine Build Cycle..."

# 1. Environment Check
if ! command -v docker &> /dev/null
then
    echo "❌ ERROR: Docker is required for the Apex Build Foundation."
    exit 1
fi

# 2. Build the Core (The Marathon Step)
echo "💎 Compiling C++ Foundation to WASM (this may take 12-14 hours)..."
docker build -t apex-doc-builder ./apex-core-foundation

# 3. Extract Assets
echo "📦 Extracting 'God Assets' to public/wasm..."
mkdir -p public/wasm
docker run --rm -v "$(pwd)/public/wasm:/host_output" apex-doc-builder cp -r /output/* /host_output/

# 4. Generate Integrity Manifest
echo "🔒 Fingerprinting binaries..."
node -e "
const fs = require('fs');
const crypto = require('crypto');
const files = ['apex-doc.wasm', 'apex-doc.js'];
const manifest = { buildDate: new Date().toISOString(), files: {} };
files.forEach(f => {
    const content = fs.readFileSync('public/wasm/' + f);
    manifest.files[f] = crypto.createHash('sha256').update(content).digest('hex');
});
fs.writeFileSync('public/wasm/MANIFEST.json', JSON.stringify(manifest, null, 2));
"

echo "✅ Build Cycle Complete. Manifest generated at public/wasm/MANIFEST.json."
