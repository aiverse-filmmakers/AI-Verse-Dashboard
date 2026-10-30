# MC2.2: Gateway source, security and release acceptance checkpoint

**31 October 2026, Dashboard-only implementation review.** Canonical roadmap: [Mission Control execution tracker](MISSION-CONTROL-EXECUTION-TRACKER-2026-09-15.md). Operator-approved review method: [Code Review workflow](REVIEW-ACCEPTANCE-WORKFLOW-2026-10-30.md). This packet is **evidence**, not an independent human audit, formal 3-point acceptance, member distribution or private Mac release.

## Work merged into Dashboard main

Six bounded source changes were extracted from still-draft PR #42 or added to harden them, then independently CI-tested as exact-head PRs, reviewed by operator-delegated AI Code Review and merged into `main`. These are recorded in MC2.2's tracker section:

- **#46** host-only Gateway transport: bounded requests, canonical system/workspace/run binding, bearer confidentiality and SSE.
- **#48** stream-bound JSON byte limit; validation against dishonest `Content-Length`.
- **#49** native host Gateway bridge and method registry; review identified and fixed stale credentials after identical system ID/root unregister-re-register using a registry-wide monotonic lease.
- **#51** native-only Gateway injection into existing HTTP POST /rpc behind bearer and loopback Origin; the old stacked #50 was replaced/closed, not lost.
- **#52** authenticated WebSocket run events with workspace-switch cancellation/epoch and no native mapping default-deny; malformed authenticated JSON frames no longer crash host. Initial tests uncovered unstable stream timing, replaced with deterministic deferred events.
- **#53** browser DashboardClient facade using /rpc, typed status/model/run/control calls, no live effect cache and A→B→A stale-result rejection.

## Risk-oriented review matrix

| Risk | Scoped evidence | Remaining gate |
| --- | --- | --- |
| Browser-supplied credentials/URLs/roots | Native injected binding, loopback-only upstream transport, no provider tokens in returned run/events; negative tests | Installed owner session and credential grant are not here |
| System/workspace cross talk | SystemRegistry root/lease generation, scoped run record, WS bound system, epoch fencing on switch, wrong-system HTTP reject | Real multi-system installed owner composition, live Mac |
| Unauthorized controls | Native `allowRunCancel` and separate `allowRunPauseResume` opt-ins; run/session validation before control POST | Actual OS owner consent and final-edge Gateway permission |
| Oversized/untrusted inputs | Bounded POST, incremental JSON byte cap, SSE frame cap and allowlisted events, strict null/array socket rejection | Real load/long-history tests and production configuration |
| Retries and recovery | Stable idempotency/operation IDs and no cached live actions, stale-result rejection | Actual persisted conversation lifecycle, replay/cursor/race proof |
| Model and cost truth | Only canonical virtual `aiverse` status is shown; upstream usage not billed-cost truth | Physical provider/model choice requires Gateway/Connections owner contract; Token cost projection |
| UI user journey | Typed RPC facade and authenticated network paths exist, separate from preview | Real Personal Chat, error/recovery UX and full paired browser app acceptance |
| Release | CI on exact PR heads **and mainline push checks** succeeded for all six slices | Private owner Mac/Distribution admission not observed |

## Post-merge mainline CI verification

The actual GitHub Actions `push` workflow runs on `main` were read back through the GitHub Actions repository runs API, not inferred from PR success alone.

| Merged PR | Main commit | Push Dashboard CI |
| --- | --- | --- |
| #46 | `21ddcaf2` | [41139184020](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/41139184020), successful |
| #48 | `9ce334bb` | [41139869093](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/41139869093), successful |
| #49 | `79a5c9f9` | [41140283292](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/41140283292), successful |
| #51 | `ffa6062f` | [41140448680](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/41140448680), successful |
| #52 | `1c46933a` | [41140874158](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/41140874158), successful |
| #53 | `728d8c6b` | [41141101156](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/41141101156), successful |

These push results close the **remote source CI** check only, not real owner-installed integration, milestone acceptance, or release qualification.

## Required next MC2.2 acceptance action

1. Build one **new, bounded and disposable** CI proof with canonical Gateway **actual owner source**, not a fake upstream HTTP server, connecting the now-merged Dashboard native transport + authenticated HTTP and WS events. Preserve Gateway-owned persistence and principal/workspace isolation, including denied controls.
2. For each missing accepted owner capability (approval, history, physical provider), either pin a mainline owner API or mark blocked. Do not declare draft Gateway #80's history endpoints released.
3. Prove full MC2.2 typed client contract at an immutable head, run negative/security review and document actual source SHA, CI run, AI review provenance and merge; award the original MC2.2 **3 points only if all its acceptance conditions are met**. Formal accepted progress remains **17/100** until then.
4. Continue the operator's approved Personal-first real chat and workspace/Canvas milestones from the same roadmap. Do not reimplement Gateway, OS, Data, credentials, Brain, Skills or Token inside Dashboard.
5. Real Mac private files, owner permission grants, paid model consent and release distribution remain separate local/owner acceptance gates, not CI green conclusions.

**Provenance limit:** The same assistant implemented and reviewed these PRs under the requested Code Review skill. This is an AI-assisted self-review with source/CI checks, not an independently authorized security review or a GitHub `APPROVE` vote. Full PR #42 remains a substantial unmerged draft and must still be split and reviewed by dependency-safe portions.

## Progress figures

- Historical original MC formal **17/100 accepted**, MC2.2 pending **0/3**, next possible **20/100**.
- Provisional GitHub/browser engineering **47/100**, separately scored; Chat/Gateway **11/15** in last reviewed draft ledger, not recomputed to a larger number automatically.
- Personal-first 10 chapters / 40 milestone count unchanged. No private production Mac percentage is known.
