# Owner-approved local Qwen trial — 26 October 2026

The operator explicitly approved the proposed Ollama/Qwen setup, required test
code and disposable local real-model test with “k do it all by yourself”. The
approval follows the concrete proposal of a small local Qwen model, no paid API
keys and no private OS files. The source reference and exact bounded scope are
recorded in `mc1-local-model-trial-2026-10-26.json`.

This authorizes the dedicated `npm run mc1:local-model` experiment. The generic
`mc1:local` owner path and global audit gate remain blocked. No production profile,
private installation, remote provider, credentials, tool effects or release is
admitted by this exception. It expires at the timestamp in the scope record.

## Source and admission review

The new admission implementation pins the approval-record digest and checks
expiry, exact model/provider/system/workspace, loopback origins, authenticated
Gateway configuration, canonical OS host command and temporary-root containment.
An altered mutable gate JSON or an environment flag alone cannot admit a trial.
The existing synthetic CI guard and production rejection are retained.

The runner requires exact clean Gateway source and the exact public OS commit.
It exports only tracked public OS source into a fresh temporary system, runs the
canonical standalone OS setup and doctor, then the canonical Gateway install,
setup and doctor. No personal installation or credential is copied. The real
local model is checked against its downloaded digest before dispatch.

The same Mission Control proof and pinned AI-Verse routing dependency are used.
The Gateway and Mission Control credentials are newly generated for the lab;
package installation subprocesses do not receive them. Missing/wrong Gateway
bearers must be rejected. A separate experiment guard aborts any OS mutation
attempt; it preserves real host context reads and does not simulate model output.
Any guard activation fails the experiment. The canonical OS fingerprint must
remain unchanged, and the lab is removed before success is reported.

## Verification before the real-model dispatch

The Dashboard build and 15 focused admission/preflight checks passed locally.
The new negative checks cover wrong system/workspace, public bind, remote runtime,
different model, provider key configuration, deterministic runtime, disabled auth,
expired or changed approval, symlinked approval and non-temporary OS roots.
Existing default pre-token readiness continues to reject owner execution.

Gateway PR #78 corrects a discovered upstream-model routing defect: the public
Gateway model `aiverse` must resolve to its configured real provider model.
Its full local Mac check passed 245 tests; Ubuntu/Windows and composed CI passed
at the inspected head, with hosted Mac jobs still queued at that checkpoint.
The exact candidate revision is pinned in this experiment record. This experiment
does not promote the candidate into a member release.

## Execution and acceptance

Run only with the approved local Ollama service/model already available, the
exact clean Gateway checkout and the exact public OS checkout:

```sh
AIVERSE_MC1_GATEWAY_SOURCE=/path/to/gateway-source \
AIVERSE_MC1_OS_SOURCE=/path/to/os-source \
npm run mc1:local-model
```

Do not supply a personal Gateway token, set CI flags, edit the scope JSON or
replace the provider with a cloud model. Stop on wrong identity, failed model
digest, authentication failure, effect attempt, canonical mutation or cleanup
failure. The experiment owns no model-service supervision: its caller starts
and stops the separately approved loopback Ollama service and temporary model
store. The resulting sanitized evidence must record actual model/runtime and
doctor results, exact source revisions, marker, isolation and cleanup.

This document releases only execution of this experiment. MC1.4/MC1.5/G4.1 still
require review of the resulting evidence against their fixed acceptance. G4.2
and Distribution admission remain separate.
