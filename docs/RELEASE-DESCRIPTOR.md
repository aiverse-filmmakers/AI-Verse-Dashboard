# Release Descriptor Maintainer Handoff

`release/component-release.json` is the owner-local release metadata record for AI-Verse Dashboard. The owner-local gate is `.github/workflows/release-descriptor.yml`, and its designated native workflow is `.github/workflows/ci.yml` (`Dashboard CI`).

The descriptor is pinned to the exact T2 candidate revision `bd26986e202d4b911d0c5f64659db71363bfccfa`, whose native Dashboard CI run `37859693102` passed. The descriptor remains `candidate`: native CI success proves owner-local candidate fitness only. No admitted Full component revision exists, so this metadata does not make Dashboard part of an accepted Full release.

The gate must find a successful native workflow run whose `head_sha` equals `descriptor.revision` exactly. Do not substitute current branch health, a later commit, or a latest-success result. Missing, inaccessible, malformed, mismatched, or unsuccessful evidence fails closed.

A pinned candidate revision remains valid after later metadata-only maintainer commits unless component code or the designated native workflow contract changes.

This record has owner-local metadata authority only. It cannot qualify or modify the AI-Verse Distribution component set, admit an Agent or Full release, publish a member feature-release record, grant permissions, change scope/direction ownership, enable a disabled component, expose a remote listener, or report live-health truth.
