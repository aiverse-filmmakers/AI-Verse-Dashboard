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
        fprintf(stderr, "ACTUAL_XPC_CI_UNATTENDED_DENIED\n");
        return 64;
    }
}
