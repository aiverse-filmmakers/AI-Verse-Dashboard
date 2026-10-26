# MC1 bounded AI-Verse OS host + subprocess runtime qualification

**Date:** 2026-10-26
**Status:** Hosted synthetic integration qualified on pull request — **NOT MC1.4 owner acceptance**

## Reused acceptance surfaces

The existing canonical Gateway, Dashboard MC1 proof and exact AI-Verse-maintained Mission Control routing dependency remain unchanged. We did not substitute a new Mission Control installation mechanism.

| Owner | Exact source |
| --- | --- |
| AI-Verse Gateway | `aiverse-filmmakers/AI-Verse-Gateway@9c42bdc21073020c3d7194446b0f2ae929eb25a2` |
| AI-Verse OS | `aiverse-filmmakers/AI-Verse-OS@d490db4c02e7b72c5cc8eae07080eccfa4dc3989` |
| Mission Control (AI-Verse-owned routing) | `aiverse-filmmakers/mission-control@570b74195b0837131ae015a06fe466472f12001a` |

## Six verified preparation/qualification tasks

1. **Pin and verify the real OS source.** The hosted test checks out the exact OS commit and compares its Git HEAD before copying it to the disposable `synthetic-system` root. It never uses the owner machine's OS installation.
2. **Use the real OS-owned host adapter.** Gateway `setupComponent` automatically selects `scripts/ai_verse_host_adapter.py`; it calls `describe()`, checks `adapter_id=ai-verse-os:host`, `metadata.canonical_state_owned=false` and support for `read_context`.
3. **Exercise real read-only host operations.** The test calls OS `read_context(operator)` and rejects an invalid `workspace:invalid!` scope. A successful Gateway setup is not mistaken for a validated host if these fail.
4. **Exercise the supported subprocess runtime.** Instead of the previous Gateway `deterministic` path, Gateway runs its actual `json-subprocess` runtime transport with a disposable credential-free, tool-free test implementation of the runtime protocol. This proves the supported subprocess envelope and real HTTP dispatch; it **does not** claim a real model or production agent was tested.
5. **Retain negative isolation and authentication coverage.** Hosted CI only permits the subprocess mode when `CI=true`, `AIVERSE_MC1_CI_SYNTHETIC=1`, `AIVERSE_MC1_CI_OS_HOST=1`, matching exact owned Mission Control pin, `ci-synthetic` system, and a disposable temporary root. The original deterministic fixture variant remains independently exercised. Gateway rejects missing/incorrect bearer tokens; all tests use ephemeral credentials and local loopback.
6. **Run composed evidence and preserve acceptance accounting.** Both hosted Ubuntu variants and the Dashboard Node 22 Windows/macOS/Ubuntu matrix must be green before code merge. The proof demands `local/aiverse`, correct exact pins, canonical system/workspace binding, real Mission Control task resolution, unique marker and disposable cleanup.

Hosted PR-head CI:
- [MC1 Hosted Synthetic Composition run 40343863889](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40343863889) — **both fixture and real-OS-host/subprocess variants passed**.
- [Dashboard CI run 40343864142](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40343864142) — **Windows/macOS/Ubuntu passed**.

## Limits and next gate

This qualifies a **real pinned OS host** and **a supported local Gateway runtime adapter** in a disposable CI environment, not an owner's installed canonical OS, not a production LLM, and not true OS-backed end-to-end action execution. The runtime used for this proof is a deliberately synthetic read-only subprocess; no unrestricted tools or irreversible actions were requested.

Dashboard MC1.4 remains `BLOCKED` by the separate independent whole-system audit decision. G4.1 and G4.2 remain unaccepted. Neither these six pre-gate tasks nor successful hosted CI increases the Gateway's official **8/10 (80%)** checkpoint or the Dashboard's **11/100** points.

Before owner acceptance: record the scoped audit-gate release in the canonical Dashboard/System trackers, verify the intended real OS/runtime and workspace bindings on a disposable supervised installation, execute the existing hidden-token local proof, and preserve sanitized evidence. No public or Distribution release promotion is authorized.
