# MC1.4 bounded real-runtime trial — decision request (NOT AN APPROVAL)

**Status 26 October 2026: HOLD / PREPARATION ONLY.** No GitHub change, assistant-authored decision, or altered JSON status can release the separate owner audit gate. The independent 5 October recheck allowed a supervised disposable **synthetic-data** test without production data, real credentials or external effects.

## Exact implementation under review

| Component | Revision/evidence |
|---|---|
| Gateway canonical source (accepted) | `aiverse-filmmakers/AI-Verse-Gateway@9c42bdc21073020c3d7194446b0f2ae929eb25a2` |
| OS template used in bounded CI | `aiverse-filmmakers/AI-Verse-OS@d490db4c02e7b72c5cc8eae07080eccfa4dc3989` |
| AI-Verse-owned Mission Control pin | `aiverse-filmmakers/mission-control@570b74195b0837131ae015a06fe466472f12001a` |
| Dashboard current implementation | Check immutable merged HEAD and latest CI **at the time of explicit approval**; all historical refs in `mc1-owner-audit-gate.json` are evidence, not standing approval |
| Already demonstrated | Real OS host adapter + Gateway supported subprocess transport + Mission Control local/aiverse on disposable macOS, but with a synthetic read-only runtime; [PR #36](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/36) remains a draft evidence record |

## Preferred safe scope for a future decision

- A single **human-supervised** temporary OS/Gateway/Mission Control lab, on local loopback only.
- A synthetic, read-only question/answer and unique marker, verified system/workspace and task resolution, followed by lab teardown and unchanged owner state.
- Choose a real **local** OpenAI-compatible runtime endpoint with an actual model ID **only once the owner confirms one exists and is permitted**. Do not assume Codex CLI, a ChatGPT plan, or the current test subprocess is a compliant model service.
- No owner production files, canonical private state, paid provider key, Connections integration, irreversible tools, public listener, Full profile or unattended background task in the initial scope.
- Stop on unexpected model access, cross-workspace data, mutation, external network route, failed authorization, missing credential provenance or failure to remove the lab.

If a remote paid provider or *any real external credential* is proposed later, request a **separate** explicit exception/amended audit verdict first; do not fold it into local runtime approval. Never publish passwords, auth tokens, Gateway bearer or provider keys in the approval decision.

## Independent approval still required

Before changing status from HOLD/BLOCKED, an authorized owner must supply an unambiguous approval naming (a) exact sources, (b) bounded synthetic system/workspace, (c) chosen real runtime/endpoint classification, (d) whether external credentials are forbidden or specifically admitted by a new recheck, (e) temporary lab lifecycle and permitted read-only task, and (f) scope/stop criteria. The maintainer then reviews a **separate** typed owner-admission implementation and tests it against missing, stale, mismatched and tampered approvals. The current `scripts/mc1/eligibility.mjs` only reports readiness and **never authorizes owner execution**.

## Prepared assistant-owned work vs unavoidable human checkpoint

- Already delegated safely: audit review, source and protocol qualification, synthetic matrix CI, security dependency remediation, credential-free readiness checks and failure diagnostics.
- Once explicitly released: implement a scoped owner-admission change in its own PR, prove it fails closed, then provide the one supervised local command. A Mac owner or authorized local operator must verify the installed Gateway/runtime and enter any dedicated test Gateway token **in the hidden local Terminal prompt**, never in chat/GitHub.
- G4.1 closes **only after** evidence that a *real* runtime returned the proof result through canonical Gateway with intended system/workspace, and teardown left the OS unchanged. G4.2 follows after G4.1 acceptance.

**Current accounting:** Dashboard MC1.4 BLOCKED and 11/100; Gateway G4.1/G4.2 not accepted and 8/10 (80%). This is a decision-ready proposal, not a gate release or a request to perform a credentialed test now.
