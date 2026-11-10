/*
 * 3A.32: CI-only OS XPC peer code-signing rejection regression.
 * No installed app signature is available in GitHub CI; no success path,
 * actual authenticated operator, Codex protocol or conversation exists.
 */
import Foundation

@main
struct AIVerseNativeXPCPeerDenyTests {
    private static func eventually(_ predicate: () -> Bool,
                                   timeout: TimeInterval = 4.0) -> Bool {
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if predicate() { return true }
            Thread.sleep(forTimeInterval: 0.02)
        }
        return predicate()
    }

    private static func attempt(_ connection: NSXPCConnection,
                                claim: String, observed: AIVerseXPCReplyObservation) {
        guard let remote = connection.remoteObjectProxyWithErrorHandler(
            { _ in observed.markTransportRejected() }
        ) as? AIVerseDeniedXPCReviewProbe else {
            fatalError("no XPC proxy for deny-only probe")
        }
        remote.attemptReview(claim) { accepted in
            observed.markReply(accepted)
        }
    }

    static func main() {
        precondition(ProcessInfo.processInfo.environment["CI"] == "true")
        precondition(ProcessInfo.processInfo.environment[
            "AIVERSE_MACOS_XPC_DENY_FIXTURE"] == "1")
        precondition(ProcessInfo.processInfo.environment[
            "AIVERSE_MACOS_OWNER_AUTH_PREVIEW"] == nil)

        let defaultGate = AIVerseXPCPeerDenyBoundary()
        let defaultListener = NSXPCListener.anonymous()
        defaultListener.delegate = defaultGate
        defaultListener.resume()
        let defaultClient = NSXPCConnection(listenerEndpoint: defaultListener.endpoint)
        defaultClient.remoteObjectInterface = NSXPCInterface(
            with: AIVerseDeniedXPCReviewProbe.self)
        defaultClient.resume()
        let defaultObservation = AIVerseXPCReplyObservation()
        attempt(defaultClient, claim: "fake-consent-default", observed: defaultObservation)
        precondition(eventually { defaultGate.refusedCount > 0 },
                     "unconfigured native listener must reject incoming XPC")
        Thread.sleep(forTimeInterval: 0.25)
        precondition(defaultGate.configuredCount == 0)
        precondition(defaultGate.sink.receivedCount == 0)
        precondition(!defaultObservation.anyApproved)
        precondition(!defaultGate.recordingAuthorized
                     && !defaultGate.hostOriginAttested
                     && !defaultGate.eventAdmissionEnabled)
        defaultClient.invalidate()
        defaultListener.invalidate()

        // The listener deliberately requires an Apple-signed identity that
        // does not exist. A real CI binary must NOT reach the exported
        // object even when it supplies plausible identity strings.
        let signedGate = AIVerseXPCPeerDenyBoundary(.isolatedImpossibleSignerFixture)
        let signedListener = NSXPCListener.anonymous()
        signedListener.delegate = signedGate
        signedListener.resume()
        let client = NSXPCConnection(listenerEndpoint: signedListener.endpoint)
        client.remoteObjectInterface = NSXPCInterface(
            with: AIVerseDeniedXPCReviewProbe.self)
        client.resume()

        let observed = AIVerseXPCReplyObservation()
        attempt(client, claim: "hostPid=1;session=forged;scope=operator;consent=YES",
                observed: observed)
        precondition(eventually { signedGate.configuredCount > 0 },
                     "XPC delegate must install the OS code-signing requirement")
        Thread.sleep(forTimeInterval: 0.75)
        precondition(signedGate.sink.receivedCount == 0,
                     "OS must reject code-signing-mismatched XPC peer")
        precondition(!observed.anyApproved,
                     "untrusted XPC transport cannot issue approval")
        precondition(!signedGate.recordingAuthorized
                     && !signedGate.hostOriginAttested
                     && !signedGate.eventAdmissionEnabled)
        client.invalidate()
        signedListener.invalidate()
        print("PASS: 3A.32 unconfigured and signing-mismatched XPC peers denied; no approval, events or recording")
    }
}

final class AIVerseXPCReplyObservation {
    private let lock = NSLock()
    private var accepted = false
    private var failed = false

    func markReply(_ granted: Bool) {
        lock.lock()
        accepted = accepted || granted
        lock.unlock()
    }

    func markTransportRejected() {
        lock.lock()
        failed = true
        lock.unlock()
    }

    var anyApproved: Bool {
        lock.lock()
        defer { lock.unlock() }
        return accepted
    }
}
