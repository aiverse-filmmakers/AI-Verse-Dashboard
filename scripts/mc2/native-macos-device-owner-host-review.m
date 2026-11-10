/*
 * 3A.38: native-owner LocalAuthentication review, fail-closed while CI
 * host has only an ad-hoc signature. Never issues a consent/writer token.
 *
 * The future installed native host must be signed and must own the real
 * Codex process. Here the lease refers only to a synthetic test host.
 */
#import "native-macos-device-owner-host-review.h"
#import "native-macos-xpc-lease-fence.h"
#import <LocalAuthentication/LocalAuthentication.h>
#import <Security/Security.h>
#import <unistd.h>

@interface AIVerseDeviceOwnerHostReview () {
    NSLock *_lock;
    AIVerseXPCLeaseFence *_fence;
    LAContext *_pendingContext;
    uint64_t _reviewEpoch;
    BOOL _pending;
}
@end

@implementation AIVerseDeviceOwnerHostReview
- (instancetype)initWithLeaseFence:(AIVerseXPCLeaseFence *)fence {
    if ((self = [super init])) {
        _lock=[NSLock new];
        _fence=fence;
        _reviewEpoch=1;
    }
    return self;
}
- (BOOL)verifiedReleaseOwner {
    // Compile-time non-existent signer fixture. NO caller-provided Team ID,
    // environment variable, browser cookie or app-server text is trusted.
    // The real Team ID must be supplied only in a reviewed release build.
    SecCodeRef selfCode=NULL;
    if (SecCodeCopySelf(kSecCSDefaultFlags, &selfCode)!=errSecSuccess ||
        selfCode==NULL) return NO;
    SecRequirementRef requirement=NULL;
    NSString *const policy =
      @"anchor apple generic and identifier \"com.aiverse.ci-only.persistentchat.actual-xpc-owner\" and certificate leaf[subject.OU] = \"AAAAAAAAAA\"";
    OSStatus parsed=SecRequirementCreateWithString(
        (__bridge CFStringRef)policy, kSecCSDefaultFlags, &requirement);
    BOOL valid = parsed==errSecSuccess && requirement!=NULL &&
      SecCodeCheckValidity(selfCode,kSecCSDefaultFlags,requirement)==errSecSuccess;
    if (requirement!=NULL) CFRelease(requirement);
    CFRelease(selfCode);
    return valid;
}
- (void)attemptReviewForWorkspace:(NSString *)workspace
                         session:(NSUUID *)session
                      processPID:(pid_t)pid
                      generation:(uint64_t)generation
                      completion:(void (^)(BOOL reviewed))completion {
    if (!completion) return;
    if (![_fence isCurrent:generation workspace:workspace
                     session:session processPID:pid] ||
        pid!=getpid() ||
        [NSProcessInfo.processInfo.environment[@"CI"] isEqualToString:@"true"] ||
        !isatty(STDIN_FILENO) || !isatty(STDERR_FILENO) ||
        ![self verifiedReleaseOwner]) {
        completion(NO);
        return;
    }
    [_lock lock];
    if (_pending) {
        [_lock unlock];
        completion(NO);
        return;
    }
    _pending=YES;
    const uint64_t epoch=++_reviewEpoch;
    LAContext *context=[LAContext new];
    context.touchIDAuthenticationAllowableReuseDuration=0;
    context.interactionNotAllowed=NO;
    _pendingContext=context;
    [_lock unlock];
    NSError *error=nil;
    if (![context canEvaluatePolicy:LAPolicyDeviceOwnerAuthentication error:&error]) {
        [self revoke];
        completion(NO);
        return;
    }
    NSString *reason=[NSString stringWithFormat:
      @"Review future-only Codex text in workspace %@. Recording is disabled.",workspace];
    [context evaluatePolicy:LAPolicyDeviceOwnerAuthentication
           localizedReason:reason reply:^(BOOL success, NSError *evalError) {
        (void)evalError;
        [self->_lock lock];
        BOOL same=self->_pending && self->_reviewEpoch==epoch
             && self->_pendingContext==context;
        self->_pending=NO;
        if (self->_pendingContext==context)
            self->_pendingContext=nil;
        [self->_lock unlock];
        [context invalidate];
        BOOL current=[self->_fence isCurrent:generation workspace:workspace
                           session:session processPID:pid];
        // Even an authenticated *review* is NEVER recording consent.
        completion(success && same && current);
    }];
}
- (void)revoke {
    [_lock lock];
    _reviewEpoch++;
    _pending=NO;
    LAContext *context=_pendingContext;
    _pendingContext=nil;
    [_lock unlock];
    [context invalidate];
}
- (BOOL)recordingConsentIssued { return NO; }
- (BOOL)archiveWriteAdmitted { return NO; }
@end
