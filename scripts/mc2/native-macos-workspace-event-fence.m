/*
 * 3A.45: no IO payload, only a short-lived synthetic observation boolean.
 * Revalidates OS child life and directory dev/inode at every observation.
 */
#import "native-macos-workspace-event-fence.h"
#import "native-macos-codex-child-owner.h"
#import "native-macos-xpc-lease-fence.h"
@interface AIVerseNativeScopeEventFence () {
    AIVerseOwnedSilentChild *_child;
    AIVerseXPCLeaseFence *_lease;
    NSString *_directory;
    NSString *_label;
    NSUUID *_session;
    uint64_t _childGeneration;
    uint64_t _epoch;
}
@end
@implementation AIVerseNativeScopeEventFence
- (instancetype)initWithChild:(AIVerseOwnedSilentChild *)child {
    if ((self=[super init])) {
        _child=child;
        _lease=[AIVerseXPCLeaseFence new];
    }
    return self;
}
- (uint64_t)beginWithWorkspaceID:(NSString *)workspaceID
                      directory:(NSString *)directory
                        session:(NSUUID *)session {
    [self revoke];
    if (![_child stillOwnsWorkspace:directory processPID:_child.pid
                        generation:_child.generation]) return 0;
    uint64_t epoch=[_lease beginForWorkspace:workspaceID session:session
                                 processPID:_child.pid];
    if (!epoch) return 0;
    _directory=[directory copy];
    _label=[workspaceID copy];
    _session=[session copy];
    _childGeneration=_child.generation;
    _epoch=epoch;
    return epoch;
}
- (BOOL)observeDeniedOnly:(uint64_t)epoch
              workspaceID:(NSString *)workspaceID
                directory:(NSString *)directory
                  session:(NSUUID *)session
               processPID:(pid_t)pid {
    BOOL current=(epoch!=0 && _epoch==epoch && pid>0 &&
       [_directory isEqualToString:directory] &&
       [_label isEqualToString:workspaceID] &&
       [_session isEqual:session] &&
       [_child stillOwnsWorkspace:directory processPID:pid
                       generation:_childGeneration] &&
       [_lease isCurrent:epoch workspace:workspaceID
                 session:session processPID:pid]);
    if (!current) {
        // Fail closed for all subsequent observations. Even a temporary
        // workspace replacement or process termination cannot be undone
        // by restoring the original directory name.
        [self revoke];
        return NO;
    }
    return YES;
}
- (void)revoke {
    [_lease revoke];
    _epoch=0;
    _directory=nil;
    _label=nil;
    _session=nil;
    _childGeneration=0;
}
- (BOOL)recordingAuthorized { return NO; }
- (BOOL)memoryAuthorized { return NO; }
@end
