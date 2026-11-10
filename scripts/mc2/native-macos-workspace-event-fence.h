/*
 * 3A.45: compose parent-owned subprocess, physical workspace identity and
 * native XPC session epoch. Observes only synthetic denied-only probes.
 * NEVER authorizes chat capture, archives, history import or Memory.
 */
#import <Foundation/Foundation.h>
@class AIVerseOwnedSilentChild;
@interface AIVerseNativeScopeEventFence : NSObject
- (instancetype)initWithChild:(AIVerseOwnedSilentChild *)child;
- (uint64_t)beginWithWorkspaceID:(NSString *)workspaceID
                      directory:(NSString *)directory
                        session:(NSUUID *)session;
- (BOOL)observeDeniedOnly:(uint64_t)epoch
              workspaceID:(NSString *)workspaceID
                directory:(NSString *)directory
                  session:(NSUUID *)session
               processPID:(pid_t)pid;
- (void)revoke;
- (BOOL)recordingAuthorized;
- (BOOL)memoryAuthorized;
@end
