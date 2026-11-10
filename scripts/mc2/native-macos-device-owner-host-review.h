/*
 * 3A.38: owner-side device review PREVIEW only, never recording consent.
 * Compiled only in the disposable 3A.35 XPC test app.
 */
#import <Foundation/Foundation.h>
@class AIVerseXPCLeaseFence;
@interface AIVerseDeviceOwnerHostReview : NSObject
- (instancetype)initWithLeaseFence:(AIVerseXPCLeaseFence *)fence;
- (void)attemptReviewForWorkspace:(NSString *)workspace
                         session:(NSUUID *)session
                      processPID:(pid_t)pid
                      generation:(uint64_t)generation
                      completion:(void (^)(BOOL reviewed))completion;
- (void)revoke;
- (BOOL)recordingConsentIssued;
- (BOOL)archiveWriteAdmitted;
@end
