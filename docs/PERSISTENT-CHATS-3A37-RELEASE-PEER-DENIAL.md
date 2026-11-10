# Phase 3A.37: production-style Developer ID XPC peer denial, CI only

**Scope:** isolated, ad-hoc-signed macOS app fixture. No installed Dashboard
identity, Developer ID certificate, genuine signing Team ID, operator consent,
original Codex events, recording, archive or Memory.

The existing 3A.35/3A.36 native app starts a real launchd-managed
`NSXPCConnection` to its embedded helper. The new
`native-macos-release-peer-deny.m` tests a stricter requirement on the
**outgoing connection**:

`anchor apple generic and identifier "com.aiverse.ci-only.persistentchat.actual-xpc-service" and certificate leaf[subject.OU] = "AAAAAAAAAA"`

`AAAAAAAAAA` is a deliberately placeholder Team ID for a **negative CI
test**. It is not a valid reviewed production identity or a configuration
mechanism. The requirement is parsed by Apple's
`SecRequirementCreateWithString`, applied with
`NSXPCConnection.setCodeSigningRequirement` BEFORE resume, and a
synthetic probe is sent. To pass, macOS must report a transport error
instead of forwarding a successful reply. A timeout, malformed requirement
or callback accepted by the ad-hoc peer is not counted as a pass.

The embedded helper's **ad-hoc** signature cannot satisfy the Apple
trust anchor and certificate requirement. This proves a negative
enforcement property, not successful production-signature acceptance.
The reciprocal incoming peer requirement on an actual installed
Developer ID-signed service has not been proved.

**Apple references:** [XPC peer code-signing requirement](https://developer.apple.com/documentation/foundation/nsxpcconnection/setcodesigningrequirement(_:)),
[Designated requirement syntax TN3127](https://developer.apple.com/documentation/technotes/tn3127-inside-code-signing-requirements/).

**CI result:** [Apple macOS runner #42886142214](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/42886142214),
PASS on code head `1cbe89ce48b3cca2e79e7281e6d022a892f3f0dd`.
This is the exact tested source commit; later documentation is not
represented as the same tested head.

The next gate is a real app build with reviewed identifier, hardened
runtime and an Apple-issued Developer ID/Team identity, both ends
verified, with actual macOS installation and user acceptance. The
current CI XPC process must not be used as a recording consent issuer.
