/*
 * 3A.44: native CI XPC owner directly launches and retains /bin/sleep.
 * No user files, Codex events, stdout lines or secrets are accessed.
 */
#import "native-macos-codex-child-owner.h"
#import <sys/stat.h>
#import <limits.h>
#import <unistd.h>
#import <string.h>

@interface AIVerseOwnedSilentChild () {
    NSTask *_child;
    pid_t _pid;
    uint64_t _generation;
    NSString *_workspace;
    dev_t _device;
    ino_t _inode;
}
@end
@implementation AIVerseOwnedSilentChild
- (instancetype)init {
    if ((self=[super init])) _generation=1;
    return self;
}
- (pid_t)pid { return _pid; }
- (uint64_t)generation { return _generation; }
- (NSString *)workspace { return _workspace; }
static BOOL validDirectory(NSString *workspace, dev_t *dev, ino_t *ino) {
    if (![workspace isKindOfClass:NSString.class] ||
        workspace.length==0 || workspace.length>4096 ||
        ![workspace hasPrefix:@"/"]) return NO;
    const char *path=workspace.fileSystemRepresentation;
    char resolved[PATH_MAX]={0};
    if (strlen(path)>=PATH_MAX || !realpath(path,resolved) ||
        strcmp(path,resolved)!=0) return NO;
    struct stat st={0};
    if (lstat(path,&st)!=0 || !S_ISDIR(st.st_mode) ||
        st.st_uid!=geteuid() || (st.st_mode & 0022)!=0) return NO;
    if (dev) *dev=st.st_dev;
    if (ino) *ino=st.st_ino;
    return YES;
}
- (BOOL)startInWorkspace:(NSString *)workspace {
    if (_child || _pid>0) return NO;
    dev_t device=0;
    ino_t inode=0;
    if (!validDirectory(workspace,&device,&inode)) return NO;
    NSTask *task=[NSTask new];
    task.executableURL=[NSURL fileURLWithPath:@"/bin/sleep"];
    task.arguments=@[@"9"];
    task.environment=@{@"PATH":@"/usr/bin:/bin"};
    task.standardInput=NSFileHandle.fileHandleWithNullDevice;
    task.standardOutput=NSFileHandle.fileHandleWithNullDevice;
    task.standardError=NSFileHandle.fileHandleWithNullDevice;
    NSError *error=nil;
    if (![task launchAndReturnError:&error] || task.processIdentifier<=0)
        return NO;
    _child=task;
    _pid=task.processIdentifier;
    _workspace=[workspace copy];
    _device=device;
    _inode=inode;
    _generation++;
    return YES;
}
- (BOOL)stillOwnsWorkspace:(NSString *)workspace
               processPID:(pid_t)pid
               generation:(uint64_t)generation {
    if (!_child || !_child.isRunning || pid<=0 || pid!=_pid ||
        ![workspace isEqualToString:_workspace] ||
        generation==0 || generation!=_generation) return NO;
    dev_t device=0;
    ino_t inode=0;
    return validDirectory(workspace,&device,&inode) &&
        device==_device && inode==_inode;
}
- (void)stop {
    _generation++;
    NSTask *task=_child;
    _child=nil;
    _pid=0;
    _workspace=nil;
    _device=0;
    _inode=0;
    if (task) {
        if (task.isRunning) [task terminate];
        [task waitUntilExit];
    }
}
- (void)dealloc { [self stop]; }
@end
