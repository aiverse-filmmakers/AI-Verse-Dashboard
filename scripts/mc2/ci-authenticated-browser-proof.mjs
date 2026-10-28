/**
 * CI-only full browser proof: real pinned Gateway, disposable OS and
 * deterministic host; genuine Dashboard localhost pairing, cookie HTTP/WS,
 * Personal Chat DOM, canonical SSE delta and terminal reconciliation.
 * No private owner config, provider auth, or production UI assertions.
 */
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {chromium} from "playwright";
import {LocalApplicationSession} from "../../dist/apps/gateway/src/local-app-session.js";
import {QueryRouter,SubscriptionHub,startGateway} from "../../dist/apps/gateway/src/index.js";
import {DisposableCache} from "../../dist/packages/os-read-adapter/src/index.js";

const localAssets=async()=>{
  const paths=[
    "apps/web/local-app/index.html",
    "apps/web/local-app/boot.js",
    "apps/web/local-app/shell.css",
    "apps/web/src/personal-chat.css",
    "dist/apps/web/personal-chat.bundle.js",
  ];
  const [html,boot,shell,chatCss,chat]=await Promise.all(
    paths.map(path=>readFile(path,"utf8")));
  return {html,boot,css:shell+"\n"+chatCss,chat};
};
function eventPayload(message){
  if(!message || typeof message!=="string")return null;
  try{return JSON.parse(message);}catch{return null;}
}
export async function proveAuthenticatedBrowserWithCanonicalGateway({
  registry,bridge,systemId,canonicalOrigin,
}){
  assert.equal(process.env.CI,"true","real browser composition proof is CI-only");
  assert.equal(process.env.AIVERSE_GATEWAY_TOKEN,undefined,
    "never run the browser composition proof with a private member bearer");
  const assets=await localAssets();
  const app=new LocalApplicationSession({systemId,workspaceId:"operator"},assets);
  let server,browser,context;
  try{
    server=await startGateway(new QueryRouter(registry,new DisposableCache()),
      new SubscriptionHub(),{port:0,canonicalBridge:bridge,localApp:app});
    const origin="http://127.0.0.1:"+server.port;
    const bearer=server.authToken;
    browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
    context=await browser.newContext({viewport:{width:1400,height:900}});
    const page=await context.newPage();
    page.setDefaultTimeout(15000);
    const errors=[];
    const wsEvents=[];
    const wsFrames=[];
    const trackedRequests=[];
    page.on("pageerror",error=>errors.push(error.message));
    page.on("websocket",socket=>{
      if(!socket.url().startsWith("ws://127.0.0.1:"+server.port+"/ws"))return;
      wsEvents.push(socket.url());
      socket.on("framereceived",frame=>{
        const parsed=eventPayload(frame.payload);
        if(parsed)wsFrames.push(parsed);
      });
    });
    page.on("request",request=>{
      if(request.url().startsWith(origin+"/rpc")){
        trackedRequests.push({
          url:request.url(),method:request.method(),
          headers:request.headers(),frame:eventPayload(request.postData()),
        });
      }
    });

    // No browser credential or privileged app bundle before explicit pairing.
    const document=await page.goto(origin+"/local-app/",{
      waitUntil:"domcontentloaded",timeout:15000});
    assert.equal(document.status(),200);
    await page.locator("#pair-form").waitFor({state:"visible"});
    assert.equal(await page.locator(".live-chat-pane").count(),0);
    const denied=await page.evaluate(async()=>{
      const response=await fetch("/local-app/chat.js",{credentials:"same-origin"});
      return response.status;
    });
    assert.equal(denied,401);
    const pairingCode=app.pairingCode();
    assert.equal((await page.content()).includes(pairingCode),false);

    // The test harness behaves like an operator reading the private terminal.
    await page.locator("#pair-code").fill(pairingCode);
    await page.getByRole("button",{name:"Connect this browser"}).click();
    await page.locator(".live-chat-pane").first().waitFor();
    const cookie=(await context.cookies(origin)).find(c=>c.name==="aiverse_local_session");
    assert.ok(cookie?.httpOnly&&cookie?.sameSite==="Strict");
    assert.equal((await page.content()).includes(pairingCode),false);
    assert.equal((await page.content()).includes(bearer),false);
    assert.equal(await page.evaluate(()=>localStorage.length),0);
    assert.equal(await page.evaluate(()=>sessionStorage.length),0);

    const marker="browser-canonical-proof-"+Date.now();
    const first=page.locator(".live-chat-pane").first();
    await first.locator(".live-chat-input").fill(marker);
    await first.getByRole("button",{name:"Send",exact:true}).click();
    await page.waitForFunction(expected=>{
      const status=document.querySelector(".live-chat-pane .live-chat-status")?.textContent??"";
      const answer=document.querySelector(".live-chat-pane .live-chat-message.assistant p")?.textContent??"";
      return status.startsWith("completed")&&answer.includes(expected);
    },marker,{timeout:24000});
    const runId=(await first.locator(".live-chat-status").textContent()).split(" · ")[1];
    assert.ok(runId,"browser must receive a canonical run identifier");
    const finalAnswer=await first.locator(".live-chat-message.assistant p").textContent();
    assert.ok(finalAnswer.includes(marker),"canonical reply must reflect exact operator input");
    assert.ok(wsEvents.length>0,"browser must open actual local Dashboard WS");
    assert.ok(wsFrames.some(frame=>frame.type==="event"&&
      frame.event==="aiverse.gateway.run.event"&&
      frame.workspaceId==="operator"&&frame.payload?.kind==="assistant.delta"),
      "browser must receive real pinned Gateway assistant.delta, not fabricated text");
    assert.ok(wsFrames.some(frame=>frame.type==="event"&&
      frame.event==="aiverse.gateway.run.event"&&
      frame.workspaceId==="operator"&&frame.payload?.kind==="run.completed"),
      "real canonical terminal event must reach Chromium before final text");
    assert.ok(trackedRequests.some(req=>req.frame?.method==="aiverse.gateway.run.create"
      && req.frame.workspaceId==="operator"
      && req.frame.params?.messages?.[0]?.content===marker),
      "browser must create an actual correctly scoped Gateway run");
    assert.ok(trackedRequests.some(req=>req.frame?.method==="aiverse.gateway.run.get"),
      "browser must reconcile the final answer through canonical run GET");
    assert.ok(trackedRequests.every(req=>req.url===origin+"/rpc"
      && req.headers.authorization===undefined),
      "browser must never send Dashboard or canonical bearers to /rpc");
    assert.ok(trackedRequests.every(req=>!JSON.stringify(req.frame).includes(bearer)),
      "no privileged Dashboard bearer may appear in browser RPC frames");

    // A follow-up in the SAME pane must reuse its canonical Gateway session
    // AND carry the exact confirmed prior user/assistant messages.
    const followup=marker+"-followup";
    await first.locator(".live-chat-input").fill(followup);
    await first.getByRole("button",{name:"Send",exact:true}).click();
    await page.waitForFunction(expected=>{
      const pane=document.querySelectorAll(".live-chat-pane")[0];
      const status=pane?.querySelector(".live-chat-status")?.textContent??"";
      const answers=[...(pane?.querySelectorAll(".live-chat-message.assistant p")??[])];
      return status.startsWith("completed") && answers.length===2
        && (answers[1]?.textContent??"").includes(expected);
    },followup,{timeout:24000});
    const creates=trackedRequests.filter(req=>req.frame?.method==="aiverse.gateway.run.create");
    assert.equal(creates.length,2,"a follow-up must create one new canonical run");
    const continued=creates[1].frame;
    assert.ok(typeof continued.params?.sessionId==="string"
      && continued.params.sessionId.length>0,
      "follow-up must reuse the earlier authenticated canonical session");
    assert.deepEqual(continued.params.messages,[
      {role:"user",content:marker},
      {role:"assistant",content:finalAnswer},
      {role:"user",content:followup},
    ],"no speculative stream text or missing raw turns in the follow-up");
    // A prior canonical run, fetched by the trusted CI host, must bind the
    // same principal/system/workspace and session as that follow-up request.
    const hostResponse=await fetch(origin+"/rpc",{
      method:"POST",
      headers:{"content-type":"application/json",authorization:"Bearer "+bearer},
      body:JSON.stringify({type:"req",v:"1.0",id:"verify-parent-session",
        method:"aiverse.gateway.run.get",systemId,workspaceId:"operator",
        params:{runId}}),
    });
    assert.equal(hostResponse.status,200);
    const parent=await hostResponse.json();
    assert.equal(parent.ok,true);
    assert.equal(continued.params.sessionId,parent.result.sessionId,
      "the Gateway created the follow-up within the previous run's real session");

    // Real split panes must not share active turns or scope data.
    await page.locator(".live-chat-toolbar .live-chat-split").click();
    assert.equal(await page.locator(".live-chat-pane").count(),2);
    const second=page.locator(".live-chat-pane").nth(1);
    const secondMarker=marker+"-second";
    await second.locator(".live-chat-input").fill(secondMarker);
    await second.getByRole("button",{name:"Send",exact:true}).click();
    await page.waitForFunction(expected=>{
      const pane=document.querySelectorAll(".live-chat-pane")[1];
      const status=pane?.querySelector(".live-chat-status")?.textContent??"";
      const answer=pane?.querySelector(".live-chat-message.assistant p")?.textContent??"";
      return status.startsWith("completed")&&answer.includes(expected);
    },secondMarker,{timeout:24000});
    assert.equal(await first.locator(".live-chat-message.user").count(),2);
    assert.equal(await second.locator(".live-chat-message.user").count(),1);

    // Simulate an application restart without storing a transcript in the
    // browser. Canonical Gateway alone must supply the session list and turns.
    await page.reload({waitUntil:"domcontentloaded"});
    await page.locator(".live-chat-pane").first().waitFor();
    assert.equal(await page.locator(".live-chat-message").count(),0,
      "a reload must not hydrate an invented browser-local transcript");
    await page.getByRole("button",{name:"Previous chats"}).click();
    const selected=page.locator(".live-chat-history-item")
      .filter({hasText:continued.params.sessionId});
    await selected.getByRole("button",{name:"Open conversation"}).click();
    await page.waitForFunction(expected=>{
      const pane=document.querySelector(".live-chat-pane");
      return (pane?.querySelectorAll(".live-chat-message.user").length??0)===2
        && (pane?.querySelectorAll(".live-chat-message.assistant").length??0)===2
        && (pane?.textContent??"").includes(expected);
    },followup,{timeout:18000});
    const resumed=page.locator(".live-chat-pane").first();
    assert.equal(await resumed.locator(".live-chat-message.user").count(),2);
    assert.ok((await resumed.locator(".live-chat-message.assistant").last().textContent())
      .includes(followup),"history comes from canonical completed output");
    const afterRestart=marker+"-after-reload";
    await resumed.locator(".live-chat-input").fill(afterRestart);
    await resumed.getByRole("button",{name:"Send",exact:true}).click();
    await page.waitForFunction(expected=>{
      const pane=document.querySelector(".live-chat-pane");
      const last=[...(pane?.querySelectorAll(".live-chat-message.assistant p")??[])].at(-1);
      return (pane?.querySelector(".live-chat-status")?.textContent??"")
        .startsWith("completed")&&last?.textContent?.includes(expected);
    },afterRestart,{timeout:24000});
    const finalCreate=trackedRequests.filter(req=>req.frame?.method==="aiverse.gateway.run.create").at(-1)?.frame;
    assert.equal(finalCreate.params.sessionId,continued.params.sessionId,
      "a reopened chat continues the same Gateway-owned canonical session");
    assert.equal(finalCreate.params.messages.length,5);
    assert.deepEqual(finalCreate.params.messages.map(x=>x.role),
      ["user","assistant","user","assistant","user"]);
    assert.equal(finalCreate.params.messages[0].content,marker);
    assert.equal(finalCreate.params.messages[2].content,followup);
    assert.equal(finalCreate.params.messages[4].content,afterRestart);
    assert.equal(await page.evaluate(()=>localStorage.length),0);
    assert.equal(await page.evaluate(()=>sessionStorage.length),0);

    // Logout revokes session authorization and existing WS subscriptions.
    await page.getByRole("button",{name:"Disconnect"}).click();
    await page.locator("#pair-form").waitFor({state:"visible"});
    assert.equal(await page.locator(".live-chat-pane").count(),0);
    const revoked=await page.evaluate(async()=>{
      const response=await fetch("/local-app/chat.js",{credentials:"same-origin"});
      return response.status;
    });
    assert.equal(revoked,401);
    assert.equal(await page.evaluate(()=>localStorage.length),0);
    assert.equal(await page.evaluate(()=>sessionStorage.length),0);
    assert.deepEqual(errors,[],"browser must not throw runtime errors");
    return {
      actual_pinned_gateway_browser_run:true,
      local_pairing_http_only:true,
      canonical_assistant_delta_to_chromium:true,
      canonical_terminal_get_verified:true,
      canonical_followup_same_session_and_confirmed_history:true,
      canonical_history_reopened_after_browser_reload:true,
      scoped_two_chat_panes:true,
      cookie_logout_revoked:true,
      member_provider_used:false,
      member_mac_verified:false,
    };
  }finally{
    if(context)await context.close();
    if(browser)await browser.close();
    if(server)await server.close();
  }
}
