# MC1 disposable Mac real-model acceptance

**Result: PASSED for the explicitly approved standalone local-model scope.**

[Machine-readable evidence](evidence/mc1-real-model-macos-2026-10-26.json) records
the actual run on the operator's Mac, exact tested code revisions, Qwen model
digest and all asserted outcomes. This is a real Ollama/Qwen model response,
not the deterministic or read-only subprocess fixture used by earlier proofs.

## Fixed MC1.4 acceptance

| Requirement | Observed evidence |
| --- | --- |
| Real task through canonical Gateway | Existing pinned Mission Control dispatched `local/aiverse` through Gateway's OpenAI-compatible runtime to Qwen3 0.6B |
| Real installed OS host | Public OS exact commit exported to a disposable standalone installation; canonical setup and doctor ready; actual `ai-verse-os:host` context read succeeded |
| Intended system/workspace | `mc1-local-real` / `operator`; invalid workspace refused |
| Result returns to Mission Control | Task resolution contained its unique proof marker |
| Authentication | Missing and wrong Gateway bearer requests returned 401 |
| No domain mutation | Zero requests reached the effect dispatcher; canonical trial OS fingerprint unchanged |
| Disposable state | Mission Control/Gateway/OS lab removed after drain; dedicated Ollama service subsequently stopped and temporary app/model downloads removed |
| Credentials and ownership | Fresh in-memory test bearers only; no personal token, private OS import, paid key, cloud model or Mission Control canonical truth |

The local model is Ollama 0.40.11 with `qwen3:0.6b`, digest
`7df6b6e09427a769808717c0a93cadc4ae99ed4eb8bf5ca557c90846becea435`.
The recorded Dashboard source is `f09540d43a5935e674c66e600f1e33303d22bad0`;
Gateway source is `81d49a04c14caf2429cc0acd3a77f1072a1465f0`.

## Failures found and resolved

The first attempt stopped after Gateway's routine conversation-summary path
reached the additional experiment dispatch guard. No write reached the OS.
The experiment now intersects real owner authorization with its stricter deny
policy before dispatch. One write authorization was denied in the successful
run; zero effect dispatches occurred. This is recorded explicitly, not hidden
as a successful Memory write. The test does not qualify optional Memory
persistence, background learning or tool execution.

Windows CI also found that Git CRLF checkout changed the raw approval-record
digest. Verification now normalizes line endings while retaining the exact
scope hash and parsed-field equality; altered approval content still rejects.
The updated full local Dashboard suite passed 95 tests with one existing skip.
Gateway PR #78's complete native/composed CI is green, as is its 245-test local
Mac check. Inspect the final PR heads for current hosted checks before merge.

## Execution-path amendment and limits

The operator delegated the proposed setup, code and test explicitly. The dedicated
runner automates the original human token step by generating a new temporary
Gateway bearer instead of asking for a personal credential. It reuses the same
MC1 proof, real task dispatch and fixed acceptance; no CI impersonation, model
alias workaround or replacement Gateway engine is used.

This evidence accepts the disposable standalone OS/local-model path only. The
existing private Core installation was not tested, and the generic `mc1:local`
owner path remains blocked. No member release, Full profile, cloud credentials,
Data/Brain/Memory completeness or G4.2 qualification is inferred. The expiring
trial scope is not permanent production authorization.

After the tested owner changes and this evidence are accepted, Dashboard
MC1.4 (3 points) and MC1.5 (1 point) bring the tracker to **15/100**. The next
Dashboard task is existing MC2.1. System separately records Gateway G4.1 and
retains G4.2 as the next release-qualification slice. Until the PRs merge,
those are proposed tracker updates rather than changes to main's accepted count.
