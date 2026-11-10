/*
 * AI-Verse Persistent Chats 3A.29: macOS device-owner authentication
 * PREVIEW ONLY. No production integration or recording authorization.
 *
 * This executable must NEVER be used to mint a capture token, accept
 * events, approve archive storage, or authenticate a Codex process.
 * A caller, including a malicious process, can imitate its stdout.
 *
 * CI executes only the deny path. No Touch ID/password prompt is run
 * on an automated runner, and no authentication claim is fabricated.
 */
import Foundation
import LocalAuthentication
import Darwin

enum PreviewExit: Int32 {
    case invalid = 41
    case unattended = 42
    case unavailable = 43
    case cancelled = 44
}

@main
struct NativeOwnerAuthenticationPreview {
    private static let allowedPurpose = "future-text-only"
    private static let deniedLine = "BLOCKED: no Persistent Chats capture grant"

    private static func refuse(_ code: PreviewExit) -> Never {
        fputs(deniedLine + "\n", stderr)
        exit(code.rawValue)
    }

    private static func isValidWorkspace(_ raw: String) -> Bool {
        guard !raw.isEmpty && raw.utf8.count <= 64 else { return false }
        // Permit only canonical OS workspace IDs; do not accept file paths,
        // URL fragments, external identities or terminal escape sequences.
        return raw.range(
            of: "^(operator|[a-z0-9][a-z0-9-]{0,63})$",
            options: .regularExpression
        ) != nil
    }

    static func main() async {
        let args = CommandLine.arguments
        // Negative CI smoke check; no framework evaluation and no UI.
        if args.count == 2 && args[1] == "--ci-deny" {
            print(deniedLine)
            return
        }

        // A manual native-owner preview is not a production entrypoint.
        guard args.count == 4, args[1] == "--manual-preview",
            isValidWorkspace(args[2]),
            args[3] == allowedPurpose else {
            refuse(.invalid)
        }

        let env = ProcessInfo.processInfo.environment
        guard env["CI"] == nil,
            env["AIVERSE_MACOS_OWNER_AUTH_PREVIEW"] == "1",
            isatty(STDIN_FILENO) == 1, isatty(STDERR_FILENO) == 1 else {
            refuse(.unattended)
        }

        // The host session and child generation are deliberately synthetic
        // here. This standalone preview is not connected to a trusted app
        // identity, native launcher or actual Codex subprocess.
        let binding = NativeReviewBinding(
            workspaceID: args[2],
            hostSessionID: UUID(),
            childStartGeneration: 1
        )
        let review = NativeOwnerReviewState()
        review.selectHostBinding(binding)
        let succeeded = await review.manuallyReviewDeviceOwner(binding)
        let current = review.observation(for: binding)
        guard succeeded && current.reviewedCurrentBinding else {
            review.revoke()
            refuse(.cancelled)
        }
        // Even an actual Apple device-owner authentication result cannot
        // grant capture, authorize archive writes, or authenticate this
        // helper process to a separate Node.js host.
        guard review.authorizeConversationCapture() == false,
            current.captureAuthorized == false,
            current.recordingConsentIssued == false,
            current.hostOriginAttested == false,
            current.archiveWriteAdmitted == false,
            current.historyImportAdmitted == false else {
            review.revoke()
            refuse(.invalid)
        }
        review.revoke()
        print("DEVICE_OWNER_PREVIEW_OK: recording remains disabled")
    }
}
