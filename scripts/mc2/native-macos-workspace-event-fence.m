/*
 * 3A.45/3A.51: no IO payload, only a short-lived synthetic observation.
 * Lock all native-host lease transitions. Late callbacks from older XPC
 * sessions must not revoke a replacement connection's current lease.
 * Recording/Memory remain unconditionally disabled.
 */
#import "native-macos-workspace-event-fence.h"
#import "native-macos-codex-child-owner.h"
#import "native-macos-xpc-lease-fence.h"

@interface AIVerseNativeScopeEventFence () {
    NSLock *_lock;
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
        _lock=[NSLock new];
        _child=child;
        _lease=[AIVerseXPCLeaseFence new];
    }
    return self;
}
/* Caller must hold _lock. Never call the public revoke method while locked. */
- (void)revokeLocked {
    [_lease revoke];
    _epoch=0;
    _directory=nil;
    _label=nil;
    _session=nil;
    _childGeneration=0;
}
- (uint64_t)beginWithWorkspaceID:(NSString *)workspaceID
                      directory:(NSString *)directory
                        session:(NSUUID *)session {
    [_lock lock];
    [self revokeLocked];
    uint64_t result=0;
    if ([_child stillOwnsWorkspace:directory processPID:_child.pid
                       generation:_child.generation]) {
        uint64_t epoch=[_lease beginForWorkspace:workspaceID session:session
                                     processPID:_child.pid];
        if (epoch!=0) {
            _directory=[directory copy];
            _label=[workspaceID copy];
            _session=[session copy];
            _childGeneration=_child.generation;
            _epoch=epoch;
            result=epoch;
        }
    }
    [_lock unlock];
    return result;
}
- (BOOL)observeDeniedOnly:(uint64_t)epoch
              workspaceID:(NSString *)workspaceID
                directory:(NSString *)directory
                  session:(NSUUID *)session
               processPID:(pid_t)pid {
    [_lock lock];
    // A stale XPC callback is not allowed to revoke a new, valid lease.
    // This is the same lifetime rule as the already-tested
    // AIVerseXPCLeaseFence.revokeIfCurrent API.
    if (epoch==0 || epoch!=_epoch) {
        [_lock unlock];
        return NO;
    }
    BOOL current=(pid>0 &&
       [_directory isEqualToString:directory] &&
       [_label isEqualToString:workspaceID] &&
       [_session isEqual:session] &&
       [_child stillOwnsWorkspace:directory processPID:pid
                       generation:_childGeneration] &&
       [_lease isCurrent:epoch workspace:workspaceID
                 session:session processPID:pid]);
    if (!current) {
        // A mismatch against the CURRENT epoch remains terminal.
        // Restoring the old inode, chmod bits or PID cannot revive it.
        [self revokeLocked];
    }
    [_lock unlock];
    return current;
}
- (void)revoke {
    [_lock lock];
    [self revokeLocked];
    [_lock unlock];
}
- (BOOL)recordingAuthorized { return NO; }
- (BOOL)memoryAuthorized { return NO; }
@end
