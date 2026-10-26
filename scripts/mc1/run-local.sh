#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

cleanup_secret() {
  unset AIVERSE_GATEWAY_TOKEN || true
}
trap cleanup_secret EXIT INT TERM

# Run a no-dependency, credential-free audit/installation eligibility check
# *before* asking for a bearer token or executing npm lifecycle scripts.
(
  unset AIVERSE_GATEWAY_TOKEN LOCAL_LLM_API_KEY
  node scripts/mc1/eligibility.mjs
)

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
# Install scripts never receive a live Gateway bearer credential.
# Keep the parent's token available only for the subsequent proof.
(
  unset AIVERSE_GATEWAY_TOKEN LOCAL_LLM_API_KEY
  npm ci
)

echo "Running the disposable Mission Control -> AI-Verse Gateway proof..."
npm run mc1:proof
