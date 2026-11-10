/*
 * 3A.36: host-local revocation fence for denied-only XPC fixture.
 * Not an authentication issuer or authorization to read/store chat.
 */
#import <Foundation/Foundation.h>
@interface AIVerseXPCLeaseFence : NSObject
- (uint64_t)beginForWorkspace:(NSString *)workspace
                    session:(NSUUID *)session
                 processPID:(pid_t)pid;
- (BOOL)isCurrent:(uint64_t)generation
        workspace:(NSString *)workspace
          session:(NSUUID *)session
       processPID:(pid_t)pid;
- (void)revoke;
- (BOOL)recordingAuthorized;
- (BOOL)archiveAuthorized;
- (BOOL)memoryAuthorized;
@end
