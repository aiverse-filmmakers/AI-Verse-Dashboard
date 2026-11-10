/*
 * 3A.40: send a harmless probe through an actual serviceName XPC channel
 * with a listener-side signer requirement that our ad-hoc client fails.
 * A timeout is a failure, not proof of cryptographic peer validation.
 */
#import "native-macos-inbound-xpc-deny-test.h"
#import "native-macos-actual-xpc-protocol.h"
#import <Foundation/Foundation.h>
#import <dispatch/dispatch.h>

int AIVerseTestInboundXPCPeerDenial(void) {
    NSXPCConnection *connection=[[NSXPCConnection alloc]
      initWithServiceName:@"com.aiverse.ci-only.persistentchat.inbound-deny"];
    connection.remoteObjectInterface=[NSXPCInterface
      interfaceWithProtocol:@protocol(AIVerseActualXPCDenial)];
    // Test helper itself has only an ad-hoc signature. A pinned bundle
    // identifier does not authenticate the Apple Developer Team.
    [connection setCodeSigningRequirement:
      @"identifier \"com.aiverse.ci-only.persistentchat.inbound-deny\""];
    dispatch_semaphore_t finished=dispatch_semaphore_create(0);
    __block BOOL rejected=NO, delivered=NO, hadError=NO;
    __block NSInteger peerErrorCode=0;
    __block BOOL peerErrorIsCocoa=NO;
    [connection resume];
    id<AIVerseActualXPCDenial> proxy =
      [connection remoteObjectProxyWithErrorHandler:^(NSError *error) {
          // Require the OS's specific signing-requirement refusal;
          // a generic launchd or transport failure does not count.
          hadError=(error!=nil);
          peerErrorCode=error.code;
          peerErrorIsCocoa=[error.domain isEqualToString:NSCocoaErrorDomain];
          rejected=peerErrorIsCocoa &&
              peerErrorCode==NSXPCConnectionCodeSigningRequirementFailure;
          dispatch_semaphore_signal(finished);
      }];
    [proxy probeDenied:@"forged:device-owner-approved" withReply:
      ^(NSString *status, NSNumber *pid) {
          (void)status; (void)pid;
          delivered=YES;
          dispatch_semaphore_signal(finished);
      }];
    BOOL completed=dispatch_semaphore_wait(finished,
        dispatch_time(DISPATCH_TIME_NOW, 7*NSEC_PER_SEC))==0;
    [connection invalidate];
    if (!completed || !rejected || delivered) {
        // Diagnostic includes ONLY a public system error code, not private
        // conversation, bundle paths, peer data or service content.
        fprintf(stderr, "INBOUND_XPC_DENIED_DIAGNOSTIC finished=%d hadError=%d cocoa=%d code=%ld delivered=%d\\n",
            completed,hadError,peerErrorIsCocoa,(long)peerErrorCode,delivered);
        return 81;
    }
    puts("PASS: 3A.40 real XPC listener refused ad-hoc client with anchored incoming signing policy");
    return 0;
}
