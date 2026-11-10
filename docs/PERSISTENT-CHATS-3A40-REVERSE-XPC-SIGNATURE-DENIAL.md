# Phase 3A.40: XPC listener-side peer-signature refusal, CI-only

**Exact tested Dashboard code head:** `a0746a544302311b0ad94c166825e6b760a465a3`.

## Implemented

The 3A.35 disposable native macOS app now embeds **two** actual
launchd-managed `.xpc` helpers. The second, in
`native-macos-inbound-xpc-deny.m`, applies a hardcoded code-signing
requirement in its `NSXPCListenerDelegate` **before** resuming the
incoming connection:

`anchor apple generic and identifier "com.aiverse.ci-only.persistentchat.actual-xpc-owner" and certificate leaf[subject.OU] = "AAAAAAAAAA"`

The placeholder Team ID can **never** be mistaken for a reviewed,
production Apple Developer ID. This test client's signature is **ad-hoc**
only. The second service exports the same minimal denied-only protocol,
but its probe handler would return a distinct
`UNEXPECTED_UNTRUSTED_PEER_DELIVERED` marker if the untrusted call
reached it.

The normal, less restrictive first helper must successfully return its
`CAPTURE_DISABLED` marker before the negative check, as a positive
service-discovery control. The second helper requires that:

1. A separate `codesign --verify --strict -R` check demonstrates the
   ad-hoc client **does not satisfy the exact listener requirement**.
2. The actual attempted `NSXPCConnection(serviceName:)` receives an
   error without delivering a successful reply.
3. On the macOS 26 GitHub runner, the **client-facing** error is
   `NSCocoaErrorDomain` / `NSXPCConnectionInterrupted` (4097).
   Requiring `NSXPCConnectionCodeSigningRequirementFailure` on the
   client side was tested and **failed**: the OS reported 4097 instead.
   We corrected the expected error and paired it with the explicit
   signing mismatch proof. Any other transport error or timeout fails.

**Evidence:** [Apple macOS CI runner](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/42890730321),
PASS on the exact source head above.

## Boundaries

This tests a real XPC listener's **incoming** signer enforcement, paired
with the previously tested outgoing signer requirement. It does not
prove successful communication between two actual Developer ID-signed
production processes. An ad-hoc application signature provides neither
developer identity nor human recording consent. No real Dashboard,
Gateway, Codex turn, provider data, archive or Memory is connected.

The extra helper exists only in the disposable macOS CI bundle, not
in the production TypeScript/Node Dashboard. Do not use its temporary
bundle identifiers or placeholder Team ID in a release.

Apple source: [NSXPCListener peer signing enforcement](https://developer.apple.com/documentation/foundation/nsxpclistener/setconnectioncodesigningrequirement(_:)).
