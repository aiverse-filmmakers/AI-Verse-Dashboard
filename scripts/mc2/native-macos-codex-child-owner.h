/*
 * 3A.44: real, parent-owned SILENT subprocess in the disposable XPC host.
 * Not the installed Dashboard; this fixture launches /bin/sleep, not Codex.
 * PID/workspace references are NEVER authority to record transcripts.
 */
#import <Foundation/Foundation.h>
@interface AIVerseOwnedSilentChild : NSObject
@property(nonatomic,readonly) pid_t pid;
@property(nonatomic,readonly) uint64_t generation;
@property(nonatomic,copy,readonly) NSString *workspace;
- (BOOL)startInWorkspace:(NSString *)workspace;
- (BOOL)stillOwnsWorkspace:(NSString *)workspace
               processPID:(pid_t)pid
               generation:(uint64_t)generation;
- (void)stop;
@end
