/*
 * 3A.31: CI-ONLY macOS ownership boundary with an actual parent-owned child.
 * This is NOT an installed or signed Dashboard host, identity issuer,
 * authorization bridge, event reader, or recording-consent mechanism.
 *
 * Compiled ONLY into the offline Apple Swift fixture, never linked into
 * Node/Gateway/Codex production services. No caller-supplied PID, session
 * UUID, child generation or stdout text can create a review binding.
 */
#if AIVERSE_CI_AUTH_FIXTURE
import Foundation
import Darwin

private enum OwnershipDenied: Error { case denied }

@MainActor
final class MacOwnedChildReviewFixture {
    private struct DirectoryIdentity: Equatable {
        let path: String
        let device: UInt64
        let inode: UInt64
    }
    private struct Owned {
        let process: Process
        let pid: Int32
        let directory: DirectoryIdentity
        let binding: NativeReviewBinding
    }

    private var owned: Owned?
    private var childGeneration: UInt64 = 0
    private let review = NativeOwnerReviewState(lifetime: .seconds(10))

    private func requireFixtureEnvironment() throws {
        let env = ProcessInfo.processInfo.environment
        guard env["CI"] == "true",
              env["AIVERSE_MACOS_CHILD_OWNER_FIXTURE"] == "1",
              env["AIVERSE_MACOS_OWNER_AUTH_PREVIEW"] == nil,
              isatty(STDIN_FILENO) == 0 else {
            throw OwnershipDenied.denied
        }
    }

    private func directoryIdentity(_ path: String) throws -> DirectoryIdentity {
        guard !path.isEmpty, path.utf8.count <= 4096,
              path.hasPrefix("/"),
              URL(fileURLWithPath: path, isDirectory: true)
                  .resolvingSymlinksInPath().path == path else {
            throw OwnershipDenied.denied
        }
        let values: [FileAttributeKey: Any]
        do { values = try FileManager.default.attributesOfItem(atPath: path) }
        catch { throw OwnershipDenied.denied }
        guard (values[.type] as? FileAttributeType) == .typeDirectory,
              let uid = values[.ownerAccountID] as? NSNumber,
              let mode = values[.posixPermissions] as? NSNumber,
              let device = values[.systemNumber] as? NSNumber,
              let inode = values[.systemFileNumber] as? NSNumber,
              uid.uint32Value == getuid(),
              mode.intValue & 0o022 == 0 else {
            throw OwnershipDenied.denied
        }
        return DirectoryIdentity(path: path, device: device.uint64Value,
                                 inode: inode.uint64Value)
    }

    // The Swift parent itself creates the real OS child and fresh session.
    // Workspace is a disposable CI directory, never a user's real workspace.
    @discardableResult
    func launchFixture(workspaceID: String, directory: String) throws -> NativeReviewBinding {
        try requireFixtureEnvironment()
        guard owned == nil else { throw OwnershipDenied.denied }
        let path = try directoryIdentity(directory)
        let candidate = NativeReviewBinding(workspaceID: workspaceID,
            hostSessionID: UUID(), childStartGeneration: childGeneration &+ 1)
        guard candidate.isWellFormed && candidate.childStartGeneration > 0 else {
            throw OwnershipDenied.denied
        }
        let child = Process()
        child.executableURL = URL(fileURLWithPath: "/bin/sleep")
        child.arguments = ["20"]
        child.currentDirectoryURL = URL(fileURLWithPath: path.path, isDirectory: true)
        child.environment = ["PATH": "/usr/bin:/bin"]
        child.standardInput = FileHandle.nullDevice
        child.standardOutput = FileHandle.nullDevice
        child.standardError = FileHandle.nullDevice
        do { try child.run() }
        catch { throw OwnershipDenied.denied }
        // The physical workspace must not change between inspection and
        // subprocess startup. The parent retains its Process object.
        guard child.isRunning, child.processIdentifier > 0,
              (try? directoryIdentity(path.path)) == path else {
            if child.isRunning { child.terminate(); child.waitUntilExit() }
            throw OwnershipDenied.denied
        }
        childGeneration = candidate.childStartGeneration
        owned = Owned(process: child, pid: child.processIdentifier,
                      directory: path, binding: candidate)
        review.selectHostBinding(candidate)
        return candidate
    }

    private func current() -> Owned? {
        guard let item = owned, item.process.isRunning,
              item.process.processIdentifier == item.pid,
              item.pid > 0,
              (try? directoryIdentity(item.directory.path)) == item.directory else {
            stop()
            return nil
        }
        return item
    }

    func observe(_ binding: NativeReviewBinding) -> NativeReviewObservation {
        guard let item = current(), item.binding == binding else {
            return NativeReviewObservation(reviewedCurrentBinding: false)
        }
        return review.observation(for: item.binding)
    }

    func beginSyntheticReview() -> UUID? {
        guard let item = current() else { return nil }
        return review.fixtureBegin(item.binding)
    }

    func completeSyntheticReview(_ nonce: UUID, accepted: Bool) -> Bool {
        guard current() != nil else { return false }
        return review.fixtureComplete(nonce, accepted: accepted)
    }

    func stop() {
        review.revoke()
        let old = owned
        owned = nil
        childGeneration &+= 1
        if let proc = old?.process, proc.isRunning {
            proc.terminate()
            proc.waitUntilExit()
        }
    }

    func captureAllowed() -> Bool {
        // An observed or synthetically reviewed child is never a grant.
        false
    }
}
#endif
