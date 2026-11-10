/**
 * Disposable Linux CI proof of the actual interactive Personal entrypoint.
 * The canonical Gateway and synthetic OS are supplied by the pinned owner test.
 * A pseudo-terminal is required because production pairing refuses non-TTY
 * hosts. Never echo terminal output, environment keys, or pairing secrets.
 */
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {createServer} from "node:net";

async function freePort(){
  const server=createServer();
  await new Promise((resolve,reject)=>{
    server.once("error",reject);
    server.listen(0,"127.0.0.1",resolve);
  });
  const address=server.address();
  const port=address.port;
  await new Promise(resolve=>server.close(resolve));
  return port;
}

export async function proveRealPersonalLauncher({home,token,canonicalOrigin}){
  assert.equal(process.env.CI,"true","CI synthetic owner only");
  assert.equal(process.env.AIVERSE_GATEWAY_TOKEN,undefined,
    "no private owner token can be present in test environment");
  assert.equal(process.platform,"linux","pseudo-terminal proof is Linux CI only");
  const port=await freePort();
  const origin="http://127.0.0.1:"+port;
  const child=spawn("script",["-q","-e","-f","-c",
    "node scripts/mc2/start-personal.mjs","/dev/null"],{
    detached:true,stdio:["pipe","pipe","pipe"],
    env:{...process.env,AIVERSE_GATEWAY_HOME:home,
      AIVERSE_GATEWAY_TOKEN:token,AIVERSE_GATEWAY_URL:canonicalOrigin,
      AIVERSE_DASHBOARD_PORT:String(port),
      AIVERSE_PERSISTENT_CHATS_CHILD_PROOF:"1"}
  });
  let transcript="",closed=false,reason="";
  const capture=data=>{transcript=(transcript+String(data)).slice(-18000)};
  child.stdout.on("data",capture);
  child.stderr.on("data",capture);
  child.on("exit",(code,signal)=>{closed=true;reason=String(code??signal)});
  child.on("error",error=>{closed=true;reason=error.code??"spawn error"});
  async function until(pattern,maxMs=20000){
    const start=Date.now();
    while(Date.now()-start<maxMs){
      const match=transcript.match(pattern);
      if(match)return match;
      if(closed)throw Error("NATIVE_LAUNCHER_EXITED_"+reason);
      await new Promise(resolve=>setTimeout(resolve,75));
    }
    throw Error("NATIVE_LAUNCHER_PROOF_TIMEOUT");
  }
  // Wait for NEW terminal output, not a matching line from an earlier
  // request; no pairing code or private host output is ever printed.
  async function untilAfter(pattern,start,maxMs=20000){
    const began=Date.now();
    while(Date.now()-began<maxMs){
      if(pattern.test(transcript.slice(start)))return;
      if(closed)throw Error("NATIVE_LAUNCHER_EXITED_"+reason);
      await new Promise(resolve=>setTimeout(resolve,75));
    }
    throw Error("NATIVE_LAUNCHER_CHAT_INTENT_PROOF_TIMEOUT");
  }
  const codePattern=/One-time pairing code \(expires in five minutes\): ([A-Za-z0-9_-]{40,})/;
  try{
    const code=(await until(codePattern))[1];
    // Host-only request must fail until the trusted browser has paired.
    child.stdin.write(":chat-intent on\n");
    await until(/CHAT_INTENT_DENIED/);
    assert.match(transcript,/"personalUIEnabled":true/);
    assert.match(transcript,/"privateBearerExported":false/);
    assert.equal(transcript.includes(token),false,
      "terminal must not expose Gateway credential");
    const page=await fetch(origin+"/local-app/",{redirect:"error"});
    assert.equal(page.status,200,"actual launcher must serve its local boot page");
    assert.match(await page.text(),/Secure local app pairing/);
    const unpaired=await fetch(origin+"/local-app/chat.js",{redirect:"error"});
    assert.equal(unpaired.status,401,"chat source gated before pairing");
    const paired=await fetch(origin+"/local-app/pair",{
      method:"POST",redirect:"error",
      headers:{origin,"content-type":"application/json"},
      body:JSON.stringify({code})
    });
    assert.equal(paired.status,200,"actual host must redeem one-time pairing");
    const cookie=paired.headers.get("set-cookie")??"";
    assert.match(cookie,/HttpOnly; SameSite=Strict/);
    const sessionCookie=cookie.split(";")[0];
    const scopeResponse=await fetch(origin+"/local-app/session",{
      headers:{cookie:sessionCookie},redirect:"error"
    });
    assert.equal(scopeResponse.status,200);
    const scope=await scopeResponse.json();
    assert.equal(scope.scope.workspaceId,"operator");
    assert.equal(scope.authentication,"host-cookie");
    assert.equal(scope.privateBearerExported,false);
    // Browser cannot invoke the native, CI-only child proof.
    assert.equal("childProof" in scope,false);
    // The paired browser must never receive a host-only recording preference.
    assert.equal("prospectiveRecordingIntent" in scope,false);
    assert.equal("captureAuthorized" in scope,false);
    assert.equal("scopeReviewAcknowledged" in scope,false);
    const onMark=transcript.length;
    child.stdin.write(":chat-intent on\n");
    await untilAfter(/Prospective chat request noted for up to 2 minutes\. Recording remains disabled\./,onMark);
    const reviewBeforeMark=transcript.length;
    child.stdin.write(":chat-review status\n");
    await untilAfter(/No active prospective text scope review\. Recording remains disabled\./,reviewBeforeMark);
    const wrongScopeMark=transcript.length;
    child.stdin.write(":chat-review confirm film future-text-only\n");
    await untilAfter(/CHAT_REVIEW_DENIED/,wrongScopeMark);
    const wrongPurposeMark=transcript.length;
    child.stdin.write(":chat-review confirm operator past-history\n");
    await untilAfter(/CHAT_REVIEW_DENIED/,wrongPurposeMark);
    const reviewMark=transcript.length;
    child.stdin.write(":chat-review confirm operator future-text-only\n");
    await untilAfter(/Prospective text scope review acknowledged\. Recording remains disabled\./,reviewMark);
    const reviewedMark=transcript.length;
    child.stdin.write(":chat-review status\n");
    await untilAfter(/Prospective text scope review is active\. Recording remains disabled\./,reviewedMark);
    const startChildMark=transcript.length;
    child.stdin.write(":codex-child-proof start\n");
    await untilAfter(/Synthetic native child started\. No stdout, recording or consent\./,startChildMark);
    const duplicateChildMark=transcript.length;
    child.stdin.write(":codex-child-proof start\n");
    await untilAfter(/CODEX_CHILD_PROOF_DENIED/,duplicateChildMark);
    const childStatusMark=transcript.length;
    child.stdin.write(":codex-child-proof status\n");
    await untilAfter(/Synthetic native child active\. Recording remains disabled\./,childStatusMark);
    const replayMark=transcript.length;
    child.stdin.write(":chat-review confirm operator future-text-only\n");
    await untilAfter(/CHAT_REVIEW_DENIED/,replayMark);
    const requestedMark=transcript.length;
    child.stdin.write(":chat-intent status\n");
    await untilAfter(/Prospective chat request is active\. Recording remains disabled\./,requestedMark);
    const offMark=transcript.length;
    child.stdin.write(":chat-intent off\n");
    await untilAfter(/Prospective chat request cleared\. Recording remains disabled\./,offMark);
    const childAfterStopMark=transcript.length;
    child.stdin.write(":codex-child-proof status\n");
    await untilAfter(/No active synthetic native child\. Recording remains disabled\./,childAfterStopMark);
    const reviewAfterStopMark=transcript.length;
    child.stdin.write(":chat-review status\n");
    await untilAfter(/No active prospective text scope review\. Recording remains disabled\./,reviewAfterStopMark);
    const emptyMark=transcript.length;
    child.stdin.write(":chat-intent status\n");
    await untilAfter(/No active prospective chat request\. Recording remains disabled\./,emptyMark);
    const againMark=transcript.length;
    child.stdin.write(":chat-intent on\n");
    await untilAfter(/Prospective chat request noted for up to 2 minutes\. Recording remains disabled\./,againMark);
    const reviewNotInheritedMark=transcript.length;
    child.stdin.write(":chat-review status\n");
    await untilAfter(/No active prospective text scope review\. Recording remains disabled\./,reviewNotInheritedMark);
    const staleNewIntentMark=transcript.length;
    child.stdin.write(":codex-child-proof start\n");
    await untilAfter(/CODEX_CHILD_PROOF_DENIED/,staleNewIntentMark);
    // A real host terminal command must rotate credentials and revoke the
    // browser session. This cannot be initiated by an HTTP route.
    child.stdin.write(":use film\n");
    await until(/Selected workspace: film/);
    const stale=await fetch(origin+"/local-app/session",{
      headers:{cookie:sessionCookie},redirect:"error"
    });
    assert.equal(stale.status,401);
    const afterRotateMark=transcript.length;
    child.stdin.write(":chat-intent status\n");
    await untilAfter(/No active prospective chat request\. Recording remains disabled\./,afterRotateMark);
    const reviewAfterRotateMark=transcript.length;
    child.stdin.write(":chat-review status\n");
    await untilAfter(/No active prospective text scope review\. Recording remains disabled\./,reviewAfterRotateMark);
    const childAfterRotateMark=transcript.length;
    child.stdin.write(":codex-child-proof status\n");
    await untilAfter(/No active synthetic native child\. Recording remains disabled\./,childAfterRotateMark);
    // Stop stays fail-safe even if no browser is paired after rotation.
    const stopAfterRotateMark=transcript.length;
    child.stdin.write(":chat-intent off\n");
    await untilAfter(/Prospective chat request cleared\. Recording remains disabled\./,stopAfterRotateMark);
    const fresh=(await until(/New one-time pairing code: ([A-Za-z0-9_-]{40,})/))[1];
    assert.notEqual(fresh,code,"workspace change must rotate pairing secret");
    assert.equal(transcript.includes(token),false);
    return {actual_interactive_entrypoint:true,local_http_pairing:true,
      host_tty_workspace_revocation:true,
      host_tty_chat_intent_only_no_capture:true,
      host_tty_scoped_review_only_no_consent_grant:true,
      actual_native_launcher_synthetic_child_lifecycle_verified:true,
      member_mac_verified:false};
  }finally{
    try{process.kill(-child.pid,"SIGTERM")}catch{}
    try{child.stdin.end()}catch{}
  }
}
