#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

BUILD_FLAGS=""
if [[ "${1:-}" == "--no-cache" ]]; then
  BUILD_FLAGS="--no-cache"
  echo "==> Building with --no-cache"
fi

echo "==> Building and deploying SagoConsole (dev)..."
docker compose build $BUILD_FLAGS
docker compose up -d

echo "==> SagoConsole deployed on port 8120"
