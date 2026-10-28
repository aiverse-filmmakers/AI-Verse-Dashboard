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
    const runId=(await first.locator(".live-chat-status").textContent()).match(/run-[A-Za-z0-9._:-]+/)?.[0];
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
    assert.equal(await first.locator(".live-chat-message.user").count(),1);
    assert.equal(await second.locator(".live-chat-message.user").count(),1);

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
