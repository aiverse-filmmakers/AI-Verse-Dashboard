/*
 * Phase 3A.35: REAL serviceName-based NSXPCConnection to a launchd
 * managed helper, in a disposable macOS GitHub CI app bundle.
 * NO real app identity, LAContext acceptance or conversation recording.
 */
#import "native-macos-actual-xpc-protocol.h"
#import "native-macos-xpc-lease-fence.h"
#import "native-macos-release-peer-deny.h"
#import "native-macos-device-owner-host-review.h"
#import "native-macos-inbound-xpc-deny-test.h"
#import "native-macos-codex-child-owner.h"
#import "native-macos-workspace-event-fence.h"
#import <sys/stat.h>
#import <limits.h>
#import <Foundation/Foundation.h>
#import <dispatch/dispatch.h>
#import <unistd.h>

static NSString *const kBundle = @"com.aiverse.ci-only.persistentchat.actual-xpc-owner";
static NSString *const kService = @"com.aiverse.ci-only.persistentchat.actual-xpc-service";
static BOOL fixtureOwner(void) {
    NSDictionary *env=NSProcessInfo.processInfo.environment;
    return [env[@"CI"] isEqualToString:@"true"] &&
           [env[@"AIVERSE_MACOS_ACTUAL_XPC_CI"] isEqualToString:@"1"] &&
           env[@"OPENAI_API_KEY"] == nil && env[@"AIVERSE_GATEWAY_TOKEN"] == nil &&
           env[@"AIVERSE_MACOS_OWNER_AUTH_PREVIEW"] == nil &&
           [NSBundle.mainBundle.bundleIdentifier isEqualToString:kBundle] &&
           !isatty(STDIN_FILENO) && !isatty(STDERR_FILENO);
}

static NSXPCConnection *newFixtureConnection(void) {
    NSXPCConnection *connection=[[NSXPCConnection alloc] initWithServiceName:kService];
    connection.remoteObjectInterface=[NSXPCInterface interfaceWithProtocol:
                                        @protocol(AIVerseActualXPCDenial)];
    // This is an AD-HOC fixture identity requirement, not a trusted signer.
    // Set it BEFORE resume and never derive it from user-controlled input.
    [connection setCodeSigningRequirement:
        @"identifier \"com.aiverse.ci-only.persistentchat.actual-xpc-service\""];
    [connection resume];
    return connection;
}
static int probe(void) {
    NSXPCConnection *connection=newFixtureConnection();
    dispatch_semaphore_t done=dispatch_semaphore_create(0);
    __block NSString *status=nil;
    __block NSNumber *helperPID=nil;
    __block BOOL errored=NO;
    id<AIVerseActualXPCDenial> proxy =
       [connection remoteObjectProxyWithErrorHandler:^(NSError *error){
            (void)error; errored=YES; dispatch_semaphore_signal(done);
        }];
    [proxy probeDenied:@"not-consent;synthetic-only" withReply:
           ^(NSString *value, NSNumber *pid) {
            status=value;
            helperPID=pid;
            dispatch_semaphore_signal(done);
        }];
    BOOL completed=dispatch_semaphore_wait(done,
         dispatch_time(DISPATCH_TIME_NOW, 7*NSEC_PER_SEC))==0;
    [connection invalidate];
    if (!completed || errored || ![status isEqualToString:@"CAPTURE_DISABLED"] ||
        !helperPID || helperPID.intValue<=0 || helperPID.intValue==getpid()) {
        fprintf(stderr, "ACTUAL_XPC_CI_PROBE_DENIED\n");
        return 20;
    }
    puts("PASS: 3A.35 real launchd-managed XPC child returned denied-only synthetic probe");
    return 0;
}
/*
 * 3A.36: real XPC invalidation and service-exit regression.
 * The parent-owned fixture leases are synthetic; no human permission.
 * Even a current result only permits observation of CAPTURE_DISABLED.
 */
static int revocationAndInterruption(void) {
    AIVerseXPCLeaseFence *fence=[AIVerseXPCLeaseFence new];
    NSUUID *session=[NSUUID UUID];
    const pid_t ownPID=getpid();
    NSXPCConnection *stale=newFixtureConnection();
    uint64_t oldEpoch=[fence beginForWorkspace:@"operator" session:session
                                  processPID:ownPID];
    if (!oldEpoch) return 41;
    dispatch_semaphore_t staleDone=dispatch_semaphore_create(0);
    __block BOOL staleAccepted=NO;
    id<AIVerseActualXPCDenial> staleProxy=
      [stale remoteObjectProxyWithErrorHandler:^(NSError *e){
        (void)e; dispatch_semaphore_signal(staleDone);
      }];
    [staleProxy delayedDenied:@(800) withReply:^(NSString *value, NSNumber *pid) {
        // No content may be accepted after revocation, even if the
        // XPC transport delivers an old reply later.
        if ([fence isCurrent:oldEpoch workspace:@"operator"
                       session:session processPID:ownPID]) {
            staleAccepted=YES;
        }
        (void)value; (void)pid;
        dispatch_semaphore_signal(staleDone);
    }];
    usleep(150000);
    [fence revoke];
    [stale invalidate];
    (void)dispatch_semaphore_wait(staleDone,
            dispatch_time(DISPATCH_TIME_NOW, 2*NSEC_PER_SEC));
    if (staleAccepted || [fence isCurrent:oldEpoch workspace:@"operator"
                                  session:session processPID:ownPID]) return 42;

    // Replacing the XPC connection begins a brand-new epoch.
    NSXPCConnection *fresh=newFixtureConnection();
    uint64_t freshEpoch=[fence beginForWorkspace:@"film" session:[NSUUID UUID]
                                    processPID:ownPID];
    if (!freshEpoch || freshEpoch==oldEpoch) return 43;
    NSUUID *filmSession=[NSUUID UUID];
    [fence revoke];
    freshEpoch=[fence beginForWorkspace:@"film" session:filmSession
                            processPID:ownPID];
    dispatch_semaphore_t freshDone=dispatch_semaphore_create(0);
    __block BOOL deniedOnly=NO;
    id<AIVerseActualXPCDenial> freshProxy=
       [fresh remoteObjectProxyWithErrorHandler:^(NSError *e){
           (void)e; dispatch_semaphore_signal(freshDone);
       }];
    [freshProxy probeDenied:@"synthetic;not-consent" withReply:
      ^(NSString *value, NSNumber *pid) {
        deniedOnly=[fence isCurrent:freshEpoch workspace:@"film"
                            session:filmSession processPID:ownPID] &&
                   [value isEqualToString:@"CAPTURE_DISABLED"] &&
                   pid.intValue>0 && pid.intValue!=ownPID;
        dispatch_semaphore_signal(freshDone);
      }];
    if (dispatch_semaphore_wait(freshDone,
           dispatch_time(DISPATCH_TIME_NOW, 7*NSEC_PER_SEC))!=0 ||
        !deniedOnly || [fence recordingAuthorized] ||
        [fence archiveAuthorized] || [fence memoryAuthorized]) {
        [fence revoke]; [fresh invalidate]; return 44;
    }
    [fence revoke]; [fresh invalidate];

    // The actual service exits. Apple reports interruption and the
    // host revokes that connection's lease, regardless of auto-restart.
    NSXPCConnection *crashing=newFixtureConnection();
    NSUUID *crashSession=[NSUUID UUID];
    uint64_t crashEpoch=[fence beginForWorkspace:@"operator"
                                 session:crashSession processPID:ownPID];
    dispatch_semaphore_t crashed=dispatch_semaphore_create(0);
    __block BOOL interrupted=NO;
    crashing.interruptionHandler=^{
        interrupted=YES;
        // A late interruption must never invalidate a newer connection.
        [fence revokeIfCurrent:crashEpoch workspace:@"operator"
                     session:crashSession processPID:ownPID];
        dispatch_semaphore_signal(crashed);
    };
    crashing.invalidationHandler=^{
        [fence revokeIfCurrent:crashEpoch workspace:@"operator"
                     session:crashSession processPID:ownPID];
        dispatch_semaphore_signal(crashed);
    };
    id<AIVerseActualXPCDenial> crashProxy=
       [crashing remoteObjectProxyWithErrorHandler:^(NSError *e) {
           (void)e;
       }];
    [crashProxy terminateWithoutReply];
    BOOL handlerObserved=dispatch_semaphore_wait(crashed,
         dispatch_time(DISPATCH_TIME_NOW, 7*NSEC_PER_SEC))==0;
    BOOL invalidAfterCrash=![fence isCurrent:crashEpoch
                                workspace:@"operator"
                                  session:crashSession processPID:ownPID];
    // New lease must be immune to a second/stale old connection handler.
    NSUUID *replacementSession=[NSUUID UUID];
    uint64_t replacementEpoch=[fence beginForWorkspace:@"film"
                       session:replacementSession processPID:ownPID];
    if (!replacementEpoch || replacementEpoch==crashEpoch) return 45;
    [crashing invalidate]; // old invalidation callback may still arrive
    if ([fence revokeIfCurrent:crashEpoch workspace:@"operator"
                   session:crashSession processPID:ownPID]) return 46;
    if (![fence isCurrent:replacementEpoch workspace:@"film"
                   session:replacementSession processPID:ownPID]) return 47;
    [fence revoke];
    if (!handlerObserved || !invalidAfterCrash || !interrupted)
        return 48;
    puts("PASS: 3A.36 real XPC delayed-reply revocation, fresh epoch and service interruption; no recording");
    return 0;
}

/* 3A.38: test only. The actual native XPC host can never grant
 * recording from a forged scope, session or an unattended CI invocation.
 */
static int deviceOwnerDenied(void) {
    AIVerseXPCLeaseFence *fence=[AIVerseXPCLeaseFence new];
    NSUUID *session=[NSUUID UUID];
    pid_t owner=getpid();
    uint64_t epoch=[fence beginForWorkspace:@"operator"
                            session:session processPID:owner];
    if (epoch==0) return 70;
    NSXPCConnection *connection=newFixtureConnection();
    dispatch_semaphore_t xpcDone=dispatch_semaphore_create(0);
    __block BOOL xpcDenied=NO;
    id<AIVerseActualXPCDenial> proxy =
        [connection remoteObjectProxyWithErrorHandler:^(NSError *error){
            (void)error;
            dispatch_semaphore_signal(xpcDone);
        }];
    [proxy probeDenied:@"owner-auth-fake-approval" withReply:
      ^(NSString *status, NSNumber *pid) {
        xpcDenied=[status isEqualToString:@"CAPTURE_DISABLED"] &&
                  pid.intValue>0 && pid.intValue!=owner;
        dispatch_semaphore_signal(xpcDone);
      }];
    if (dispatch_semaphore_wait(xpcDone,
            dispatch_time(DISPATCH_TIME_NOW,7*NSEC_PER_SEC))!=0 ||
        !xpcDenied) {
        [connection invalidate];
        [fence revoke];
        return 71;
    }
    AIVerseDeviceOwnerHostReview *review =
       [[AIVerseDeviceOwnerHostReview alloc] initWithLeaseFence:fence];
    __block int rejected=0;
    [review attemptReviewForWorkspace:@"operator"
         session:session processPID:owner generation:epoch
         completion:^(BOOL reviewed){ if (!reviewed) rejected++; }];
    [review attemptReviewForWorkspace:@"film"
         session:session processPID:owner generation:epoch
         completion:^(BOOL reviewed){ if (!reviewed) rejected++; }];
    [review attemptReviewForWorkspace:@"operator"
         session:[NSUUID UUID] processPID:owner generation:epoch
         completion:^(BOOL reviewed){ if (!reviewed) rejected++; }];
    [fence revoke];
    [review revoke];
    [review attemptReviewForWorkspace:@"operator"
         session:session processPID:owner generation:epoch
         completion:^(BOOL reviewed){ if (!reviewed) rejected++; }];
    [connection invalidate];
    if (rejected!=4 || [review recordingConsentIssued] ||
        [review archiveWriteAdmitted] || [fence recordingAuthorized]) return 72;
    puts("PASS: 3A.38 real XPC owner refuses unattended LocalAuthentication and stale/replaced session; capture disabled");
    return 0;
}


/*
 * Phase 3A.44 and 3A.45: actual XPC owner launches a SILENT real subprocess,
 * checks its process handle, and observes only a dummy "CAPTURE_DISABLED"
 * response through a physical-workspace-and-epoch fence.
 */
static int proveOwnedChildPhysicalScope(void) {
    NSString *templatePath=[NSTemporaryDirectory()
         stringByAppendingPathComponent:@"aiverse-native445.XXXXXXXX"];
    char path[PATH_MAX]={0};
    if (strlen(templatePath.fileSystemRepresentation)>=sizeof(path))
        return 90;
    strlcpy(path,templatePath.fileSystemRepresentation,sizeof(path));
    char *created=mkdtemp(path);
    if (!created) return 91;
    char canonical[PATH_MAX]={0};
    if (!realpath(created,canonical)) { rmdir(created); return 92; }
    NSString *root=[NSString stringWithUTF8String:canonical];
    NSString *workspace=[root stringByAppendingPathComponent:@"operator"];
    NSString *moved=[root stringByAppendingPathComponent:@"saved"];
    NSString *link=[root stringByAppendingPathComponent:@"alias"];
    int result=93;
    AIVerseOwnedSilentChild *child=[AIVerseOwnedSilentChild new];
    AIVerseNativeScopeEventFence *fence=
       [[AIVerseNativeScopeEventFence alloc] initWithChild:child];
    NSXPCConnection *connection=nil;
    @try {
        if (mkdir(workspace.fileSystemRepresentation,0700)!=0) return 94;
        if (symlink(workspace.fileSystemRepresentation,
                    link.fileSystemRepresentation)!=0) return 95;
        if ([child startInWorkspace:link]) return 96;
        if (![child startInWorkspace:workspace]) return 97;
        pid_t pid=child.pid;
        uint64_t generation=child.generation;
        if (pid<=0 || pid==getpid() ||
            ![child stillOwnsWorkspace:workspace processPID:pid
                           generation:generation]) return 98;
        if ([child stillOwnsWorkspace:workspace processPID:getpid()
                          generation:generation]) return 99;
        NSUUID *session=[NSUUID UUID];
        uint64_t epoch=[fence beginWithWorkspaceID:@"operator"
                      directory:workspace session:session];
        if (!epoch) return 100;
        connection=newFixtureConnection();
        dispatch_semaphore_t done=dispatch_semaphore_create(0);
        __block BOOL returnedDenied=NO;
        id<AIVerseActualXPCDenial> remote =
           [connection remoteObjectProxyWithErrorHandler:^(NSError *error){
               (void)error; dispatch_semaphore_signal(done);
           }];
        [remote probeDenied:@"ci-only-owner-process-observation" withReply:
          ^(NSString *status, NSNumber *servicePID) {
              returnedDenied=[status isEqualToString:@"CAPTURE_DISABLED"]
                && servicePID.intValue>0 && servicePID.intValue!=getpid();
              dispatch_semaphore_signal(done);
          }];
        if (dispatch_semaphore_wait(done,
             dispatch_time(DISPATCH_TIME_NOW,7*NSEC_PER_SEC))!=0 ||
            !returnedDenied || ![fence observeDeniedOnly:epoch
                    workspaceID:@"operator" directory:workspace
                    session:session processPID:pid] ||
            [fence recordingAuthorized] || [fence memoryAuthorized]) return 101;

        // 3A.45: permission mutation invalidates an otherwise live PID.
        if (chmod(workspace.fileSystemRepresentation,0777)!=0) return 102;
        if ([fence observeDeniedOnly:epoch workspaceID:@"operator"
                directory:workspace session:session processPID:pid]) return 103;
        if (chmod(workspace.fileSystemRepresentation,0700)!=0) return 104;
        if ([fence observeDeniedOnly:epoch workspaceID:@"operator"
                directory:workspace session:session processPID:pid]) return 105;
        NSUUID *replacementSession=[NSUUID UUID];
        uint64_t replacement=[fence beginWithWorkspaceID:@"operator"
                        directory:workspace session:replacementSession];
        if (!replacement) return 106;
        // Scope rebinding must reject a different inode at the same path.
        if (rename(workspace.fileSystemRepresentation,
                   moved.fileSystemRepresentation)!=0) return 107;
        if (mkdir(workspace.fileSystemRepresentation,0700)!=0) return 108;
        if ([fence observeDeniedOnly:replacement workspaceID:@"operator"
                    directory:workspace session:replacementSession processPID:pid]) return 109;
        if (rmdir(workspace.fileSystemRepresentation)!=0) return 110;
        if (rename(moved.fileSystemRepresentation,
                   workspace.fileSystemRepresentation)!=0) return 111;
        // Reinstating the old physical inode cannot revive an old epoch.
        if ([fence observeDeniedOnly:epoch workspaceID:@"operator"
                    directory:workspace session:session processPID:pid]) return 112;

        [fence revoke];
        [child stop];
        if ([child stillOwnsWorkspace:workspace processPID:pid
                          generation:generation]) return 113;
        if (![child startInWorkspace:workspace]) return 114;
        if ([child stillOwnsWorkspace:workspace processPID:pid
                          generation:generation]) return 115;
        NSUUID *newSession=[NSUUID UUID];
        uint64_t newEpoch=[fence beginWithWorkspaceID:@"operator"
                       directory:workspace session:newSession];
        if (!newEpoch || ![fence observeDeniedOnly:newEpoch
                  workspaceID:@"operator" directory:workspace
                  session:newSession processPID:child.pid]) return 116;
        [fence revoke];
        result=0;
    } @finally {
        [connection invalidate];
        [fence revoke];
        [child stop];
        unlink(link.fileSystemRepresentation);
        rmdir(workspace.fileSystemRepresentation);
        rmdir(moved.fileSystemRepresentation);
        rmdir(root.fileSystemRepresentation);
    }
    if(result==0)
        puts("PASS: 3A.44/45 real XPC owner retains physical child, detects workspace replacement, permissions, generation and revocation; no capture");
    return result;
}


/*
 * 3A.49: one real pinned OFFLINE Codex App Server child directly launched
 * by the native XPC fixture host, in its private current working directory.
 * Its stdin is kept open but receives no initialize request or model turns;
 * its stdout is discarded and never parsed, sent to Gateway or archived.
 */
static int verifyOfflineOfficialCodexChild(void) {
    NSDictionary *environment=NSProcessInfo.processInfo.environment;
    if (![environment[@"CI"] isEqualToString:@"true"] ||
        ![environment[@"AIVERSE_CODEX_OFFLINE_CHILD_CI"] isEqualToString:@"1"] ||
        environment[@"OPENAI_API_KEY"] || environment[@"CODEX_API_KEY"] ||
        environment[@"AIVERSE_GATEWAY_TOKEN"] || environment[@"GITHUB_TOKEN"])
        return 117;
    NSString *binary=environment[@"AIVERSE_CODEX_OFFLINE_BINARY"];
    if (![binary isKindOfClass:NSString.class] || binary.length==0)
        return 118;
    NSString *pattern=[NSTemporaryDirectory() stringByAppendingPathComponent:
                         @"aiverse-real-codex49.XXXXXXXX"];
    char templatePath[PATH_MAX]={0};
    if (strlen(pattern.fileSystemRepresentation)>=sizeof(templatePath))
        return 119;
    strlcpy(templatePath,pattern.fileSystemRepresentation,sizeof(templatePath));
    char *made=mkdtemp(templatePath);
    if (!made) return 120;
    char real[PATH_MAX]={0};
    if (!realpath(made,real)) { rmdir(made); return 121; }
    NSString *root=[NSString stringWithUTF8String:real];
    NSString *workspace=[root stringByAppendingPathComponent:@"operator"];
    NSString *home=[root stringByAppendingPathComponent:@"home"];
    NSString *codexHome=[home stringByAppendingPathComponent:@".codex"];
    AIVerseOwnedSilentChild *child=[AIVerseOwnedSilentChild new];
    AIVerseNativeScopeEventFence *fence=
        [[AIVerseNativeScopeEventFence alloc] initWithChild:child];
    NSXPCConnection *connection=nil;
    int result=122;
    @try {
        if (mkdir(workspace.fileSystemRepresentation,0700)!=0 ||
            mkdir(home.fileSystemRepresentation,0700)!=0 ||
            mkdir(codexHome.fileSystemRepresentation,0700)!=0) return 123;
        if (![child startOfflineCodexInWorkspace:workspace
                           binary:binary home:home]) return 124;
        const pid_t pid=child.pid;
        const uint64_t generation=child.generation;
        if (pid<=0 || pid==getpid()) return 125;
        NSUUID *session=[NSUUID UUID];
        uint64_t epoch=[fence beginWithWorkspaceID:@"operator"
                       directory:workspace session:session];
        if (!epoch) return 126;
        // Ensure this exact, separately running Codex executable remains
        // live and in the physical workspace beyond the launch instant.
        usleep(500000);
        if (![child stillOwnsWorkspace:workspace processPID:pid
                           generation:generation]) return 127;

        connection=newFixtureConnection();
        dispatch_semaphore_t done=dispatch_semaphore_create(0);
        __block BOOL denied=NO;
        id<AIVerseActualXPCDenial> remote =
          [connection remoteObjectProxyWithErrorHandler:^(NSError *error) {
              (void)error;
              dispatch_semaphore_signal(done);
          }];
        [remote probeDenied:@"real-codex-no-turns-no-capture" withReply:
          ^(NSString *status, NSNumber *servicePID) {
              denied=[status isEqualToString:@"CAPTURE_DISABLED"] &&
                  servicePID.intValue>0 && servicePID.intValue!=getpid();
              dispatch_semaphore_signal(done);
          }];
        if (dispatch_semaphore_wait(done,
             dispatch_time(DISPATCH_TIME_NOW,7*NSEC_PER_SEC))!=0 ||
            !denied || ![fence observeDeniedOnly:epoch
               workspaceID:@"operator" directory:workspace
               session:session processPID:pid] ||
            [fence recordingAuthorized] || [fence memoryAuthorized]) return 128;

        // Destroying the owner-controlled child must invalidate its
        // original-event lease even if a later child reuses this PID.
        [child stop];
        if ([fence observeDeniedOnly:epoch workspaceID:@"operator"
                  directory:workspace session:session processPID:pid]) return 129;
        if ([fence recordingAuthorized] || [fence memoryAuthorized]) return 130;
        result=0;
    } @finally {
        [connection invalidate];
        [fence revoke];
        [child stop];
        // Only our disposable home and scope are ever removed; their
        // contents are never read, logged, hashed, or persisted to OS.
        [[NSFileManager defaultManager] removeItemAtPath:root error:nil];
    }
    if (result==0)
        puts("PASS: 3A.49 pinned real offline Codex App Server is native-parent-owned, cwd verified, XPC denial only; no thread or capture");
    return result;
}

int main(int argc, const char *argv[]) {
    @autoreleasepool {
        if (!fixtureOwner() || argc!=2) {
            fprintf(stderr, "ACTUAL_XPC_CI_UNATTENDED_DENIED\n");
            return 64;
        }
        if (strcmp(argv[1], "--ci-probe")==0) return probe();
        if (strcmp(argv[1], "--ci-revocation")==0)
            return revocationAndInterruption();
        if (strcmp(argv[1], "--ci-release-peer-deny")==0)
            return AIVerseTestReleasePeerDenial();
        if (strcmp(argv[1], "--ci-device-owner-deny")==0)
            return deviceOwnerDenied();
        if (strcmp(argv[1], "--ci-inbound-deny")==0)
            return AIVerseTestInboundXPCPeerDenial();
        if (strcmp(argv[1], "--ci-owned-child-scope")==0)
            return proveOwnedChildPhysicalScope();
        if (strcmp(argv[1], "--ci-offline-real-codex")==0)
            return verifyOfflineOfficialCodexChild();
        fprintf(stderr, "ACTUAL_XPC_CI_UNATTENDED_DENIED\n");
        return 64;
    }
}
