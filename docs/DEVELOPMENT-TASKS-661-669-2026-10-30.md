# Tasks 661–669: G06.1 safe registered-system and workspace summary

**30 October 2026 | Draft Dashboard PR #42 | G06.1 remains in progress**

This is the second source package within the same fixed G06.1 milestone. It strengthens the authenticated Workspace Status panel without inventing an OS admin capability.

| Task | Change |
|---|---|
| 661 | Inspected the real Dashboard OS Registry `SystemRegistry.listPublic()` and `QueryRouter.system.list`, plus the paired-local-browser exact-method allowlist. |
| 662 | Identified a trust boundary: `system.list` can expose all registered public system labels to a browser paired only to one selected OS. It must remain **denied** to that browser. |
| 663 | Added named, read-only, workspace-scoped `system.registry.summary` to the protocol and QueryRouter. |
| 664 | The host revalidates the selected OS root identity, registered authorization and selected named-workspace existence before returning a summary. |
| 665 | The summary projects **only** selected IDs/scope and counts: registered systems, authorized systems and actual selected-OS workspace count. It never returns other system names, paths, identities, handles, secrets, or workspace names. |
| 666 | Added only the new aggregate query to the paired-local-browser allowlist. Full `system.list` and `workspace.list` remain forbidden. |
| 667 | Added count/scope shape validation to first-party Workspace Status; malformed counts or unapproved system cannot appear healthy. |
| 668 | Added security/unit tests, real paired-local-browser HTTP test, Chromium fixture and native Gateway composition assertions of owner-generated registry aggregate with HttpOnly session boundary and no raw names/paths. |
| 669 | Recorded the distinct G06.1 source evidence in the ledger, kept milestone **in-progress**, and unchanged Chat/overall/formal scores. |

## Acceptance boundaries

This does not support system registration, OS permissions, workspace switching, native setup, or attachment admissions. It is a read-only snapshot of what the trusted selected OS host **actually** knows. The existing five source health observations still query their own canonical owners. The separate optional per-run G06.1 inspector is read-only, strictly run/session-bound and omits raw diagnostics.

**Progress:** Chat **11/15** provisional, overall GitHub/browser **47/100** provisional, formal acceptance **15/100**. G06.1 is **in progress**. No merged/deployed code and no production Mac acceptance.

Next tasks: finish owner-backed Control Center requirements in G06.1 or G06.2 where native contracts exist. Do not introduce a generic action executor or grant model/provider/attachment capability from the browser.
