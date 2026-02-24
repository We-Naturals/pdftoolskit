# APEX CORE: BUILD FOUNDATION (Phase 49.1) 🏗️

## Dockerfile: C++ to WASM Pipeline
The goal is to provide a 1:1 reproducible environment for the 14-hour compile.

```dockerfile
# STAGE 1: Build Environment
FROM emscripten/emsdk:3.1.27 as builder

# Install LibreOffice build dependencies
RUN apt-get update && apt-get install -y \
    automake \
    flex \
    bison \
    git \
    gperf \
    libxml2-dev \
    libxslt1-dev \
    zlib1g-dev \
    libicu-dev \
    python3 \
    python3-setuptools \
    zip \
    unzip \
    pkg-config

WORKDIR /build
# Note: Source code must be present in this directory
COPY . /build

# Configure for WASM/Emscripten
# This is a simplified version of the autogen/configure cycle
RUN ./autogen.sh && \
    ./configure \
    --with-system-libs \
    --disable-gui \
    --disable-dbus \
    --enable-wasm \
    --disable-java \
    --enable-headless

# The marathon build step
RUN make -j$(nproc)

# STAGE 2: Artifact Extraction
FROM alpine:latest
WORKDIR /output
COPY --from=builder /build/instdir/program/soffice.wasm /output/apex-doc.wasm
COPY --from=builder /build/instdir/program/soffice.js /output/apex-doc.js
```

## Build Script: `scripts/build-apex-wasm.sh`
```bash
#!/bin/bash
set -e

echo "🏗️ Starting Apex Engine Build Foundation Cycle..."
cd apex-core-foundation

# Build the temporary docker image
docker build -t apex-doc-builder .

# Extract the 'God Asset'
echo "📦 Extracting WASM binaries to public/wasm..."
mkdir -p ../public/wasm
docker run --rm -v $(pwd)/../public/wasm:/host_output apex-doc-builder cp -r /output/* /host_output/

echo "✅ Apex Engine Core Updated. Run 'git add public/wasm' to commit the new binary."
```
