/*
 * Phase 3A.33: CI-only packaged XPC helper entrypoint.
 * Launched directly by the package fixture only for its --ci-deny test.
 * Not a production NSXPC service; it cannot receive user conversation data.
 */
import Foundation
import Darwin

@main
struct AIVersePackagedXPCDeny {
    static func main() {
        guard ProcessInfo.processInfo.environment["CI"] == "true",
              ProcessInfo.processInfo.environment["AIVERSE_MACOS_PACKAGED_DENY_FIXTURE"] == "1",
              CommandLine.arguments == [CommandLine.arguments[0], "--ci-deny"],
              isatty(STDIN_FILENO) == 0,
              isatty(STDERR_FILENO) == 0 else {
            fputs("DENIED: XPC helper has no authorization entrypoint\n", stderr)
            exit(65)
        }
        print("BLOCKED: macOS packaged XPC has no chat capture permission")
    }
}
