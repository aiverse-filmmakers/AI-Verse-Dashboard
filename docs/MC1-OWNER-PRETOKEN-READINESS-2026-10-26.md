# MC1 owner readiness — pre-token and real-runtime handoff

**26 October 2026 — Status: HOLD; no MC1.4 audit-gate release or production-runtime sign-off.**

This note follows the two-file [Dashboard PR #36](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/36) evidence packet. That PR was inspected as a **draft** and must not be silently promoted to approved/merged. Its Mac result is a *successful synthetic read-only OS-host/subprocess transport proof*, not an actual provider-model test. The inspected Mac had no Gateway at the default home/port; an independently installed custom Gateway was not ruled out.

## Credential-free first check

Run `npm run mc1:eligibility` (or `node scripts/mc1/eligibility.mjs` without dependencies). The check reads only the local gate record and **sanitized** Gateway installation metadata; it does not fetch credentials, connect to a provider or install dependencies. Status code 2 means **do not enter a bearer token**.

`npm run mc1:local` now executes the same preflight before prompting for a token, calling `npm ci` or bootstrapping Mission Control. While MC1.4 remains paused, the script returns `MC1_GATE_BLOCKED`. Even a manually changed gate JSON marked `RELEASED` cannot activate owner execution: an independently reviewed owner admission path is not yet implemented, and `assertMc1RoutingGate` also continues to deny non-synthetic runs. This is a deliberate fail-closed design.

## Supported runtime discovery / setup (no credentials supplied here)

Gateway's documented non-test adapter kinds are:

- **`openai-compatible`** — requires a real compatible runtime endpoint, an explicit model ID, and optionally an authorized upstream API key held only in an environment variable named in `api_key_env`. A Codex subscription, logged-in desktop client or executable does **not** imply an API key or compatible provider service.
- **`json-subprocess`** — requires a separately reviewed executable that actually implements `ai-verse-gateway-runtime/1.0` request/response envelopes. The existing `ci-readonly-runtime.mjs` is a synthetic test fixture and cannot count as a real AI model.
- **`deterministic`** — fixture-only; cannot satisfy a real-runtime acceptance requirement.

Do **not** create a new provider credential, start an external server, use personal OS data, or run a real provider test on the strength of the October 5 conditional audit verdict alone. After explicit approved scoped gate release, discover any custom `AIVERSE_GATEWAY_HOME` and `AIVERSE_GATEWAY_URL` on the owner's Mac rather than assuming the default. Verify actual OS root, workspace, runtime and loopback binding, and preserve separate OS/Brain/Memory/Connections authority.

## Exact acceptance prerequisites

1. Record an explicit **owner-approved, bounded MC1.4 audit release** against the current Dashboard, Gateway, OS and AI-Verse-owned Mission Control source revisions. The current [independent recheck](https://github.com/aiverse-filmmakers/AI-Verse-System/blob/main/docs/public-beta-audit/repairs/FINAL-INDEPENDENT-RECHECK-2026-10-05.md) allows supervised *disposable synthetic* dogfood, without production data, real credentials or unattended actions. It is not automatic permission for a credentialed model service.
2. Review and implement a **non-synthetic owner-admission path** bound to that release, exact source pins, system/workspace/runtime and loopback endpoint, with negative/stale/failed-approval tests. The JSON blocked record is informational and is not an authorization primitive.
3. Install or discover Gateway in a disposable supported real OS setup with a separately authorized supported **real** runtime. Confirm read-only status and doctor before any Mission Control dispatch, and do not put bearer tokens in shell history, GitHub, logs, or chat.
4. Only then perform supervised disposable real-runtime Mission Control acceptance with the existing hidden-token runner; capture sanitized result, isolation and cleanup. After verification, Dashboard MC1.4 and Gateway G4.1 may be independently evaluated. G4.2 and Distribution qualification remain separate.

## Security advisory

The version observed in draft PR #36 (locked Zod 4.6.2, [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)) was **remediated** in merged Dashboard [PR #38](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/38): locked Zod 4.6.6, bounded handshake collections, and passing Windows/macOS/Ubuntu CI. This is evidence of dependency remediation, **not** proof that no other application endpoint can be abused.

## Runtime readiness is configuration review, not model qualification

`mc1:eligibility` now reports `runtime_configuration` and `provider` categories only; no local OS root, executable path, model ID, endpoint or provider secret is returned. `configured_unverified` means *syntax plausibly matches* a supported runtime; it does not establish the executable or AI model exists, is reachable, or is authorized. `test_only` includes Gateway's deterministic mode and known synthetic subprocess fixtures. `external_scope_required` explicitly withholds acceptance until separate network/credential scope approval.

See the [non-executable, scoped owner decision checklist](MC1-REAL-RUNTIME-SCOPED-APPROVAL-CHECKLIST-2026-10-26.md). **No approval is inferred** from the existence of these documents.

**Accounting:** Dashboard 11/100, Gateway 8/10, MC1.4 BLOCKED, G4.1 and G4.2 UNACCEPTED; no member or Distribution promotion.
