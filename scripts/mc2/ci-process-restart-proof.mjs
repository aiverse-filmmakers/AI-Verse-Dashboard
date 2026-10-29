/**
 * Strict CI-only full-process restart proof with real Gateway persisted state.
 *
 * Both canonical Gateway and Dashboard hosts run in their own OS processes,
 * completely stop, and restart on the SAME ports and Gateway-owned disk state.
 * Chromium must re-pair to the new host and restore the session exclusively
 * through authenticated canonical history, not cached browser/local files.
 */
import assert from "node:assert/strict";
import {fork} from "node:child_process";
import {createServer} from "node:net";
import {chromium} from "playwright";

const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function availablePort(){
  const server=createServer();
  await new Promise((resolve,reject)=>{
    server.once("error",reject);
    server.listen(0,"127.0.0.1",resolve);
  });
  const p=server.address().port;
  await new Promise(resolve=>server.close(resolve));
  return p;
}
async function launch(mode,port,settings){
  const env={...process.env,...settings,CI:"true",AIVERSE_RESTART_PORT:String(port)};
  const child=fork("scripts/mc2/ci-restart-child.mjs",[mode],{
    env,stdio:["ignore","pipe","pipe","ipc"],
  });
  // The child must never log a token or pairing code; ignore all captured
  // stdout/stderr even on error to avoid disclosing ephemeral secrets.
  child.stdout.on("data",()=>{});
  child.stderr.on("data",()=>{});
  try{
    const info=await new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>reject(Error("RESTART_CHILD_START_TIMEOUT")),20000);
      const cleanup=()=>{clearTimeout(timeout);child.off("message",onMessage);child.off("exit",onExit)};
      function onMessage(msg){
        if(msg?.type==="ready"){cleanup();resolve(msg);}
        else if(msg?.type==="failed"){cleanup();reject(Error("RESTART_CHILD_START_FAILED"));}
      }
      function onExit(){cleanup();reject(Error("RESTART_CHILD_EXITED_BEFORE_READY"));}
      child.on("message",onMessage);child.once("exit",onExit);
    });
    assert.equal(info.mode,mode);
    assert.equal(info.port,port);
    assert.ok(info.pid>0);
    return {child,info};
  }catch(error){
    child.kill("SIGKILL");
    throw error;
  }
}
async function stop(proc){
  if(!proc)return;
  const child=proc.child;
  if(child.exitCode===0)return;
  if(child.exitCode!==null||child.signalCode!==null)
    throw Error("RESTART_CHILD_EXIT_NOT_CLEAN");
  if(!child.connected){
    child.kill("SIGKILL");
    throw Error("RESTART_CHILD_IPC_CLOSED");
  }
  await new Promise((resolve,reject)=>{
    let settled=false;
    const finish=error=>{
      if(settled)return;
      settled=true;
      clearTimeout(timeout);
      child.off("exit",onExit);
      child.off("error",onError);
      if(error)reject(error);else resolve();
    };
    const onExit=code=>finish(code===0?null:Error("RESTART_CHILD_EXIT_NOT_CLEAN"));
    const onError=()=>finish(Error("RESTART_CHILD_IPC_CLOSED"));
    const timeout=setTimeout(()=>{
      child.kill("SIGKILL");
      finish(Error("RESTART_CHILD_CLOSE_TIMEOUT"));
    },20000);
    child.once("exit",onExit);
    child.once("error",onError);
    try{
      child.send({type:"stop"},error=>{
        if(error)finish(Error("RESTART_CHILD_IPC_CLOSED"));
      });
    }catch{finish(Error("RESTART_CHILD_IPC_CLOSED"));}
  });
}
function latestAnswerComplete(pane){
  return pane?.querySelector(".live-chat-status")?.textContent?.startsWith("completed");
}
export async function proveFullProcessRestart({
  home,osRoot,token,systemId,initialRunId,initialSessionId,initialMarker,
}){
  assert.equal(process.env.CI,"true");
  assert.equal(process.env.AIVERSE_GATEWAY_TOKEN,undefined);
  const gatewayPort=await availablePort(),dashboardPort=await availablePort();
  assert.notEqual(gatewayPort,dashboardPort);
  const gatewayOrigin="http://127.0.0.1:"+gatewayPort;
  const dashboardOrigin="http://127.0.0.1:"+dashboardPort;
  const gatewaySettings={
    AIVERSE_RESTART_HOME:home,
  };
  const dashboardSettings={
    AIVERSE_RESTART_OS_ROOT:osRoot,
    AIVERSE_RESTART_SYSTEM_ID:systemId,
    AIVERSE_RESTART_CANONICAL_SYSTEM_ID:"ci-mc2",
    AIVERSE_RESTART_CANONICAL_ORIGIN:gatewayOrigin,
    AIVERSE_RESTART_TOKEN:token,
  };
  let gateway,host,browser,context;
  let phase="starting child processes",primaryFailure=null;
  try {
    gateway=await launch("canonical",gatewayPort,gatewaySettings);
    host=await launch("dashboard",dashboardPort,dashboardSettings);
    browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
    context=await browser.newContext({viewport:{width:1440,height:900}});
    const page=await context.newPage();
    page.setDefaultTimeout(18000);
    const errors=[];
    const sent=[];
    page.on("pageerror",e=>errors.push(e.message));
    page.on("request",req=>{
      if(req.url()===dashboardOrigin+"/rpc"&&req.method()==="POST"){
        try{sent.push(JSON.parse(req.postData()));}catch{}
      }
    });
    const original=await page.goto(dashboardOrigin+"/local-app/",{waitUntil:"domcontentloaded"});
    assert.equal(original.status(),200);
    await page.locator("#pair-form").waitFor({state:"visible"});
    async function pair(code){
      assert.ok(typeof code==="string"&&code.length>=32);
      await page.locator("#pair-code").fill(code);
      await page.getByRole("button",{name:"Connect this browser"}).click();
      await page.locator(".live-chat-pane").first().waitFor();
    }
    async function restoreSession(){
      await page.getByRole("button",{name:"Previous chats"}).click();
      const entry=page.locator(".live-chat-history-item").filter({hasText:initialSessionId});
      await entry.getByRole("button",{name:"Open conversation"}).click();
      await page.waitForFunction(expected=>{
        const pane=document.querySelector(".live-chat-pane");
        return pane?.querySelector(".live-chat-status")?.textContent?.startsWith("completed")
          && (pane?.textContent??"").includes(expected);
      },initialMarker);
    }
    async function continueInSession(marker){
      const pane=page.locator(".live-chat-pane").first();
      await pane.locator(".live-chat-input").fill(marker);
      await pane.getByRole("button",{name:"Send",exact:true}).click();
      await page.waitForFunction(expected=>{
        const pane=document.querySelector(".live-chat-pane");
        const final=[...(pane?.querySelectorAll(".live-chat-message.assistant p")??[])].at(-1);
        return pane?.querySelector(".live-chat-status")?.textContent?.startsWith("completed")
          && final?.textContent?.includes(expected);
      },marker,{timeout:25000});
      const frame=sent.filter(x=>x.method==="aiverse.gateway.run.create").at(-1);
      assert.equal(frame?.params?.sessionId,initialSessionId,
        "the canonical session must persist across host process launches");
      assert.equal(frame?.workspaceId,"operator");
      assert.equal(frame?.systemId,systemId);
      assert.ok(frame.params.messages.some(x=>x.role==="user"&&x.content===initialMarker),
        "the canonical previous user turn must be supplied, not invented");
      return frame;
    }
    phase="initial browser pairing";
    await pair(host.info.pairingCode);
    phase="initial canonical history restore";
    await restoreSession();
    phase="initial same-session continuation";
    const markerOne="ci-process-first-"+Date.now();
    await continueInSession(markerOne);
    const priorHostPid=host.info.pid,priorGatewayPid=gateway.info.pid;
    const priorPairing=host.info.pairingCode;
    const cookie=(await context.cookies(dashboardOrigin)).find(c=>c.name==="aiverse_local_session");
    assert.ok(cookie?.httpOnly && cookie?.sameSite==="Strict");
    phase="first child shutdown";
    await stop(host);host=undefined;
    await stop(gateway);gateway=undefined;

    // Proven process death, not merely a page reload or calling a mocked
    // endpoint while the same server remains alive.
    await assert.rejects(
      fetch(dashboardOrigin+"/local-app/session",{signal:AbortSignal.timeout(1500)}),
      "no Dashboard listener should survive a clean stop");
    await assert.rejects(
      fetch(gatewayOrigin+"/status",{signal:AbortSignal.timeout(1500)}),
      "no canonical Gateway listener should survive a clean stop");

    // Restart from SAME disk state and SAME bound ports; stale browser cookies
    // must not authenticate into the new server process.
    phase="same-port process restart";
    gateway=await launch("canonical",gatewayPort,gatewaySettings);
    host=await launch("dashboard",dashboardPort,dashboardSettings);
    assert.notEqual(gateway.info.pid,priorGatewayPid);
    assert.notEqual(host.info.pid,priorHostPid);
    assert.notEqual(host.info.pairingCode,priorPairing);
    const oldCookieProbe=await context.request.get(dashboardOrigin+"/local-app/session");
    assert.equal(oldCookieProbe.status(),401,"old HttpOnly cookie must be rejected after host restart");
    const oldAssetProbe=await context.request.get(dashboardOrigin+"/local-app/chat.js");
    assert.equal(oldAssetProbe.status(),401,"private UI must refuse old session after host restart");
    await page.reload({waitUntil:"domcontentloaded"});
    await page.locator("#pair-form").waitFor({state:"visible"});
    assert.equal(await page.locator(".live-chat-pane").count(),0);
    phase="restarted browser pairing";
    await pair(host.info.pairingCode);
    phase="restarted canonical history restore";
    await restoreSession();
    phase="post-restart continuation";
    const recoveredText=await page.locator(".live-chat-pane").first().innerText();
    assert.ok(recoveredText.includes(markerOne));
    assert.ok(recoveredText.includes(initialMarker));
    const markerTwo="ci-process-second-"+Date.now();
    await continueInSession(markerTwo);
    // This must still reference the original persisted run from before *any*
    // child-process launch, not just the run created in the first child.
    const canonicalRun=await fetch(gatewayOrigin+"/v1/runs/"+encodeURIComponent(initialRunId),{
      headers:{authorization:"Bearer "+token},signal:AbortSignal.timeout(8000),
    });
    assert.equal(canonicalRun.status,200);
    const persisted=await canonicalRun.json();
    assert.equal(persisted.session_id,initialSessionId);
    assert.equal(persisted.status,"completed");
    assert.ok(persisted.output?.content?.includes(initialMarker));
    assert.equal(await page.evaluate(()=>localStorage.length),0);
    assert.equal(await page.evaluate(()=>sessionStorage.length),0);
    assert.ok(!JSON.stringify(sent).includes(token),
      "no upstream bearer may cross browser RPC even after restart");
    assert.deepEqual(errors,[]);
    return {
      gateway_relaunched_in_independent_os_process:true,
      dashboard_relaunched_in_independent_os_process:true,
      canonical_disk_history_survived_two_host_cycles:true,
      old_browser_cookie_rejected_after_host_restart:true,
      fresh_pairing_required_after_host_restart:true,
      resumed_session_followups_after_full_restart:true,
      browser_storage_not_used:true,
      owner_mac_tested:false,
    };
  }catch(error){
    primaryFailure=error;
    // The CI phase and script location are safe; no child output or tokens.
    const location=typeof error?.stack==="string"
      ?error.stack.match(/ci-process-restart-proof\.mjs:\d+:\d+/)?.[0]??"unknown"
      :"unknown";
    console.error("RESTART_PROOF_FAILURE",JSON.stringify({
      phase,errorClass:typeof error?.name==="string"?error.name:"Error",location,
    }));
    throw error;
  }finally{
    let cleanupFailure=null;
    for(const cleanup of [
      ()=>context?.close(),()=>browser?.close(),
      ()=>host?stop(host):undefined,()=>gateway?stop(gateway):undefined,
    ]){
      try{await cleanup();}catch(error){cleanupFailure??=error;}
    }
    if(!primaryFailure&&cleanupFailure)throw cleanupFailure;
  }
}
