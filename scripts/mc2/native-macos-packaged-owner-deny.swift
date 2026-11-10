/*
 * Phase 3A.33: CI-only, ad-hoc-signed native owner bundle entrypoint.
 * NOT the installed Dashboard. No connection to Node, Codex or Gateway.
 * No LocalAuthentication result, recording grant or event admission.
 */
import Foundation
import Darwin

@main
struct AIVersePackagedOwnerDeny {
    static func main() {
        guard ProcessInfo.processInfo.environment["CI"] == "true",
              ProcessInfo.processInfo.environment["AIVERSE_MACOS_PACKAGED_DENY_FIXTURE"] == "1",
              CommandLine.arguments == [CommandLine.arguments[0], "--ci-deny"],
              isatty(STDIN_FILENO) == 0,
              isatty(STDERR_FILENO) == 0 else {
            fputs("DENIED: native package not installed or authorized\n", stderr)
            exit(64)
        }
        // Two distinct signed Mach-O bundles only demonstrate packaging.
        // We do not attempt a real XPC connection or auth prompt.
        print("BLOCKED: macOS packaged owner has no chat capture permission")
    }
}
