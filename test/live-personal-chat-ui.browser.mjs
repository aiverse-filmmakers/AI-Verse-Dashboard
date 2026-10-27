/**
 * Browser QC for the real, separately built Personal Chat UI.
 * Test transport is a disposable authenticated Dashboard-shaped fixture.
 * The static Pages preview remains unchanged and disconnected.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import path from "node:path";
import {WebSocketServer} from "ws";
import {chromium} from "playwright";

const ROOT=path.resolve(fileURLToPath(new URL("../",import.meta.url)));
const AUTH="test-dashboard-auth-0011223344556677";
const mime={".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8"};
const sockets=new Set();
let next=0;
const requests=[];
const runs=new Map();
const html=String.raw`<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="/apps/web/src/personal-chat.css">
<title>Real Personal Chat QC</title></head><body style="margin:0">
<main id="app" style="height:85vh"></main>
<script type="module">
import {mountAuthenticatedPersonalChat} from "/dist/apps/web/personal-chat.bundle.js";
window.chatApp=mountAuthenticatedPersonalChat(document.querySelector("#app"),{
 dashboardOrigin:location.origin,dashboardBearer:"test-dashboard-auth-0011223344556677",
 selected:{systemId:"aiverse-01",workspaceId:"operator"},
});
</script></body></html>`;
const server=createServer(async(req,res)=>{
  const pathname=new URL(req.url??"/","http://127.0.0.1").pathname;
  if(pathname==="/"){res.writeHead(200,{"content-type":"text/html; charset=utf-8",
    "cache-control":"no-store"}).end(html);return;}
  if(pathname==="/rpc"){
    if(req.headers.authorization!=="Bearer "+AUTH){res.writeHead(401).end();return;}
    let raw="";
    for await(const part of req)raw+=String(part);
    const frame=JSON.parse(raw);
    requests.push(frame);
    let result;
    if(frame.method==="aiverse.gateway.run.create"){
      const runId="run-"+(++next);
      result={runId,sessionId:"session-"+next,systemId:"canonical-a",
        workspaceId:frame.workspaceId,status:"running",source:"canonical-gateway"};
      runs.set(runId,{...result,output:"Authoritative answer "+next});
    }else if(frame.method==="aiverse.gateway.run.get"){
      const found=runs.get(frame.params?.runId);
      if(!found || found.workspaceId!==frame.workspaceId){
        res.writeHead(200,{"content-type":"application/json"}).end(JSON.stringify({
          type:"res",v:"1.0",ok:false,systemId:frame.systemId,
          error:{code:"RUN_BINDING_MISMATCH",message:"Scope denied"},observedAt:new Date().toISOString(),
        }));return;
      }
      result={...found,status:"completed"};
    }else{
      res.writeHead(400).end("Unknown method");return;
    }
    res.writeHead(200,{"content-type":"application/json","cache-control":"no-store"})
      .end(JSON.stringify({type:"res",v:"1.0",id:frame.id,ok:true,
        systemId:frame.systemId,result,observedAt:new Date().toISOString()}));
    return;
  }
  if(!pathname.startsWith("/dist/")&&!pathname.startsWith("/apps/web/src/")){
    res.writeHead(404).end("Not found");return;
  }
  const candidate=path.resolve(ROOT,"."+pathname);
  if(!candidate.startsWith(ROOT+path.sep)){
    res.writeHead(403).end("Forbidden");return;
  }
  try{const file=await readFile(candidate);
    res.writeHead(200,{"content-type":mime[path.extname(candidate)]??"application/octet-stream",
      "cache-control":"no-store"}).end(file);}
  catch{res.writeHead(404).end("Not found");}
});
const wss=new WebSocketServer({noServer:true,handleProtocols:protocols=>
  protocols.has("aiverse.dashboard.v1")?"aiverse.dashboard.v1":false});
server.on("upgrade",(req,socket,head)=>{
  const protocols=String(req.headers["sec-websocket-protocol"]??"");
  if(!protocols.includes("aiverse.auth."+AUTH)){socket.destroy();return;}
  wss.handleUpgrade(req,socket,head,ws=>{
    sockets.add(ws);
    const origin=new URL(req.url??"/","http://127.0.0.1");
    const systemId=origin.searchParams.get("systemId");
    ws.on("message",data=>{
      const frame=JSON.parse(String(data));
      if(frame.type==="gateway-run-subscribe"){
        const run=runs.get(frame.runId);
        if(!run||run.workspaceId!==frame.workspaceId){
          ws.send(JSON.stringify({type:"res",v:"1.0",id:"gateway-run-subscribe",
            ok:false,error:{code:"RUN_BINDING_MISMATCH"},
            observedAt:new Date().toISOString()}));return;
        }
        const makeEvent=(kind,seq,text)=>{
          ws.send(JSON.stringify({type:"event",v:"1.0",
            event:"aiverse.gateway.run.event",systemId,workspaceId:frame.workspaceId,
            observedAt:new Date().toISOString(),seq,
            payload:{runId:frame.runId,eventId:frame.runId+"-"+seq,kind,
              ...(text?{text}:{})}}));
        };
        makeEvent("run.started",1);
        makeEvent("assistant.delta",2,"Draft stream");
        makeEvent("run.completed",3);
      }
    });
    ws.on("close",()=>sockets.delete(ws));
  });
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const origin="http://127.0.0.1:"+server.address().port;
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
test.after(async()=>{
  for(const socket of sockets)socket.terminate();
  await new Promise(resolve=>wss.close(resolve));
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
});
async function pageFor(t){
  const context=await browser.newContext({viewport:{width:1500,height:900}});
  t.after(()=>context.close());
  const page=await context.newPage();
  const errors=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.goto(origin,{waitUntil:"networkidle"});
  await page.locator(".live-chat-pane").first().waitFor();
  return {page,errors};
}
test("MC2.5 actual browser interface sends canonical RPC, receives WS, and renders authority",async t=>{
  const {page,errors}=await pageFor(t);
  assert.equal(await page.locator(".live-chat-pane").count(),1);
  await page.locator(".live-chat-input").fill("Can you draft a film brief?");
  await page.locator(".live-chat-send").click();
  await page.getByText("Authoritative answer 1").waitFor();
  assert.equal(await page.locator(".live-chat-message.user").count(),1);
  assert.equal(await page.locator(".live-chat-message.assistant p").innerText(),"Authoritative answer 1");
  assert.equal(requests.at(0).method,"aiverse.gateway.run.create");
  assert.equal(requests.at(0).workspaceId,"operator");
  assert.deepEqual(requests.at(0).params.messages,[{
    role:"user",content:"Can you draft a film brief?",
  }]);
  assert.equal(requests.at(1).method,"aiverse.gateway.run.get");
  assert.deepEqual(errors,[]);
  const browserStorage=await page.evaluate(()=>({
    local:localStorage.length,session:sessionStorage.length,
  }));
  assert.deepEqual(browserStorage,{local:0,session:0},"real turns and tokens never enter preview localStorage");
});
test("MC2.5 split panes independently stream, resize, close and keep functional controls",async t=>{
  const {page,errors}=await pageFor(t);
  await page.locator(".live-chat-toolbar .live-chat-split").click();
  await page.locator(".live-pane-actions .live-chat-split").first().click();
  assert.equal(await page.locator(".live-chat-pane").count(),3);
  assert.equal(await page.locator(".live-chat-toolbar .live-chat-split").isDisabled(),true);
  for(let i=0;i<3;i++){
    const pane=page.locator(".live-chat-pane").nth(i);
    assert.equal(await pane.getByRole("button",{name:"New chat"}).count(),1);
    assert.equal(await pane.getByRole("button",{name:"Recover run"}).count(),1);
    await pane.locator("textarea").fill("Independent pane "+i);
    await pane.getByRole("button",{name:"Send",exact:true}).click();
    await pane.locator(".live-chat-message.assistant p").getByText(/Authoritative answer/).waitFor();
  }
  assert.equal(await page.locator(".live-chat-message.user").count(),3);
  const second=page.locator(".live-chat-pane").nth(1);
  await second.getByRole("button",{name:"New chat"}).click();
  assert.equal(await second.locator(".live-chat-message").count(),0);
  assert.equal(await page.locator(".live-chat-message.user").count(),2);
  await second.getByRole("button",{name:"Close chat"}).click();
  assert.equal(await page.locator(".live-chat-pane").count(),2);
  assert.equal(await page.locator(".live-chat-toolbar .live-chat-split").isEnabled(),true);
  assert.deepEqual(errors,[]);
});
test("MC2.5 retarget invalidates panes and denies cross-workspace recovery",async t=>{
  const {page,errors}=await pageFor(t);
  await page.locator(".live-chat-input").fill("Operator message");
  await page.locator(".live-chat-send").click();
  await page.getByText(/Authoritative answer/).waitFor();
  const currentId=await page.locator(".live-chat-status").innerText();
  const runId=currentId.match(/run-\d+/)?.[0];
  assert.ok(runId,"display exact Gateway run identity");
  await page.evaluate(()=>window.chatApp.retarget({
    systemId:"aiverse-01",workspaceId:"other",
  }));
  assert.equal(await page.locator(".live-chat-message").count(),0);
  assert.match(await page.locator(".live-chat-scope").innerText(),/Workspace:/);
  await page.locator(".live-chat-run-id").fill(runId);
  await page.getByRole("button",{name:"Recover run"}).click();
  await page.locator(".live-chat-status").getByText(/RUN_BINDING_MISMATCH/).waitFor();
  assert.doesNotMatch(await page.locator(".live-chat-log").innerText(),/Authoritative answer/);
  assert.deepEqual(errors,[]);
});
test("Static Pages design preview never mounts the authenticated runtime application",async()=>{
  const text=await readFile(path.join(ROOT,"apps/web/preview/index.html"),"utf8");
  assert.doesNotMatch(text,/personal-chat-ui|dashboardBearer|live-chat-pane/);
});
