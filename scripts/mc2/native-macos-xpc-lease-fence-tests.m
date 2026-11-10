/*
 * 3A.36 deterministic negative regression for delayed XPC replies,
 * stale leases, workspace switch, incorrect session/PID, revoke and restart.
 * Synthetic claims here are *not* human auth or true event attribution.
 */
#import "native-macos-xpc-lease-fence.h"
#import <Foundation/Foundation.h>
static void require(BOOL condition, NSString *what) {
    if (!condition) {
        fprintf(stderr,"FAIL: %s\n",what.UTF8String);
        exit(21);
    }
}
int main(void) {
    @autoreleasepool {
        AIVerseXPCLeaseFence *gate=[AIVerseXPCLeaseFence new];
        NSUUID *session=[NSUUID UUID];
        NSUUID *other=[NSUUID UUID];
        pid_t pid=getpid();
        require(![gate isCurrent:1 workspace:@"operator" session:session
                            processPID:pid],@"uninitialized fail closed");
        require([gate beginForWorkspace:@"../evil" session:session
                            processPID:pid]==0,@"unsafe workspace");
        require([gate beginForWorkspace:@"film" session:session
                            processPID:0]==0,@"no child");
        uint64_t first=[gate beginForWorkspace:@"operator"
                            session:session processPID:pid];
        require(first>0,@"first lease");
        require([gate isCurrent:first workspace:@"operator"
                           session:session processPID:pid],@"fixture current");
        require(![gate isCurrent:first workspace:@"film"
                           session:session processPID:pid],@"wrong scope");
        require(![gate isCurrent:first workspace:@"operator"
                           session:other processPID:pid],@"forged session");
        require(![gate isCurrent:first workspace:@"operator"
                           session:session processPID:pid+1],@"forged PID");
        require(!gate.recordingAuthorized &&
                !gate.archiveAuthorized && !gate.memoryAuthorized,
                @"denied-only permissions");
        [gate revoke];
        require(![gate isCurrent:first workspace:@"operator"
                           session:session processPID:pid],@"revoked lease");
        uint64_t second=[gate beginForWorkspace:@"film" session:other
                              processPID:pid];
        require(second>first,@"generation monotonic");
        require(![gate isCurrent:first workspace:@"film"
                           session:other processPID:pid],@"stale epoch new PID");
        require([gate isCurrent:second workspace:@"film"
                           session:other processPID:pid],@"new scope valid");
        // Simulate callback scheduling and out-of-order completion:
        // an earlier request must be dropped even with current PID.
        uint64_t staleCallback=second;
        uint64_t third=[gate beginForWorkspace:@"film" session:other
                             processPID:pid];
        require(![gate isCurrent:staleCallback workspace:@"film"
                            session:other processPID:pid],
                @"same physical child but old callback discarded");
        require([gate isCurrent:third workspace:@"film" session:other
                            processPID:pid],@"latest epoch allowed");
        [gate revoke];
        for(int i=0;i<256;i++) {
            NSUUID *fresh=[NSUUID UUID];
            uint64_t e=[gate beginForWorkspace:@"operator"
                               session:fresh processPID:pid];
            require(e>0,@"cycle starts");
            require([gate isCurrent:e workspace:@"operator" session:fresh
                              processPID:pid],@"cycle current");
            [gate revoke];
            require(![gate isCurrent:e workspace:@"operator"
                               session:fresh processPID:pid],@"cycle revoked");
            require(!gate.recordingAuthorized &&
                    !gate.archiveAuthorized && !gate.memoryAuthorized,
                    @"cycle no capture");
        }
        puts("PASS: 3A.36 256 epoch/revoke cycles, stale callback, forged scope/session/PID, capture always denied");
        return 0;
    }
}
