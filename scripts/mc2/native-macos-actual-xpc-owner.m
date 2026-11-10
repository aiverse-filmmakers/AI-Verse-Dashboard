/*
 * Phase 3A.35: REAL serviceName-based NSXPCConnection to a launchd
 * managed helper, in a disposable macOS GitHub CI app bundle.
 * NO real app identity, LAContext acceptance or conversation recording.
 */
#import "native-macos-actual-xpc-protocol.h"
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
int main(int argc, const char *argv[]) {
    @autoreleasepool {
        if (!fixtureOwner() || argc!=2 ||
            strcmp(argv[1], "--ci-probe")!=0) {
            fprintf(stderr, "ACTUAL_XPC_CI_UNATTENDED_DENIED\n");
            return 64;
        }
        return probe();
    }
}
