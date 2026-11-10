/*
 * 3A.36: synchronous, bounded, fail-closed XPC lifecycle epoch.
 * Synthetic fixture binding is NOT an independently verified Codex child.
 */
#import "native-macos-xpc-lease-fence.h"
#import <unistd.h>
@interface AIVerseXPCLeaseFence () {
    NSLock *_lock;
    uint64_t _generation;
    NSString *_workspace;
    NSUUID *_session;
    pid_t _pid;
    BOOL _open;
    NSTimeInterval _expiresMonotonic;
}
@end
@implementation AIVerseXPCLeaseFence
- (instancetype)init {
    if ((self=[super init])) {
        _lock=[NSLock new];
        _generation=1;
        _open=NO;
    }
    return self;
}
- (uint64_t)beginForWorkspace:(NSString *)workspace
                    session:(NSUUID *)session
                 processPID:(pid_t)pid {
    [_lock lock];
    // Each start permanently consumes the prior epoch even if invalid.
    _generation++;
    _open=NO;
    _workspace=nil;
    _session=nil;
    _pid=0;
    _expiresMonotonic=0;
    NSRegularExpression *regex=[NSRegularExpression
         regularExpressionWithPattern:@"^[a-z0-9][a-z0-9-]{0,63}$"
                              options:0 error:nil];
    BOOL valid = (workspace.length>0 && workspace.length<=64 &&
        [regex numberOfMatchesInString:workspace options:0
             range:NSMakeRange(0,workspace.length)]==1 &&
        session != nil && pid>0);
    if (valid) {
        _workspace=[workspace copy]; _session=[session copy];
        _pid=pid; _open=YES;
        _expiresMonotonic=NSProcessInfo.processInfo.systemUptime+15.0;
    }
    uint64_t result=valid?_generation:0;
    [_lock unlock];
    return result;
}
- (BOOL)isCurrent:(uint64_t)generation
        workspace:(NSString *)workspace
          session:(NSUUID *)session
       processPID:(pid_t)pid {
    [_lock lock];
    BOOL ok = _open && _generation==generation && generation!=0 &&
        pid>0 && _pid==pid &&
        [_workspace isEqualToString:workspace] &&
        [_session isEqual:session] &&
        NSProcessInfo.processInfo.systemUptime<_expiresMonotonic;
    if (_open && NSProcessInfo.processInfo.systemUptime>=_expiresMonotonic) {
        _open=NO;
        _generation++;
    }
    [_lock unlock];
    return ok;
}
- (void)revoke {
    [_lock lock];
    _generation++;
    _open=NO;
    _workspace=nil; _session=nil; _pid=0; _expiresMonotonic=0;
    [_lock unlock];
}
- (BOOL)recordingAuthorized { return NO; }
- (BOOL)archiveAuthorized { return NO; }
- (BOOL)memoryAuthorized { return NO; }
@end
