/*
 * 3A.31: real, silent /bin/sleep subprocess ownership under macOS CI.
 * Tests do NOT perform Apple authentication or receive Codex events.
 */
import Foundation
import Darwin

@main
struct MacOwnedChildReviewTests {
    @MainActor
    static func main() throws {
        let fm = FileManager.default
        let scratch = fm.temporaryDirectory.appendingPathComponent(
            "aiverse-macos-owner-" + UUID().uuidString, isDirectory: true)
        try fm.createDirectory(at: scratch, withIntermediateDirectories: false,
                               attributes: [.posixPermissions: 0o700])
        defer { try? fm.removeItem(at: scratch) }
        let root = scratch.resolvingSymlinksInPath().path
        let alpha = root + "/operator"
        let beta = root + "/film"
        let alias = root + "/alias"
        try fm.createDirectory(atPath: alpha, withIntermediateDirectories: false,
                               attributes: [.posixPermissions: 0o700])
        try fm.createDirectory(atPath: beta, withIntermediateDirectories: false,
                               attributes: [.posixPermissions: 0o700])
        try fm.createSymbolicLink(atPath: alias, withDestinationPath: alpha)
        let fixture = MacOwnedChildReviewFixture()
        defer { fixture.stop() }

        precondition(fixture.beginSyntheticReview() == nil)
        precondition(!fixture.captureAllowed())
        // Reject a symlink, traversal-style scope, missing directory,
        // or an unsafe world-writable workspace before any child starts.
        precondition((try? fixture.launchFixture(workspaceID: "operator",
                                                directory: alias)) == nil)
        precondition((try? fixture.launchFixture(workspaceID: "../film",
                                                directory: alpha)) == nil)
        precondition((try? fixture.launchFixture(workspaceID: "operator",
                                                directory: root + "/missing")) == nil)
        _ = chmod(beta, 0o777)
        precondition((try? fixture.launchFixture(workspaceID: "film",
                                                directory: beta)) == nil)
        _ = chmod(beta, 0o700)

        let first = try fixture.launchFixture(workspaceID: "operator", directory: alpha)
        precondition((try? fixture.launchFixture(workspaceID: "film",
                                                directory: beta)) == nil,
                     "duplicate child must deny")
        guard let initialTicket = fixture.beginSyntheticReview() else {
            fatalError("missing synthetic ticket")
        }
        precondition(fixture.beginSyntheticReview() == nil)
        precondition(fixture.completeSyntheticReview(initialTicket, accepted: true))
        precondition(!fixture.completeSyntheticReview(initialTicket, accepted: true))
        precondition(fixture.observe(first).reviewedCurrentBinding)
        precondition(!fixture.captureAllowed())
        let forgedSession = NativeReviewBinding(workspaceID: "operator",
            hostSessionID: UUID(), childStartGeneration: first.childStartGeneration)
        let forgedChild = NativeReviewBinding(workspaceID: "operator",
            hostSessionID: first.hostSessionID,
            childStartGeneration: first.childStartGeneration &+ 1)
        precondition(!fixture.observe(forgedSession).reviewedCurrentBinding)
        precondition(!fixture.observe(forgedChild).reviewedCurrentBinding)
        precondition(fixture.observe(first).reviewedCurrentBinding,
                     "wrong queries must not clear valid review")

        fixture.stop()
        precondition(!fixture.observe(first).reviewedCurrentBinding)
        precondition(!fixture.completeSyntheticReview(initialTicket, accepted: true))
        let second = try fixture.launchFixture(workspaceID: "film", directory: beta)
        precondition(second.hostSessionID != first.hostSessionID)
        precondition(second.childStartGeneration != first.childStartGeneration)
        precondition(!fixture.observe(first).reviewedCurrentBinding)
        guard let pending = fixture.beginSyntheticReview() else {
            fatalError("missing second synthetic ticket")
        }
        // A permission mutation kills the valid identity before completion.
        _ = chmod(beta, 0o777)
        precondition(!fixture.completeSyntheticReview(pending, accepted: true))
        precondition(!fixture.observe(second).reviewedCurrentBinding)
        precondition(!fixture.captureAllowed())
        _ = chmod(beta, 0o700)

        let third = try fixture.launchFixture(workspaceID: "film", directory: beta)
        guard let last = fixture.beginSyntheticReview() else {
            fatalError("missing third synthetic ticket")
        }
        fixture.stop()
        precondition(!fixture.completeSyntheticReview(last, accepted: true))
        precondition(!fixture.observe(third).reviewedCurrentBinding)
        for _ in 0..<12 {
            let next = try fixture.launchFixture(workspaceID: "operator",
                                                 directory: alpha)
            let ticket = fixture.beginSyntheticReview()!
            precondition(fixture.completeSyntheticReview(ticket, accepted: true))
            precondition(fixture.observe(next).reviewedCurrentBinding)
            precondition(!fixture.captureAllowed())
            fixture.stop()
            precondition(!fixture.observe(next).reviewedCurrentBinding)
        }
        print("PASS: 3A.31 macOS real parent-owned silent child, physical scope, forged session/child, revoke and permission-mutation deny capture")
    }
}
