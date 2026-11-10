/*
 * 3A.30 negative/fixture-only tests of the in-process Mac state machine.
 * This file is compiled ONLY in GitHub CI with AIVERSE_CI_AUTH_FIXTURE.
 * The simulated successes do not invoke LAContext or authenticate a person.
 * No capture, archive, Codex, Gateway or Memory component is imported.
 */
import Foundation

@main
struct NativeReviewTests {
    @MainActor
    static func main() async {
        let alpha = NativeReviewBinding(
            workspaceID: "operator", hostSessionID: UUID(),
            childStartGeneration: 11)
        let sameWorkspaceDifferentSession = NativeReviewBinding(
            workspaceID: "operator", hostSessionID: UUID(),
            childStartGeneration: 11)
        let sameSessionNewProcess = NativeReviewBinding(
            workspaceID: "operator", hostSessionID: alpha.hostSessionID,
            childStartGeneration: 12)
        let beta = NativeReviewBinding(
            workspaceID: "film", hostSessionID: alpha.hostSessionID,
            childStartGeneration: 11)
        let invalid = NativeReviewBinding(
            workspaceID: "../film", hostSessionID: UUID(),
            childStartGeneration: 1)
        let missingChild = NativeReviewBinding(
            workspaceID: "film", hostSessionID: UUID(),
            childStartGeneration: 0)

        precondition(alpha.isWellFormed)
        precondition(!invalid.isWellFormed && !missingChild.isWellFormed)
        let gate = NativeOwnerReviewState()
        precondition(gate.fixtureBegin(alpha) == nil, "unselected review must deny")
        gate.selectHostBinding(invalid)
        precondition(gate.fixtureBegin(invalid) == nil, "path-like scope must deny")
        gate.selectHostBinding(alpha)

        // Positive synthetic review is deliberately *not* actual OS consent.
        guard let first = gate.fixtureBegin(alpha) else { fatalError("fixture start") }
        precondition(gate.fixtureBegin(alpha) == nil, "parallel attempts must deny")
        precondition(gate.fixtureComplete(first, accepted: true))
        precondition(!gate.fixtureComplete(first, accepted: true),
                     "same review ticket cannot be replayed")
        precondition(gate.observation(for: alpha).reviewedCurrentBinding)
        precondition(!gate.observation(for: beta).reviewedCurrentBinding)
        precondition(!gate.observation(for: sameWorkspaceDifferentSession)
            .reviewedCurrentBinding)
        precondition(!gate.observation(for: sameSessionNewProcess)
            .reviewedCurrentBinding)
        precondition(!gate.authorizeConversationCapture())
        let observed = gate.observation(for: alpha)
        precondition(!observed.captureAuthorized && !observed.hostOriginAttested)
        precondition(!observed.recordingConsentIssued
                     && !observed.archiveWriteAdmitted
                     && !observed.historyImportAdmitted)
        precondition(gate.fixtureBegin(alpha) == nil,
                     "a reviewed generation cannot be started a second time")

        // Revoking a review blocks both the result and any pending ticket.
        gate.revoke()
        precondition(!gate.observation(for: alpha).reviewedCurrentBinding)
        gate.selectHostBinding(alpha)
        guard let pending = gate.fixtureBegin(alpha) else { fatalError("pending") }
        gate.revoke()
        precondition(!gate.fixtureComplete(pending, accepted: true),
                     "logout must defeat in-flight success")

        // Switching from alpha -> beta -> alpha cannot revive prior review.
        gate.selectHostBinding(alpha)
        guard let staleScope = gate.fixtureBegin(alpha) else { fatalError("stale scope") }
        gate.selectHostBinding(beta)
        precondition(!gate.fixtureComplete(staleScope, accepted: true))
        guard let betaTicket = gate.fixtureBegin(beta) else { fatalError("beta") }
        precondition(gate.fixtureComplete(betaTicket, accepted: true))
        gate.selectHostBinding(alpha)
        precondition(!gate.observation(for: beta).reviewedCurrentBinding)
        precondition(!gate.observation(for: alpha).reviewedCurrentBinding)

        // A different browser session or directly owned child start
        // generation cannot reuse a review, even in the same workspace.
        guard let pendingAlpha = gate.fixtureBegin(alpha) else {
            fatalError("pending alpha")
        }
        gate.selectHostBinding(sameSessionNewProcess)
        precondition(!gate.fixtureComplete(pendingAlpha, accepted: true))
        guard let newChild = gate.fixtureBegin(sameSessionNewProcess) else {
            fatalError("new child")
        }
        precondition(gate.fixtureComplete(newChild, accepted: true))
        precondition(!gate.observation(for: alpha).reviewedCurrentBinding)
        precondition(gate.observation(for: sameSessionNewProcess)
            .reviewedCurrentBinding)
        gate.selectHostBinding(sameWorkspaceDifferentSession)
        precondition(!gate.observation(for: sameSessionNewProcess)
            .reviewedCurrentBinding)
        guard let newSession = gate.fixtureBegin(sameWorkspaceDifferentSession) else {
            fatalError("new browser session")
        }
        precondition(gate.fixtureComplete(newSession, accepted: true))
        precondition(!gate.observation(for: alpha).reviewedCurrentBinding)

        // A canceled or failed LocalAuthentication evaluation cannot
        // be upgraded by replaying its original successful callback.
        gate.revoke()
        gate.selectHostBinding(alpha)
        guard let canceled = gate.fixtureBegin(alpha) else { fatalError("cancel") }
        precondition(!gate.fixtureComplete(canceled, accepted: false))
        precondition(!gate.fixtureComplete(canceled, accepted: true))
        precondition(!gate.observation(for: alpha).reviewedCurrentBinding)

        // ContinuousClock expiration is monotonic. No wall-clock injection
        // and no reuse after a timed-out review, even if scope still matches.
        let short = NativeOwnerReviewState(lifetime: .milliseconds(15))
        short.selectHostBinding(beta)
        guard let expiring = short.fixtureBegin(beta) else { fatalError("timeout") }
        precondition(short.fixtureComplete(expiring, accepted: true))
        try? await Task.sleep(for: .milliseconds(35))
        precondition(!short.observation(for: beta).reviewedCurrentBinding)
        precondition(!short.fixtureComplete(expiring, accepted: true))
        precondition(!short.authorizeConversationCapture())

        // Even with a simulated local review, this state machine
        // permanently denies production capture.
        for _ in 0..<128 {
            let next = NativeReviewBinding(workspaceID: "film",
                hostSessionID: UUID(), childStartGeneration: 99)
            gate.selectHostBinding(next)
            let ticket = gate.fixtureBegin(next)!
            precondition(gate.fixtureComplete(ticket, accepted: true))
            precondition(!gate.authorizeConversationCapture())
            gate.revoke()
        }
        print("PASS: 3A.30 in-process macOS review fixture, replay/session/child/scope/revoke/expiry all denied for capture")
    }
}
