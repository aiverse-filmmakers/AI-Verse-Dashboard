/*
 * Persistent Chats 3A.32: MACOS CI-ONLY XPC code-signing peer fence.
 *
 * Compiled exclusively with -D AIVERSE_CI_AUTH_FIXTURE and run only in
 * disposable macOS GitHub CI. This MUST NOT be linked into any installed
 * Dashboard, Gateway or Codex component. There is NO issuer of recording,
 * archive-writing, Memory, replay, or event-level authorization.
 *
 * Apple NSXPCConnection.setCodeSigningRequirement asks the OS to check
 * the peer's executable. User-supplied PID, UUID, workspace label,
 * browser cookie, stdout or JSON may NEVER substitute for this check.
 */
#if AIVERSE_CI_AUTH_FIXTURE
import Foundation
import Darwin

@objc protocol AIVerseDeniedXPCReviewProbe {
    func attemptReview(_ claimedMessage: String,
                       withReply reply: @escaping (Bool) -> Void)
}

final class AIVerseDeniedXPCSink: NSObject, AIVerseDeniedXPCReviewProbe {
    private let lock = NSLock()
    private var count = 0

    var receivedCount: Int {
        lock.lock()
        defer { lock.unlock() }
        return count
    }

    func attemptReview(_ claimedMessage: String,
                       withReply reply: @escaping (Bool) -> Void) {
        // Even if this callback is ever accidentally exposed, it grants
        // nothing and cannot accept caller-supplied identity or consent.
        lock.lock()
        count += 1
        lock.unlock()
        reply(false)
    }
}

final class AIVerseXPCPeerDenyBoundary: NSObject, NSXPCListenerDelegate {
    enum Policy {
        case productionUnconfigured
        case isolatedImpossibleSignerFixture
    }

    let sink = AIVerseDeniedXPCSink()
    private let policy: Policy
    private let lock = NSLock()
    private var configuredConnections = 0
    private var refusedConnections = 0

    init(_ policy: Policy = .productionUnconfigured) {
        self.policy = policy
        super.init()
    }

    var configuredCount: Int {
        lock.lock()
        defer { lock.unlock() }
        return configuredConnections
    }

    var refusedCount: Int {
        lock.lock()
        defer { lock.unlock() }
        return refusedConnections
    }

    // This property is deliberately immutable and ALWAYS false even
    // if the XPC peer identity policy is configured. Code signing
    // attests executable provenance, not user approval to record.
    var recordingAuthorized: Bool { false }
    var hostOriginAttested: Bool { false }
    var eventAdmissionEnabled: Bool { false }

    func listener(_ listener: NSXPCListener,
                  shouldAcceptNewConnection connection: NSXPCConnection) -> Bool {
        let env = ProcessInfo.processInfo.environment
        guard case .isolatedImpossibleSignerFixture = policy,
              env["CI"] == "true",
              env["AIVERSE_MACOS_XPC_DENY_FIXTURE"] == "1",
              env["AIVERSE_MACOS_OWNER_AUTH_PREVIEW"] == nil,
              isatty(STDIN_FILENO) == 0 else {
            lock.lock()
            refusedConnections += 1
            lock.unlock()
            connection.invalidate()
            return false
        }

        // A deliberately UNMATCHABLE Apple identity in a headless
        // GitHub runner. Never substitute a team ID from an env var or
        // caller-controlled request, and do not consider this a real
        // application signing-policy configuration.
        connection.setCodeSigningRequirement(
            "anchor apple and identifier \"com.apple.aiverse.never-signed-ci-fixture\""
        )
        connection.exportedInterface = NSXPCInterface(with: AIVerseDeniedXPCReviewProbe.self)
        connection.exportedObject = sink
        lock.lock()
        configuredConnections += 1
        lock.unlock()
        connection.resume()
        return true
    }
}
#endif
