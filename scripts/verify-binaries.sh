#!/bin/bash
# PHASE 49.1: BINARY PROVENANCE & CHECKSUM GUARD
# This script verifies that the WASM binaries in public/wasm/ match the expected SHA-256 hashes.

MANIFEST="public/wasm/MANIFEST.json"

if [ ! -f "$MANIFEST" ]; then
    echo "❌ ERROR: Manifest file missing at $MANIFEST"
    exit 1
fi

echo "🔍 APEX: Verifying WASM binary integrity..."

# Use node to parse the manifest and verify hashes
node -e "
const fs = require('fs');
const crypto = require('crypto');
const manifest = JSON.parse(fs.readFileSync('$MANIFEST', 'utf8'));

let violations = 0;
for (const [file, expectedHash] of Object.entries(manifest.files)) {
    const filePath = 'public/wasm/' + file;
    if (!fs.existsSync(filePath)) {
        console.error('❌ MISSING: ' + filePath);
        violations++;
        continue;
    }
    const fileBuffer = fs.readFileSync(filePath);
    const actualHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    if (actualHash !== expectedHash) {
        console.error('❌ CORRUPT: ' + filePath + ' (Hash Mismatch)');
        violations++;
    } else {
        console.log('✅ VERIFIED: ' + file);
    }
}

if (violations > 0) {
    console.error('⚠️ APEX CRITICAL: ' + violations + ' binary integrity violations found!');
    process.exit(1);
} else {
    console.log('💎 APEX: All binaries verified. God Asset integrity confirmed.');
}
"
