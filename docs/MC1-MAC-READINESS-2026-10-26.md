# MC1 Mac integration result and remaining acceptance work

Recorded 26 October 2026. This is additional preparation evidence, not a gate release.

## Verified Mac result

The existing `scripts/mc1/ci-synthetic-proof.mjs` completed successfully on macOS
using `AIVERSE_MC1_COMPOSITION_VARIANT=os-host-runtime`. The proof ran from a
temporary source checkout with only PATH, HOME and TMPDIR inherited, plus its
documented synthetic configuration. No private OS files or owner credentials
were supplied. The runner generated disposable Gateway and Mission Control
credentials and used its existing cleanup path; the process exited zero.

[Sanitized evidence](evidence/mc1-os-host-subprocess-macos-2026-10-26.json)
records the exact revisions. Dashboard build passed. The focused MC1 suite passed
9/9 with temporary localhost-listener permission. An initial sandbox-only run
failed its listener test with EPERM; the same test passed with that permission.

This verifies actual Mission Control HTTP dispatch through canonical Gateway,
the real pinned OS host and the supported JSON subprocess transport on a Mac.
The subprocess implementation remains a synthetic, read-only runtime. It does
not establish a production model, installed personal OS, MC1.4 or G4.1 acceptance.

Reproduce in a disposable checkout after locked dependency installation/build:

```sh
CI=true \
AIVERSE_CI_GATEWAY_SOURCE=/path/to/exact/gateway-source \
AIVERSE_CI_OS_SOURCE=/path/to/exact/os-source \
AIVERSE_MC1_COMPOSITION_VARIANT=os-host-runtime \
node scripts/mc1/ci-synthetic-proof.mjs
```

The script itself verifies the exact source pins. Never supply an owner token to
this synthetic harness. Setting CI here selects the existing explicitly allowed
synthetic profile; it must not be used to disguise an owner installation.

## Why the real-user command cannot be the next human step

At reviewed Dashboard revision `bf519379ea141d77e182e75ef51872f16750a905`,
`assertMc1RoutingGate` in `scripts/mc1/lib.ts` always throws for non-synthetic
execution. There is no implemented approved-owner path that a token or a
documentation edit could activate. `run-local.sh` prompts for the token and
installs dependencies before reaching that rejection. Asking the operator to
run it now cannot complete MC1.4.

Read-only inspection on this Mac found no Gateway home at the documented default
`~/.aiverse/gateway` and no listener on its default port 8787. This does not prove
absence of a custom installation. The project-bound Distribution status reports
a ready Core profile and does not list Gateway among its installed components.

Gateway supports deterministic, OpenAI-compatible and JSON-subprocess runtimes.
A Codex executable alone does not implement the Gateway JSON-subprocess protocol;
do not present existing Codex desktop use as a configured Gateway runtime.

## Next assistant-owned work in the canonical implementation plan

1. Read the current System audit verdict, repair recheck and G4.1 plan. Prepare
   and record a scoped MC1.4 audit decision against exact current sources. The
   earlier controlled-dogfood verdict permits disposable synthetic data, not
   production data or real credentials; any expanded trial needs explicit scope.
2. After the required review, implement the smallest reviewed non-synthetic
   proof admission path. Bind the decision to exact sources, a disposable system,
   its intended workspace/runtime and loopback configuration. Reject absent,
   stale or mismatched approval; retain all current synthetic and routing guards.
   Check eligibility before requesting a token or installing the lab.
3. Discover an existing custom Gateway/runtime configuration if one is declared
   by the operator, or prepare the supported isolated setup. Identify a real
   supported runtime and its authorized authentication method. Do not assume
   Codex subscription login is an OpenAI-compatible API key or invent an adapter.
4. Only after those prerequisites, run the supervised disposable real-runtime
   proof, preserve sanitized evidence and update MC1.4/MC1.5 and G4.1 against
   their existing fixed acceptance. Distribution release remains separate.

## Dependency advisory observed during preparation

Locked installation resolved Zod 4.6.2. `npm audit --json` reported
[GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), high,
covering Zod versions below 4.6.6. Assess exposure and repair in the appropriate
bounded change before owner-trial approval. This note is an observed advisory,
not a proven exploit in this application's deployed path. No automatic dependency
fix or lockfile change was made during evidence collection.

Dashboard remains 11/100; Gateway remains 8/10. No gate, release or pin is promoted
by this evidence packet.
