/*
 * 3A.44: native CI XPC owner directly launches and retains /bin/sleep.
 * No user files, Codex events, stdout lines or secrets are accessed.
 */
#import "native-macos-codex-child-owner.h"
#import <sys/stat.h>
#import <limits.h>
#import <unistd.h>
#import <string.h>
#import <libproc.h>
#import <sys/proc_info.h>
#import <signal.h>

@interface AIVerseOwnedSilentChild () {
    NSTask *_child;
    pid_t _pid;
    uint64_t _generation;
    NSString *_workspace;
    dev_t _device;
    ino_t _inode;
    NSPipe *_input;
    BOOL _offlineCodex;
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
static BOOL safeBinaryFile(NSString *binary) {
    if (![binary isKindOfClass:NSString.class] ||
        binary.length<1 || binary.length>4096 ||
        ![binary hasPrefix:@"/"]) return NO;
    const char *path=binary.fileSystemRepresentation;
    char resolved[PATH_MAX]={0};
    if (strlen(path)>=PATH_MAX || !realpath(path,resolved) ||
        strcmp(path,resolved)!=0) return NO;
    struct stat st={0};
    return lstat(path,&st)==0 && S_ISREG(st.st_mode) &&
           st.st_uid==geteuid() && (st.st_mode & 0022)==0 &&
           (st.st_mode & 0100)!=0;
}
static BOOL hasKernelBoundWorkingDirectory(pid_t pid, dev_t dev, ino_t ino,
                                           NSString *path) {
    if (pid<=0 || !path) return NO;
    struct proc_bsdinfo bsd={0};
    if (proc_pidinfo(pid,PROC_PIDTBSDINFO,0,&bsd,sizeof(bsd))
          !=sizeof(bsd) ||
        bsd.pbi_pid != (uint32_t)pid || bsd.pbi_ppid!=(uint32_t)getpid() ||
        bsd.pbi_uid!=geteuid()) return NO;
    struct proc_vnodepathinfo info={0};
    if (proc_pidinfo(pid,PROC_PIDVNODEPATHINFO,0,&info,sizeof(info))
          !=sizeof(info)) return NO;
    const struct vinfo_stat *st=&info.pvi_cdir.vip_vi.vi_stat;
    return (dev_t)st->vst_dev==dev && (ino_t)st->vst_ino==ino &&
        strcmp(info.pvi_cdir.vip_path,path.fileSystemRepresentation)==0;
}
- (BOOL)startProcessInWorkspace:(NSString *)workspace
                         binary:(NSString *)binary
                      arguments:(NSArray<NSString *> *)arguments
                           home:(NSString *)home {
    if (_child || _pid>0) return NO;
    dev_t device=0;
    ino_t inode=0;
    if (!validDirectory(workspace,&device,&inode)) return NO;
    BOOL codex=home!=nil;
    if (codex) {
        NSDictionary *env=NSProcessInfo.processInfo.environment;
        if (![env[@"CI"] isEqualToString:@"true"] ||
            ![env[@"AIVERSE_MACOS_ACTUAL_XPC_CI"] isEqualToString:@"1"] ||
            ![env[@"AIVERSE_CODEX_OFFLINE_CHILD_CI"] isEqualToString:@"1"] ||
            env[@"OPENAI_API_KEY"] || env[@"CODEX_API_KEY"] ||
            env[@"AIVERSE_GATEWAY_TOKEN"] ||
            !safeBinaryFile(binary) || !validDirectory(home,NULL,NULL) ||
            !validDirectory([home stringByAppendingPathComponent:@".codex"],
                            NULL,NULL)) return NO;
    } else if (![binary isEqualToString:@"/bin/sleep"] ||
               ![arguments isEqual:@[@"9"]]) return NO;
    NSTask *task=[NSTask new];
    task.executableURL=[NSURL fileURLWithPath:binary];
    task.currentDirectoryURL=[NSURL fileURLWithPath:workspace isDirectory:YES];
    task.arguments=arguments;
    task.environment=codex
        ? @{@"PATH":@"/usr/bin:/bin",
            @"HOME":home,
            @"CODEX_HOME":[home stringByAppendingPathComponent:@".codex"],
            @"XDG_CONFIG_HOME":[home stringByAppendingPathComponent:@".config"],
            @"XDG_CACHE_HOME":[home stringByAppendingPathComponent:@".cache"],
            @"RUST_LOG":@"off",@"NO_COLOR":@"1"}
        : @{@"PATH":@"/usr/bin:/bin"};
    NSPipe *pipe=codex?[NSPipe pipe]:nil;
    task.standardInput=codex ? pipe : NSFileHandle.fileHandleWithNullDevice;
    task.standardOutput=NSFileHandle.fileHandleWithNullDevice;
    task.standardError=NSFileHandle.fileHandleWithNullDevice;
    NSError *error=nil;
    if (![task launchAndReturnError:&error] || task.processIdentifier<=0) {
        [pipe.fileHandleForWriting closeFile];
        return NO;
    }
    _child=task;
    _input=pipe;
    _pid=task.processIdentifier;
    _workspace=[workspace copy];
    _device=device;
    _inode=inode;
    _offlineCodex=codex;
    _generation++;
    // The host MUST actually launch the child IN its claimed physical
    // workspace. A matching path on the host alone is insufficient.
    if (![self stillOwnsWorkspace:workspace processPID:_pid
                      generation:_generation]) {
        [self stop];
        return NO;
    }
    return YES;
}
- (BOOL)startInWorkspace:(NSString *)workspace {
    return [self startProcessInWorkspace:workspace binary:@"/bin/sleep"
                              arguments:@[@"9"] home:nil];
}
- (BOOL)startOfflineCodexInWorkspace:(NSString *)workspace
                             binary:(NSString *)binary
                               home:(NSString *)home {
    return [self startProcessInWorkspace:workspace binary:binary
                              arguments:@[@"app-server",@"--listen",@"stdio://"]
                                   home:home];
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
        device==_device && inode==_inode &&
        hasKernelBoundWorkingDirectory(pid,_device,_inode,_workspace);
}
- (void)stop {
    _generation++;
    NSTask *task=_child;
    _child=nil;
    _pid=0;
    _workspace=nil;
    _device=0;
    _inode=0;
    NSPipe *input=_input;
    _input=nil;
    _offlineCodex=NO;
    if (input) [input.fileHandleForWriting closeFile];
    if (task) {
        if (task.isRunning) [task terminate];
        // Do not wait indefinitely for a wedged test child. After a
        // bounded grace period force termination before reaping NSTask.
        for (int n=0;task.isRunning && n<75;n++) usleep(20000);
        if (task.isRunning) kill(task.processIdentifier,SIGKILL);
        [task waitUntilExit];
    }
}
- (void)dealloc { [self stop]; }
@end
