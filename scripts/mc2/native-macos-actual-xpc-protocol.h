/*
 * Phase 3A.35: inert CI-only IPC contract, no capture or consent methods.
 * Neither this protocol nor its callers may be used by production hosts.
 */
#import <Foundation/Foundation.h>
@protocol AIVerseActualXPCDenial
- (void)probeDenied:(NSString *)syntheticMarker
          withReply:(void (^)(NSString *status, NSNumber *servicePID))reply;
- (void)delayedDenied:(NSNumber *)delayMs
           withReply:(void (^)(NSString *status, NSNumber *servicePID))reply;
- (void)terminateWithoutReply;
@end
