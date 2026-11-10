/*
 * Persistent Chats 3A.34: two real macOS processes with kernel-owned
 * AF_UNIX peer identity and dynamic code-signing checks. CI ONLY.
 *
 * This is deliberately NOT NSXPC authorization. It proves a lower-level
 * process ownership and revocation primitive before an eventual installed,
 * signed XPC service. Ad-hoc signatures are NOT developer authentication.
 *
 * No Codex/model turn, recording consent, archive, or Memory API exists.
 * The only exchanged value is an ignored, constant synthetic byte.
 */
#import <Foundation/Foundation.h>
#import <Security/Security.h>
#import <sys/socket.h>
#import <sys/un.h>
#import <sys/stat.h>
#import <poll.h>
#import <unistd.h>
#import <errno.h>
#import <limits.h>
#import <signal.h>
#import <string.h>

static const char *const kDenied = "NATIVE_PEER_PROOF_DENIED";

static BOOL fixtureEnabled(void) {
    NSDictionary *env = NSProcessInfo.processInfo.environment;
    return [env[@"CI"] isEqualToString:@"true"] &&
      [env[@"AIVERSE_MACOS_TWO_PROCESS_FIXTURE"] isEqualToString:@"1"] &&
      env[@"AIVERSE_MACOS_OWNER_AUTH_PREVIEW"] == nil &&
      env[@"OPENAI_API_KEY"] == nil && env[@"AIVERSE_GATEWAY_TOKEN"] == nil &&
      !isatty(STDIN_FILENO) && !isatty(STDERR_FILENO);
}
static int bindSocket(NSString *path) {
    const char *p = path.fileSystemRepresentation;
    if (strlen(p) >= sizeof(((struct sockaddr_un *)0)->sun_path)) return -1;
    int fd = socket(AF_UNIX, SOCK_STREAM, 0);
    if (fd < 0) return -1;
    struct sockaddr_un address = {0};
    address.sun_family = AF_UNIX;
    strlcpy(address.sun_path, p, sizeof(address.sun_path));
    // Exclusive, owner-controlled directory; do not follow an old socket.
    if (bind(fd, (const struct sockaddr *)&address, sizeof(address)) != 0 ||
        chmod(p, 0600) != 0 || listen(fd, 2) != 0) {
        close(fd);
        return -1;
    }
    return fd;
}
static int connectChild(NSString *path) {
    const char *p = path.fileSystemRepresentation;
    if (strlen(p) >= sizeof(((struct sockaddr_un *)0)->sun_path)) return 2;
    int fd = socket(AF_UNIX, SOCK_STREAM, 0);
    if (fd < 0) return 3;
    struct sockaddr_un address = {0};
    address.sun_family = AF_UNIX;
    strlcpy(address.sun_path, p, sizeof(address.sun_path));
    int ok = connect(fd, (const struct sockaddr *)&address, sizeof(address));
    if (ok != 0) { close(fd); return 4; }
    const char marker = 'X';
    (void)write(fd, &marker, 1); // not an identity or approval token
    usleep(750000);
    close(fd);
    return 0;
}
static int acceptBounded(int listener) {
    struct pollfd pfd = {.fd = listener, .events = POLLIN};
    if (poll(&pfd, 1, 4000) <= 0 || !(pfd.revents & POLLIN)) return -1;
    return accept(listener, NULL, NULL);
}
static BOOL validDynamicSigner(pid_t pid, NSString *expectedIdentifier) {
    SecCodeRef peer = NULL;
    NSDictionary *attrs = @{(__bridge NSString *)kSecGuestAttributePid: @(pid)};
    if (SecCodeCopyGuestWithAttributes(NULL, (__bridge CFDictionaryRef)attrs,
            kSecCSDefaultFlags, &peer) != errSecSuccess || !peer) return NO;
    NSString *expr = [NSString stringWithFormat:@"identifier \"%@\"", expectedIdentifier];
    SecRequirementRef requirement = NULL;
    BOOL valid = NO;
    if (SecRequirementCreateWithString((__bridge CFStringRef)expr,
            kSecCSDefaultFlags, &requirement) == errSecSuccess && requirement) {
        valid = SecCodeCheckValidity(peer, kSecCSDefaultFlags, requirement) == errSecSuccess;
    }
    if (requirement) CFRelease(requirement);
    CFRelease(peer);
    return valid;
}
typedef struct {
    pid_t childPID; // assigned from NSTask after direct parent-owned launch
    uint64_t generation;
    BOOL active;
} Lease;
static BOOL kernelPeerMatches(int connected, Lease lease,
                              pid_t *reportedPID, uid_t *reportedUID) {
    if (!lease.active || lease.generation == 0 || lease.childPID <= 0 ||
        connected < 0) return NO;
    uid_t uid = (uid_t)-1;
    gid_t gid = (gid_t)-1;
    pid_t pid = -1;
    socklen_t uidLen = sizeof(pid);
    if (getpeereid(connected, &uid, &gid) != 0 ||
        getsockopt(connected, SOL_LOCAL, LOCAL_PEERPID, &pid, &uidLen) != 0 ||
        uidLen != sizeof(pid) || uid != geteuid() ||
        pid != lease.childPID) return NO;
    if (reportedPID) *reportedPID = pid;
    if (reportedUID) *reportedUID = uid;
    return YES;
}
static BOOL checkLease(int connected, Lease lease, NSString *identity) {
    pid_t kernelPID = -1;
    if (!kernelPeerMatches(connected, lease, &kernelPID, NULL)) return NO;
    if (!validDynamicSigner(kernelPID, identity)) return NO;
    // No incoming bytes, process-supplied PIDs, JSON or env keys serve as identity.
    return YES;
}
static NSTask *launchChild(NSString *program, NSString *socketPath) {
    NSTask *task = [[NSTask alloc] init];
    task.executableURL = [NSURL fileURLWithPath:program];
    task.arguments = @[@"--ci-child", socketPath];
    task.environment = @{@"PATH":@"/usr/bin:/bin",
                         @"CI":@"true",
                         @"AIVERSE_MACOS_TWO_PROCESS_FIXTURE":@"1"};
    task.standardInput = NSFileHandle.fileHandleWithNullDevice;
    task.standardOutput = NSFileHandle.fileHandleWithNullDevice;
    task.standardError = NSFileHandle.fileHandleWithNullDevice;
    NSError *error = nil;
    if (![task launchAndReturnError:&error]) return nil;
    return task;
}
static void stopChild(NSTask *task) {
    if (!task) return;
    if (task.isRunning) [task terminate];
    [task waitUntilExit];
}
static int parentRun(NSString *allowed, NSString *impostor) {
    char directoryTemplate[PATH_MAX] = {0};
    NSString *pattern = [NSTemporaryDirectory() stringByAppendingPathComponent:
                          @"aiverse-peer34.XXXXXXXX"];
    if (strlen(pattern.fileSystemRepresentation) >= sizeof(directoryTemplate)) return 20;
    strlcpy(directoryTemplate, pattern.fileSystemRepresentation, sizeof(directoryTemplate));
    char *created = mkdtemp(directoryTemplate);
    if (!created) return 21;
    NSString *directory = [NSString stringWithUTF8String:created];
    NSString *socketPath = [directory stringByAppendingPathComponent:@"peer.sock"];
    int listener = -1;
    NSTask *task = nil;
    int connected = -1;
    int code = 22;
    @try {
        if (chmod(created, 0700) != 0) return 23;
        listener = bindSocket(socketPath);
        if (listener < 0) return 24;
        task = launchChild(allowed, socketPath);
        if (!task || task.processIdentifier <= 0) return 25;
        connected = acceptBounded(listener);
        if (connected < 0) return 26;
        Lease current = {.childPID = task.processIdentifier,
                         .generation = 1, .active = YES};
        if (!checkLease(connected, current,
              @"com.aiverse.ci-only.persistentchat.peer.allowed")) return 27;
        Lease fakePID = current;
        fakePID.childPID = getpid();
        if (checkLease(connected, fakePID,
              @"com.aiverse.ci-only.persistentchat.peer.allowed")) return 28;
        Lease fakeGeneration = current;
        fakeGeneration.generation = 0;
        if (checkLease(connected, fakeGeneration,
              @"com.aiverse.ci-only.persistentchat.peer.allowed")) return 29;

        // Revocation while a connected socket still exists invalidates it.
        current.active = NO;
        if (checkLease(connected, current,
              @"com.aiverse.ci-only.persistentchat.peer.allowed")) return 30;
        close(connected); connected = -1;
        stopChild(task); task = nil;

        // A different real process with another ad-hoc identifier cannot
        // satisfy the expected signature, even if its OS PID is current.
        task = launchChild(impostor, socketPath);
        if (!task || task.processIdentifier <= 0) return 31;
        connected = acceptBounded(listener);
        if (connected < 0) return 32;
        Lease replaced = {.childPID = task.processIdentifier,
                          .generation = 2, .active = YES};
        if (!kernelPeerMatches(connected, replaced, NULL, NULL)) return 33;
        if (checkLease(connected, replaced,
              @"com.aiverse.ci-only.persistentchat.peer.allowed")) return 34;
        if (!checkLease(connected, replaced,
              @"com.aiverse.ci-only.persistentchat.peer.impostor")) return 35;
        // Old PID + generation cannot be reused against the new socket.
        Lease old = {.childPID = -1, .generation = 1, .active = YES};
        if (checkLease(connected, old,
              @"com.aiverse.ci-only.persistentchat.peer.allowed")) return 36;
        replaced.active = NO;
        if (checkLease(connected, replaced,
              @"com.aiverse.ci-only.persistentchat.peer.impostor")) return 37;
        code = 0;
    } @finally {
        if (connected >= 0) close(connected);
        stopChild(task);
        if (listener >= 0) close(listener);
        unlink(socketPath.fileSystemRepresentation);
        rmdir(directory.fileSystemRepresentation);
    }
    return code;
}
int main(int argc, const char *argv[]) {
    @autoreleasepool {
        if (!fixtureEnabled()) {
            fprintf(stderr, "%s\n", kDenied);
            return 64;
        }
        NSArray<NSString *> *args = NSProcessInfo.processInfo.arguments;
        if (argc == 3 && [args[1] isEqualToString:@"--ci-child"])
            return connectChild(args[2]);
        if (argc == 4 && [args[1] isEqualToString:@"--ci-parent"]) {
            int code = parentRun(args[2], args[3]);
            if (code == 0)
                puts("PASS: 3A.34 two real macOS processes, kernel peer credentials, dynamic signer mismatch, PID ownership and revocation; recording denied");
            else fprintf(stderr, "DENIED: macOS peer fixture check %d\n", code);
            return code;
        }
        fprintf(stderr, "%s\n", kDenied);
        return 65;
    }
}
