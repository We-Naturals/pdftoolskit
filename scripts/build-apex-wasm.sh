# build-wasm.sh
# This script automates the compilation of the LibreOffice Headless core to WebAssembly
# for the Apex Engine. Requires Docker to be installed.

echo "🚀 Starting Apex Engine Binary Generation (Phase 32.1)..."

# 1. Pull the Emscripten/LibreOffice Build Environment
# We use a specialized container that has all the C++ cross-compilation tools ready.
docker pull lode/libreoffice-build-base:latest

# 2. Start the compilation
# This command mounts the project directory, clones the LibreOffice core (LOKit),
# and runs the Emscripten build pass.
# WARNING: This process can take 2-6 hours depending on CPU hardware.
docker run -v $(pwd)/wasm:/output \
  -e "BUILD_TYPE=WASM" \
  -e "OPTIMIZATION=-O3" \
  lode/libreoffice-build-base:latest \
  "/bin/bash -c './autogen.sh --host=wasm32-unknown-emscripten && make -j$(nproc) && cp core/wasm/apex-doc.wasm /output/'"

echo "✅ Binary generation complete. Binary located at: ./wasm/apex-doc.wasm"
