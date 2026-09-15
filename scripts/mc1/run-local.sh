#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

cleanup_secret() {
  unset AIVERSE_GATEWAY_TOKEN || true
}
trap cleanup_secret EXIT INT TERM

if [[ -z "${AIVERSE_GATEWAY_TOKEN:-}" ]]; then
  printf "AI-Verse Gateway token (input hidden): " >&2
  IFS= read -r -s AIVERSE_GATEWAY_TOKEN
  printf "\n" >&2
  export AIVERSE_GATEWAY_TOKEN
fi

if [[ -z "${AIVERSE_GATEWAY_TOKEN:-}" ]]; then
  echo "No Gateway token supplied. Nothing was changed." >&2
  exit 2
fi

echo "Preparing the verified AI-Verse Dashboard MC1 proof..."
npm ci

echo "Running the disposable Mission Control -> AI-Verse Gateway proof..."
npm run mc1:proof
