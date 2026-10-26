# AI-Verse maintained MC1 routing — 26 October 2026

The operator explicitly directed AI-Verse to maintain and qualify this dependency
in its own repositories without waiting for third-party acceptance. This amends
the earlier proposal's requirement for an upstream-accepted routing revision.

- Source: https://github.com/aiverse-filmmakers/mission-control
- Immutable revision: `570b74195b0837131ae015a06fe466472f12001a`
- Base: `5483a0e1eef15b467c167e95796791112cedbb7c`, the previously audited version.
- Source delta: three lines preserving explicit local-provider prefixes. Added
  focused regression coverage and provenance; original MIT license retained.
- Local routing regression: **11/11 passed** on macOS.
- Local Dashboard build and suite: **passed** (87 passed, one existing skip).
- Disposable macOS HTTP composition: **passed** using genuine `local/aiverse`,
  exact Gateway `9c42bdc21073020c3d7194446b0f2ae929eb25a2`, authenticated
  preflight, system/workspace binding, unique response marker and cleanup.
- Evidence: [sanitized Mac result](evidence/mc1-owned-routing-macos-2026-10-26.json).

The synthetic harness uses the real Gateway server and a deterministic fixture
host. It proves routing and transport on this Mac, but does not establish a real
installed OS/runtime acceptance or promote a member release. The guard retains
the separate owner-runtime gate. The next Gateway step is our own bounded G4.1
OS/runtime qualification; no Builderz review, merge or acceptance is a dependency.

Run the disposable proof after `npm ci && npm run build` with
`CI=true AIVERSE_CI_GATEWAY_SOURCE=/path/to/exact/gateway node scripts/mc1/ci-synthetic-proof.mjs`.
This creates synthetic roots and credentials, uses the immutable owned pin, and
removes the lab. It must never import an owner Gateway token. The CI flag selects
the constrained synthetic harness; it does not turn the fixture into a real-owner
acceptance. Existing production-owner proof remains fail-closed.

Rollback means reverting the Dashboard pin and owned-source change together;
the original pin remains blocked for real owner routing. No external-repository
work or dependency update is needed to use this maintained revision.
