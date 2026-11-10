/*
 * 3A.30: in-process macOS device-owner review lifetime, NOT capture consent.
 *
 * The native app that eventually hosts this type must own and authenticate
 * the session + child-process binding itself. This isolated model accepts
 * fixture bindings solely to test races. Its caller supplied identity is
 * NOT trusted provenance, it issues no bearer/signature/IPC token, and it
 * has NO recording, archive, Codex-event or Memory admission API.
 *
 * Apple LAContext is used only from manual, interactive macOS execution.
 * CI has only the negative path and separately compiled synthetic tests.
 */
import Foundation
import LocalAuthentication
import Darwin

struct NativeReviewBinding: Equatable {
    let workspaceID: String
    let hostSessionID: UUID
    let childStartGeneration: UInt64

    var isWellFormed: Bool {
        workspaceID.range(
            of: "^(operator|[a-z0-9][a-z0-9-]{0,63})$",
            options: .regularExpression
        ) != nil && childStartGeneration != 0
    }
}

struct NativeReviewObservation {
    let reviewedCurrentBinding: Bool
    let captureAuthorized: Bool = false
    let hostOriginAttested: Bool = false
    let recordingConsentIssued: Bool = false
    let archiveWriteAdmitted: Bool = false
    let historyImportAdmitted: Bool = false
}

@MainActor
final class NativeOwnerReviewState {
    private struct Pending {
        let nonce: UUID
        let generation: UInt64
        let binding: NativeReviewBinding
    }
    private struct Reviewed {
        let binding: NativeReviewBinding
        let generation: UInt64
        let until: ContinuousClock.Instant
    }

    private let clock = ContinuousClock()
    private let lifetime: Duration
    private var generation: UInt64 = 1
    private var selected: NativeReviewBinding?
    private var pending: Pending?
    private var reviewed: Reviewed?
    private var context: LAContext?

    init(lifetime: Duration = .seconds(30)) {
        // A review can never outlive a bounded local lifetime.
        self.lifetime = lifetime
    }

    func selectHostBinding(_ binding: NativeReviewBinding) {
        revoke()
        guard binding.isWellFormed else { return }
        selected = binding
    }

    func revoke() {
        generation &+= 1
        pending = nil
        reviewed = nil
        selected = nil
        context?.invalidate()
        context = nil
    }

    private func begin(_ binding: NativeReviewBinding) -> UUID? {
        guard binding.isWellFormed, selected == binding, pending == nil,
            reviewed == nil else { return nil }
        let nonce = UUID()
        pending = Pending(nonce: nonce, generation: generation, binding: binding)
        return nonce
    }

    @discardableResult
    private func complete(_ nonce: UUID, accepted: Bool) -> Bool {
        guard let claim = pending,
            claim.nonce == nonce, claim.generation == generation,
            selected == claim.binding else { return false }
        // Consume a challenge exactly once, including failed approvals.
        pending = nil
        guard accepted else { return false }
        // This is a bounded *local review*, not a recording permission.
        reviewed = Reviewed(
            binding: claim.binding, generation: claim.generation,
            until: clock.now.advanced(by: lifetime)
        )
        return true
    }

    func observation(for binding: NativeReviewBinding) -> NativeReviewObservation {
        guard let held = reviewed, held.binding == binding,
            selected == binding, held.generation == generation,
            clock.now < held.until else {
            // An expired review never becomes valid again even when
            // another caller supplies an earlier wall-clock timestamp.
            if reviewed != nil { reviewed = nil }
            return NativeReviewObservation(reviewedCurrentBinding: false)
        }
        return NativeReviewObservation(reviewedCurrentBinding: true)
    }

    /// Never converts any review or simulated test success into capture.
    func authorizeConversationCapture() -> Bool { false }

    /// Actual Apple policy evaluation, only possible in an interactive
    /// manual preview. Never called by CI, browser, Gateway or the writer.
    func manuallyReviewDeviceOwner(_ binding: NativeReviewBinding) async -> Bool {
        guard ProcessInfo.processInfo.environment["CI"] == nil,
            ProcessInfo.processInfo.environment["AIVERSE_MACOS_OWNER_AUTH_PREVIEW"] == "1",
            isatty(STDIN_FILENO) == 1, isatty(STDERR_FILENO) == 1,
            let nonce = begin(binding) else { return false }
        let fresh = LAContext()
        fresh.touchIDAuthenticationAllowableReuseDuration = 0
        fresh.interactionNotAllowed = false
        context = fresh
        var error: NSError?
        guard fresh.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) else {
            _ = complete(nonce, accepted: false)
            fresh.invalidate()
            context = nil
            return false
        }
        let reason = "Review future-only Codex text for workspace " +
            binding.workspaceID + ". Recording remains disabled."
        let success = await withCheckedContinuation {
            (continuation: CheckedContinuation<Bool, Never>) in
            fresh.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason) {
                allowed, _ in
                continuation.resume(returning: allowed)
            }
        }
        // Actor isolation resumes only after OS evaluation. If a logout,
        // workspace switch or process restart revoked the generation while
        // the prompt was pending, this result is rejected.
        let valid = complete(nonce, accepted: success)
        fresh.invalidate()
        if context === fresh { context = nil }
        return valid
    }

#if AIVERSE_CI_AUTH_FIXTURE
    // Compiled ONLY in a standalone macOS CI test binary. It cannot call
    // LocalAuthentication, and there is still no capture admission.
    func fixtureBegin(_ binding: NativeReviewBinding) -> UUID? {
        begin(binding)
    }
    func fixtureComplete(_ nonce: UUID, accepted: Bool) -> Bool {
        complete(nonce, accepted: accepted)
    }
#endif
}
