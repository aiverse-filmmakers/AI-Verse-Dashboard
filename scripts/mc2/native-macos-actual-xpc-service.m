/*
 * Phase 3A.35: real launchd-managed embedded XPC service, CI ONLY.
 * Zero provider secrets, Codex protocol data, chat events or writer APIs.
 */
#import "native-macos-actual-xpc-protocol.h"
#import <Foundation/Foundation.h>
#import <unistd.h>
#import <stdlib.h>

static BOOL fixtureService(void) {
    NSDictionary *e = NSProcessInfo.processInfo.environment;
    // launchd does not necessarily inherit parent's CI environment.
    // For safety, this is only built into uniquely named ad-hoc CI app.
    return [[NSBundle mainBundle].bundleIdentifier isEqualToString:
            @"com.aiverse.ci-only.persistentchat.actual-xpc-service"];
}
@interface AIVerseActualXPCHelper : NSObject<AIVerseActualXPCDenial>
@end
@implementation AIVerseActualXPCHelper
- (void)probeDenied:(NSString *)marker withReply:(void (^)(NSString *,NSNumber *))reply {
    // Not an authorization result. A successful XPC request always denies
    // recording regardless of any caller-supplied claimed consent.
    (void)marker;
    reply(@"CAPTURE_DISABLED", @(getpid()));
}
- (void)delayedDenied:(NSNumber *)delayMs withReply:(void (^)(NSString *,NSNumber *))reply {
    long ms = MAX(250, MIN(1800, [delayMs longValue]));
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, ms * NSEC_PER_MSEC),
                   dispatch_get_global_queue(QOS_CLASS_UTILITY, 0), ^{
        reply(@"CAPTURE_DISABLED", @(getpid()));
    });
}
- (void)terminateWithoutReply {
    _exit(42); // CI-only interruption fixture. No data is processed.
}
@end

@interface AIVerseActualXPCLocalDelegate : NSObject<NSXPCListenerDelegate>
@property(nonatomic,strong) NSMutableArray<NSXPCConnection *> *connections;
@property(nonatomic,strong) AIVerseActualXPCHelper *helper;
@end
@implementation AIVerseActualXPCLocalDelegate
- (instancetype)init {
    if ((self=[super init])) {
        _connections=[NSMutableArray array];
        _helper=[AIVerseActualXPCHelper new];
    }
    return self;
}
- (BOOL)listener:(NSXPCListener *)listener shouldAcceptNewConnection:(NSXPCConnection *)connection {
    (void)listener;
    // The installed version must verify a Developer ID/Team identity
    // before connecting. CI ad-hoc signatures cannot prove that.
    connection.exportedInterface=[NSXPCInterface interfaceWithProtocol:
                                    @protocol(AIVerseActualXPCDenial)];
    connection.exportedObject=self.helper;
    [self.connections addObject:connection];
    [connection resume];
    return YES;
}
@end

int main(int argc, const char *argv[]) {
    @autoreleasepool {
        if (!fixtureService() || argc != 1) return 64;
        NSXPCListener *listener=[NSXPCListener serviceListener];
        AIVerseActualXPCLocalDelegate *delegate=[AIVerseActualXPCLocalDelegate new];
        listener.delegate=delegate;
        [listener resume];
        [[NSRunLoop currentRunLoop] run];
        return 0;
    }
}
