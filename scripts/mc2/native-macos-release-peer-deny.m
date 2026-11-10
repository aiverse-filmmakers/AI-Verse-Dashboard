/*
 * 3A.37: Apple's anchored Developer ID peer-requirement failure proof.
 * Does NOT bind a production Team ID and CANNOT authorize recording.
 *
 * In a real signed product, an independently reviewed Team ID and bundle
 * ID must be pinned at build time, and the installed host must prove the
 * reverse direction as well. This intentionally non-existent Team ID
 * is NOT a configuration value or prospective entitlement.
 */
#import "native-macos-release-peer-deny.h"
#import "native-macos-actual-xpc-protocol.h"
#import <Foundation/Foundation.h>
#import <Security/Security.h>
#import <dispatch/dispatch.h>

int AIVerseTestReleasePeerDenial(void) {
    NSDictionary *env=NSProcessInfo.processInfo.environment;
    if (![env[@"CI"] isEqualToString:@"true"] ||
        ![env[@"AIVERSE_MACOS_ACTUAL_XPC_CI"] isEqualToString:@"1"] ||
        env[@"AIVERSE_MACOS_OWNER_AUTH_PREVIEW"] != nil) return 60;

    // Valid requirement grammar with a deliberately impossible Apple
    // Developer ID signing identity on this ad-hoc GitHub test runner.
    NSString *const req =
        @"anchor apple generic and identifier "
         "\"com.aiverse.ci-only.persistentchat.actual-xpc-service\""
         " and certificate leaf[subject.OU] = \"AAAAAAAAAA\"";
    SecRequirementRef parsed=NULL;
    OSStatus parsedStatus=SecRequirementCreateWithString(
        (__bridge CFStringRef)req, kSecCSDefaultFlags, &parsed);
    if (parsedStatus!=errSecSuccess || parsed==NULL) return 61;
    CFRelease(parsed);

    NSXPCConnection *connection=[[NSXPCConnection alloc]
        initWithServiceName:
            @"com.aiverse.ci-only.persistentchat.actual-xpc-service"];
    connection.remoteObjectInterface=[NSXPCInterface
        interfaceWithProtocol:@protocol(AIVerseActualXPCDenial)];
    // Calling this before resume asks macOS to evaluate the peer itself.
    @try { [connection setCodeSigningRequirement:req]; }
    @catch (NSException *exception) {
        (void)exception;
        [connection invalidate];
        return 62;
    }
    dispatch_semaphore_t completed=dispatch_semaphore_create(0);
    __block BOOL transportDenied=NO, delivered=NO;
    [connection resume];
    id<AIVerseActualXPCDenial> remote =
        [connection remoteObjectProxyWithErrorHandler:^(NSError *error) {
            if (error != nil) transportDenied=YES;
            dispatch_semaphore_signal(completed);
        }];
    [remote probeDenied:@"forge:operator-consented" withReply:
        ^(NSString *status, NSNumber *pid) {
            (void)status; (void)pid;
            delivered=YES;
            dispatch_semaphore_signal(completed);
        }];
    BOOL finished=(dispatch_semaphore_wait(completed,
        dispatch_time(DISPATCH_TIME_NOW, 7*NSEC_PER_SEC))==0);
    [connection invalidate];
    // A timeout is NOT evidence of OS-enforced peer denial.
    if (!finished || !transportDenied || delivered) return 63;
    puts("PASS: 3A.37 Apple-anchored Developer ID peer requirement rejects ad-hoc XPC helper; no consent");
    return 0;
}
