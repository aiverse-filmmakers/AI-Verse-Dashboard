/*
 * Phase 3A.40: real launchd XPC service with an incoming Apple signer fence.
 * CI ONLY, ad-hoc signed, no consent, archive, Memory or Codex access.
 * The requirement's placeholder Team ID cannot be met by the CI owner.
 */
#import "native-macos-actual-xpc-protocol.h"
#import <Foundation/Foundation.h>
#import <Security/Security.h>
#import <unistd.h>

static NSString *const kServiceID =
    @"com.aiverse.ci-only.persistentchat.inbound-deny";
static NSString *const kUnmatchableOwnerRequirement =
    @"anchor apple generic and identifier \"com.aiverse.ci-only.persistentchat.actual-xpc-owner\" and certificate leaf[subject.OU] = \"AAAAAAAAAA\"";

@interface AIVerseInboundDeniedSink : NSObject<AIVerseActualXPCDenial>
@end
@implementation AIVerseInboundDeniedSink
- (void)probeDenied:(NSString *)marker withReply:(void (^)(NSString *,NSNumber *))reply {
    (void)marker;
    reply(@"UNEXPECTED_UNTRUSTED_PEER_DELIVERED", @(getpid()));
}
- (void)delayedDenied:(NSNumber *)delay withReply:(void (^)(NSString *,NSNumber *))reply {
    (void)delay;
    reply(@"UNEXPECTED_UNTRUSTED_PEER_DELIVERED", @(getpid()));
}
- (void)terminateWithoutReply {}
@end

@interface AIVerseInboundDenyDelegate : NSObject<NSXPCListenerDelegate>
@property(nonatomic,strong) AIVerseInboundDeniedSink *sink;
@end
@implementation AIVerseInboundDenyDelegate
- (instancetype)init {
    if ((self=[super init])) _sink=[AIVerseInboundDeniedSink new];
    return self;
}
- (BOOL)listener:(NSXPCListener *)listener shouldAcceptNewConnection:(NSXPCConnection *)connection {
    (void)listener;
    // Configured by the trusted service code before resume, never by a
    // peer-supplied JSON, PID, token, environment variable or request.
    [connection setCodeSigningRequirement:kUnmatchableOwnerRequirement];
    connection.exportedInterface=[NSXPCInterface
        interfaceWithProtocol:@protocol(AIVerseActualXPCDenial)];
    connection.exportedObject=self.sink;
    [connection resume];
    return YES;
}
@end
int main(int argc, const char *argv[]) {
    @autoreleasepool {
        (void)argv;
        if (argc!=1 || ![NSBundle.mainBundle.bundleIdentifier
                    isEqualToString:kServiceID]) return 64;
        SecRequirementRef parsed=NULL;
        OSStatus result=SecRequirementCreateWithString(
           (__bridge CFStringRef)kUnmatchableOwnerRequirement,
           kSecCSDefaultFlags, &parsed);
        if (result!=errSecSuccess || parsed==NULL) return 65;
        CFRelease(parsed);
        NSXPCListener *listener=[NSXPCListener serviceListener];
        AIVerseInboundDenyDelegate *delegate=[AIVerseInboundDenyDelegate new];
        listener.delegate=delegate;
        [listener resume];
        [[NSRunLoop currentRunLoop] run];
        return 0;
    }
}
