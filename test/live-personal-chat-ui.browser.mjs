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

const canvasDocuments=new Map();
const canvasRevisions=new Map();
const canvasIdempotency=new Map();
let canvasSeq=0;
const canvasScope=frame=>frame.systemId+"|"+frame.workspaceId;
const clone=value=>structuredClone(value);
const canvasError=code=>Object.assign(Error(code),{code});
function fixtureCanvas(frame){
  const p=frame.params??{},scope=canvasScope(frame);
  const store=canvasDocuments.get(scope)??new Map();
  if(!canvasDocuments.has(scope))canvasDocuments.set(scope,store);
  const stamp=()=>new Date().toISOString();
  const owner=(doc)=>{
    if(!doc)throw canvasError("CANVAS_DOCUMENT_NOT_FOUND");
    return doc;
  };
  const snapshot=()=>({source:"canonical-data",workspaceId:frame.workspaceId});
  const revisionKey=id=>scope+"|"+id;
  const saveRevision=doc=>{
    const key=revisionKey(doc.id),items=canvasRevisions.get(key)??[];
    if(!items.some(x=>x.version===doc.version))items.push(clone(doc));
    canvasRevisions.set(key,items);
  };
  if(frame.method==="aiverse.canvas.list")
    return {...snapshot(),document:[...store.values()].map(clone)};
  if(frame.method==="aiverse.canvas.get")
    return {...snapshot(),document:clone(owner(store.get(p.id)))};
  if(frame.method==="aiverse.canvas.history"){
    owner(store.get(p.id));
    const archived=canvasRevisions.get(revisionKey(p.id))??[];
    return {...snapshot(),document:archived.slice()
      .filter(x=>p.beforeVersion===undefined||x.version<p.beforeVersion)
      .sort((a,b)=>b.version-a.version)
      .slice(0,p.limit??20).map(clone)};
  }
  if(frame.method==="aiverse.canvas.revert"){
    const current=owner(store.get(p.id));
    const key=scope+"|revert|"+p.idempotencyKey;
    if(canvasIdempotency.has(key))return {...snapshot(),
      document:clone(canvasIdempotency.get(key))};
    if(current.version!==p.expectedVersion)throw canvasError("RECORD_VERSION_CONFLICT");
    if(p.toVersion>=current.version)throw canvasError("CANVAS_VERSION_INVALID");
    const found=(canvasRevisions.get(revisionKey(p.id))??[])
      .find(d=>d.version===p.toVersion);
    if(!found)throw canvasError("CANVAS_HISTORY_UNAVAILABLE");
    const next={...clone(current),title:found.title,board:clone(found.board),
      version:current.version+1,updatedAt:stamp()};
    store.set(p.id,next);saveRevision(next);canvasIdempotency.set(key,clone(next));
    return {...snapshot(),document:clone(next)};
  }
  if(frame.method==="aiverse.canvas.duplicate"){
    const source=owner(store.get(p.id));
    const key=scope+"|duplicate|"+p.idempotencyKey;
    if(canvasIdempotency.has(key))return {...snapshot(),
      document:clone(owner(store.get(canvasIdempotency.get(key))))};
    if(source.version!==p.expectedVersion)throw canvasError("RECORD_VERSION_CONFLICT");
    const now=stamp(),id="rec_"+(++canvasSeq);
    const doc={id,title:p.title??source.title+" copy",version:1,
      createdAt:now,updatedAt:now,board:clone(source.board)};
    store.set(id,doc);saveRevision(doc);canvasIdempotency.set(key,id);
    return {...snapshot(),document:clone(doc)};
  }
  if(frame.method==="aiverse.canvas.delete")throw canvasError("CANVAS_ACCESS_DENIED");
  if(frame.method==="aiverse.canvas.create"){
    const key=scope+"|"+p.idempotencyKey;
    if(canvasIdempotency.has(key))return {...snapshot(),document:clone(owner(store.get(canvasIdempotency.get(key))))};
    const now=stamp(),id="rec_"+(++canvasSeq);
    const doc={id,title:p.title,version:1,createdAt:now,updatedAt:now,
      board:{nodes:[],edges:[]}};
    store.set(id,doc);saveRevision(doc);canvasIdempotency.set(key,id);
    return {...snapshot(),document:clone(doc)};
  }
  const doc=owner(store.get(p.id));
  if(p.expectedVersion!==doc.version)throw canvasError("RECORD_VERSION_CONFLICT");
  if(frame.method==="aiverse.canvas.rename")doc.title=p.title;
  else if(frame.method==="aiverse.canvas.edit"){
    const op=p.edit;
    if(op.type==="note.add")doc.board.nodes.push({id:op.id,kind:"note",text:op.text,x:op.x,y:op.y});
    else if(op.type==="note.text")owner(doc.board.nodes.find(n=>n.id===op.id)).text=op.text;
    else if(op.type==="note.move"){const n=owner(doc.board.nodes.find(n=>n.id===op.id));n.x=op.x;n.y=op.y;}
    else if(op.type==="note.remove"){
      doc.board.nodes=doc.board.nodes.filter(n=>n.id!==op.id);
      doc.board.edges=doc.board.edges.filter(e=>e.from!==op.id&&e.to!==op.id);
    }else if(op.type==="edge.add")doc.board.edges.push({id:op.id,from:op.from,to:op.to});
    else if(op.type==="edge.remove")doc.board.edges=doc.board.edges.filter(e=>e.id!==op.id);
    else throw canvasError("CANVAS_EDIT_UNSUPPORTED");
  }else throw canvasError("UNKNOWN_METHOD");
  doc.version++;doc.updatedAt=stamp();saveRevision(doc);
  return {...snapshot(),document:clone(doc)};
}

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
    if(frame.method.startsWith("aiverse.canvas.")){
      let body;
      try{body={type:"res",v:"1.0",id:frame.id,ok:true,systemId:frame.systemId,
        result:fixtureCanvas(frame),observedAt:new Date().toISOString()};}
      catch(error){body={type:"res",v:"1.0",id:frame.id,ok:false,systemId:frame.systemId,
        error:{code:error.code??"CANVAS_OWNER_UNAVAILABLE",message:"Canvas operation denied"},
        observedAt:new Date().toISOString()};}
      res.writeHead(200,{"content-type":"application/json","cache-control":"no-store"})
        .end(JSON.stringify(body));return;
    }
    let result;
    if(frame.method==="system.registry.summary"){
      result={source:"dashboard-os-registry",systemId:frame.systemId,
        workspaceId:frame.workspaceId,registered:1,authorized:1,workspaces:1,
        selectedAuthorized:true};
    }else if(frame.method==="aiverse.gateway.status"){
      result={source:"canonical-gateway",workspaceId:frame.workspaceId,
        runCancelSupported:true,runPauseResumeSupported:frame.workspaceId==="operator",
        capabilities:{controls:true,runCancel:true,runPauseResume:true}};
    }else if(frame.method==="aiverse.gateway.models"){
      result={source:"canonical-gateway",workspaceId:frame.workspaceId,
        models:[{id:"aiverse",label:"AI-Verse Gateway",kind:"gateway-virtual"}],
        runtimeKind:"deterministic",modelSelectionSupported:false,
        providerSelectionSupported:false,inferenceVerified:false,
        evidence:"authenticated-status-and-models",observedAt:"2026-10-30T00:00:00Z"};
    }else if(frame.method==="aiverse.gateway.session.list"){
      // The fixture models a bounded canonical Gateway history, not browser storage.
      const count=frame.workspaceId==="operator"?47:3;
      const all=Array.from({length:count},(_,index)=>({
        session_id:"historical-"+String(index+1).padStart(3,"0"),
        system_id:"canonical-a",workspace_id:frame.workspaceId,
        title:"Canonical chat "+String(index+1).padStart(2,"0"),
        status:"completed",updated_at:"2026-10-29T20:00:00Z",
      }));
      const offset=frame.params?.offset??0,limit=frame.params?.limit??20;
      const has_more=offset+limit<count;
      result={object:"list",data:all.slice(offset,offset+limit),has_more,
        next_offset:has_more?offset+limit:null,
        workspaceId:frame.workspaceId,source:"canonical-gateway"};
    }else if(frame.method==="aiverse.gateway.session.runs"){
      const total=78,sessionId=frame.params?.sessionId;
      const all=Array.from({length:total},(_,i)=>{
        const n=String(total-i).padStart(3,"0");
        return {run_id:"history-run-"+n,session_id:sessionId,status:"completed",
          user_text:"Historical user "+n,output:"Historical AI "+n,
          user_text_truncated:false,output_truncated:false};
      });
      const offset=frame.params?.offset??0,limit=frame.params?.limit??25;
      const has_more=offset+limit<all.length;
      result={source:"canonical-gateway",workspaceId:frame.workspaceId,
        sessionId,object:"list",data:all.slice(offset,offset+limit),has_more,
        next_offset:has_more?offset+limit:null};
    }else if(frame.method==="aiverse.gateway.run.create"){
      const runId="run-"+(++next);
      result={runId,sessionId:frame.params?.sessionId??"session-"+next,systemId:"canonical-a",
        workspaceId:frame.workspaceId,status:"running",source:"canonical-gateway",
        usage:{inputTokens:0,outputTokens:0,actions:0},
        createdAt:"2026-10-30T11:00:00.000Z",runtimeKind:"deterministic"};
      runs.set(runId,{...result,output:"Authoritative answer "+next,
        usage:{inputTokens:123,outputTokens:48,actions:2},
        completedAt:"2026-10-30T11:00:06.000Z",
        privateBearer:"do-not-show",reportedCost:99.99,
        dropFirstStream:frame.params?.messages?.some(m=>m.content==="Test dropped stream")===true,
        slowStream:frame.params?.messages?.some(m=>
          ["Test stop active run","Test pause and resume same run"].includes(m.content))===true,
        slowDiagnostics:frame.params?.messages?.some(m=>m.content==="Test slow diagnostics")===true,
        subscriptions:0});
    }else if(frame.method==="aiverse.gateway.run.diagnostics"){
      const found=runs.get(frame.params?.runId);
      if(!found||found.workspaceId!==frame.workspaceId
        ||found.sessionId!==frame.params?.sessionId){
        res.writeHead(200,{"content-type":"application/json"}).end(JSON.stringify({
          type:"res",v:"1.0",id:frame.id,ok:false,systemId:frame.systemId,
          error:{code:"SESSION_BINDING_MISMATCH",message:"Denied"},
          observedAt:new Date().toISOString()}));return;
      }
      if(found.slowDiagnostics)await new Promise(resolve=>setTimeout(resolve,350));
      result={source:"canonical-gateway",runId:frame.params.runId,
        sessionId:frame.params.sessionId,workspaceId:frame.workspaceId,
        status:found.status,context:{status:"ready",window_tokens:8192,configured:true},
        retrieval:{source_reads:4,gateway_source_range_reads:2,legacy_reads:0},
        archive:{retrieval_depth:1},folds:{valid_cards:2,invalid_cards:0,pendingFoldWork:false},
        safety:{rawContentIncluded:false,promptsIncluded:false,chainOfThoughtIncluded:false}};
    }else if(frame.method==="aiverse.gateway.run.pause"
      ||frame.method==="aiverse.gateway.run.resume"){
      const found=runs.get(frame.params?.runId);
      if(!found||found.workspaceId!==frame.workspaceId
        ||found.sessionId!==frame.params?.sessionId
        ||typeof frame.params?.operationId!=="string"){
        res.writeHead(200,{"content-type":"application/json"}).end(JSON.stringify({
          type:"res",v:"1.0",id:frame.id,ok:false,systemId:frame.systemId,
          error:{code:"RUN_BINDING_MISMATCH",message:"Scope denied"},
          observedAt:new Date().toISOString()}));return;
      }
      const isPause=frame.method.endsWith(".pause");
      const valid=isPause?found.status==="running":found.status==="paused";
      if(!valid){
        res.writeHead(200,{"content-type":"application/json"}).end(JSON.stringify({
          type:"res",v:"1.0",id:frame.id,ok:false,systemId:frame.systemId,
          error:{code:isPause?"RUN_NOT_PAUSABLE":"RUN_NOT_RESUMABLE",message:"State conflict"},
          observedAt:new Date().toISOString()}));return;
      }
      found.status=isPause?"paused":"resuming";result={...found};
    }else if(frame.method==="aiverse.gateway.run.cancel"){
      const found=runs.get(frame.params?.runId);
      if(!found||found.workspaceId!==frame.workspaceId
        ||found.sessionId!==frame.params?.sessionId
        ||typeof frame.params?.operationId!=="string"){
        res.writeHead(200,{"content-type":"application/json"}).end(JSON.stringify({
          type:"res",v:"1.0",id:frame.id,ok:false,systemId:frame.systemId,
          error:{code:"RUN_BINDING_MISMATCH",message:"Scope denied"},
          observedAt:new Date().toISOString()}));return;
      }
      found.status="canceled";result={...found};
    }else if(frame.method==="aiverse.gateway.run.get"){
      const found=runs.get(frame.params?.runId);
      if(!found || found.workspaceId!==frame.workspaceId){
        res.writeHead(200,{"content-type":"application/json"}).end(JSON.stringify({
          type:"res",v:"1.0",ok:false,systemId:frame.systemId,
          error:{code:"RUN_BINDING_MISMATCH",message:"Scope denied"},observedAt:new Date().toISOString(),
        }));return;
      }
      result={...found,status:["canceled","paused"].includes(found.status)?found.status
        :found.dropFirstStream && found.subscriptions<2?"running":"completed"};
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
        run.subscriptions=(run.subscriptions??0)+1;
        makeEvent("run.started",1);
        if(run.dropFirstStream && run.subscriptions===1){
          makeEvent("assistant.delta",2,"UNVERIFIED DRAFT");
          ws.close(1011,"fixture stream interruption");
          return;
        }
        makeEvent("assistant.delta",2,"Draft stream");
        if(run.slowStream && run.status!=="resuming")return; // Wait for a real control, not WS closure.
        if(run.slowStream && run.status==="resuming"){
          makeEvent("run.resumed",3);
          makeEvent("assistant.delta",4,"Fresh resumed generation");
          makeEvent("run.completed",5);
        }else makeEvent("run.completed",3);
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
  const context=await browser.newContext({viewport:{width:1500,height:900},acceptDownloads:true});
  t.after(()=>context.close());
  const page=await context.newPage();
  page.setDefaultTimeout(6500);
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
  try{await page.getByText("Authoritative answer 1").waitFor();}catch(error){
    const rendered=await page.locator(".live-chat-pane").first().innerText();
    throw new Error("Chat runtime diagnostic: "+JSON.stringify({
      errors,requests:requests.map(x=>({method:x.method,scope:x.workspaceId})),
      rendered:rendered.slice(0,900),runs:[...runs.keys()],
    })+" / "+String(error));
  }
  assert.equal(await page.locator(".live-chat-message.user").count(),1);
  assert.equal(await page.locator(".live-chat-message.assistant p").innerText(),"Authoritative answer 1");
  const chatRequests=requests.filter(r=>[
    "aiverse.gateway.run.create","aiverse.gateway.run.get"].includes(r.method));
  assert.equal(chatRequests[0].method,"aiverse.gateway.run.create");
  assert.equal(chatRequests[0].workspaceId,"operator");
  assert.deepEqual(chatRequests[0].params.messages,[{
    role:"user",content:"Can you draft a film brief?",
  }]);
  assert.equal(chatRequests[1].method,"aiverse.gateway.run.get");
  assert.deepEqual(errors,[]);
  const browserStorage=await page.evaluate(()=>({
    local:localStorage.length,session:sessionStorage.length,
  }));
  assert.deepEqual(browserStorage,{local:0,session:0},"real turns and tokens never enter preview localStorage");
});
test("Real Chat Stop invokes exactly one authorized canonical cancel and keeps draft output unconfirmed",async t=>{
  const {page,errors}=await pageFor(t);
  const pane=page.locator(".live-chat-pane").first();
  const stop=pane.getByRole("button",{name:"Stop run"});
  assert.equal(await stop.isDisabled(),true);
  const before=requests.length;
  await pane.locator(".live-chat-input").fill("Test stop active run");
  await pane.getByRole("button",{name:"Send",exact:true}).click();
  await page.waitForFunction(()=>{
    const stop=document.querySelector(".live-chat-stop");
    return stop instanceof HTMLButtonElement && !stop.disabled;
  });
  await stop.click();
  await pane.locator(".live-chat-status").getByText(/canceled/).waitFor();
  assert.equal(await stop.isDisabled(),true);
  assert.equal(await pane.locator(".live-chat-message.user").count(),1);
  assert.doesNotMatch(await pane.locator(".live-chat-log").innerText(),/Draft stream|Authoritative answer/);
  const calls=requests.slice(before).filter(x=>x.method.startsWith("aiverse.gateway.run."));
  assert.equal(calls.filter(x=>x.method==="aiverse.gateway.run.create").length,1);
  assert.equal(calls.filter(x=>x.method==="aiverse.gateway.run.cancel").length,1);
  const created=calls.find(x=>x.method==="aiverse.gateway.run.create");
  const canceled=calls.find(x=>x.method==="aiverse.gateway.run.cancel");
  assert.ok(created&&canceled);
  assert.match(canceled.params.runId,/^run-/);
  assert.match(canceled.params.sessionId,/^session-/);
  assert.ok(/^[A-Fa-f0-9-]{36}$/.test(canceled.params.operationId));
  assert.equal(await pane.locator(".live-chat-message.status").getByText("Response stopped").count(),1);
  assert.equal(await pane.getByRole("button",{name:"Send",exact:true}).isEnabled(),true);
  await pane.locator(".live-chat-input").fill("Continue from stopped run");
  await pane.getByRole("button",{name:"Send",exact:true}).click();
  await pane.locator(".live-chat-message.assistant p").getByText(/Authoritative answer/).waitFor();
  const creations=requests.slice(before).filter(x=>x.method==="aiverse.gateway.run.create");
  assert.equal(creations.length,2);
  assert.equal(creations[1].params.sessionId,canceled.params.sessionId);
  assert.deepEqual(creations[1].params.messages,[
    {role:"user",content:"Continue from stopped run"},
  ]);
  assert.deepEqual(errors,[]);
});
test("Chat Pause and Resume controls a single existing canonical run and respects workspace grant",async t=>{
  const {page,errors}=await pageFor(t);
  const pane=page.locator(".live-chat-pane").first(),before=requests.length;
  const pause=pane.getByRole("button",{name:"Pause run"});
  const resume=pane.getByRole("button",{name:"Resume run"});
  assert.equal(await pause.isDisabled(),true);
  assert.equal(await resume.isDisabled(),true);
  await pane.locator(".live-chat-input").fill("Test pause and resume same run");
  await pane.getByRole("button",{name:"Send",exact:true}).click();
  await pause.waitFor({state:"visible"});
  await page.waitForFunction(()=>{
    const p=document.querySelector(".live-chat-pause");
    return p instanceof HTMLButtonElement&&!p.disabled;
  });
  assert.equal(await resume.isDisabled(),true);
  await pause.click();
  await pane.locator(".live-chat-status").getByText(/paused/).waitFor();
  assert.equal(await pause.isDisabled(),true);
  assert.equal(await resume.isEnabled(),true);
  assert.equal(await pane.getByRole("button",{name:"Send",exact:true}).isDisabled(),true);
  await resume.click();
  await pane.locator(".live-chat-message.assistant p").getByText(/Authoritative answer/).waitFor();
  assert.equal(await resume.isDisabled(),true);
  const relevant=requests.slice(before)
    .filter(r=>r.method.startsWith("aiverse.gateway.run."));
  assert.equal(relevant.filter(r=>r.method==="aiverse.gateway.run.create").length,1);
  assert.equal(relevant.filter(r=>r.method==="aiverse.gateway.run.pause").length,1);
  assert.equal(relevant.filter(r=>r.method==="aiverse.gateway.run.resume").length,1);
  const create=relevant.find(r=>r.method==="aiverse.gateway.run.create");
  const paused=relevant.find(r=>r.method==="aiverse.gateway.run.pause");
  const resumed=relevant.find(r=>r.method==="aiverse.gateway.run.resume");
  assert.ok(create&&paused&&resumed);
  assert.equal(paused.params.runId,resumed.params.runId);
  assert.equal(paused.params.sessionId,resumed.params.sessionId);
  assert.ok(/^[A-Fa-f0-9-]{36}$/.test(paused.params.operationId));
  assert.ok(/^[A-Fa-f0-9-]{36}$/.test(resumed.params.operationId));
  assert.notEqual(paused.params.operationId,resumed.params.operationId);
  await page.evaluate(()=>window.chatApp.retarget({systemId:"aiverse-01",workspaceId:"film"}));
  await pane.locator(".live-chat-input").fill("Test pause and resume same run");
  await pane.getByRole("button",{name:"Send",exact:true}).click();
  await pane.locator(".live-chat-status").getByText(/running/).waitFor();
  assert.equal(await pause.isDisabled(),true,
    "operator checkpoint grant cannot be reused in another workspace");
  assert.equal(await resume.isDisabled(),true);
  assert.deepEqual(errors,[]);
});
test("Chat can Stop a paused run with separately granted owner cancellation",async t=>{
  const {page,errors}=await pageFor(t);
  const pane=page.locator(".live-chat-pane").first(),before=requests.length;
  const pause=pane.getByRole("button",{name:"Pause run"});
  const stop=pane.getByRole("button",{name:"Stop run"});
  await pane.locator(".live-chat-input").fill("Test pause and resume same run");
  await pane.getByRole("button",{name:"Send",exact:true}).click();
  await page.waitForFunction(()=>{
    const button=document.querySelector(".live-chat-pause");
    return button instanceof HTMLButtonElement&&!button.disabled;
  });
  await pause.click();
  await pane.locator(".live-chat-status").getByText(/paused/).waitFor();
  assert.equal(await stop.isEnabled(),true);
  await stop.click();
  await pane.locator(".live-chat-status").getByText(/canceled/).waitFor();
  assert.equal(await pane.getByRole("button",{name:"Resume run"}).isDisabled(),true);
  const calls=requests.slice(before).filter(r=>r.method.startsWith("aiverse.gateway.run."));
  assert.deepEqual(calls.map(r=>r.method),[
    "aiverse.gateway.run.create","aiverse.gateway.run.pause","aiverse.gateway.run.cancel",
  ]);
  assert.equal(calls[1].params.runId,calls[2].params.runId);
  assert.equal(calls[1].params.sessionId,calls[2].params.sessionId);
  assert.deepEqual(errors,[]);
});
test("Check run tracks externally paused and completed canonical state without control mutations",async t=>{
  const {page,errors}=await pageFor(t),before=requests.length;
  const pane=page.locator(".live-chat-pane").first();
  const check=pane.getByRole("button",{name:"Check run"});
  assert.equal(await check.isDisabled(),true);
  await pane.locator(".live-chat-input").fill("Test pause and resume same run");
  await pane.getByRole("button",{name:"Send",exact:true}).click();
  await page.waitForFunction(()=>{
    const run=document.querySelector(".live-chat-status")?.textContent??"";
    return run.startsWith("running");
  });
  const created=requests.slice(before).find(r=>r.method==="aiverse.gateway.run.create");
  assert.ok(created);
  const createdRun=[...runs.values()].at(-1);
  assert.ok(createdRun);
  createdRun.status="paused";
  await check.click();
  await pane.locator(".live-chat-status").getByText(/paused/).waitFor();
  assert.equal(await pane.getByRole("button",{name:"Resume run"}).isEnabled(),true);
  createdRun.status="completed";
  await check.click();
  await pane.locator(".live-chat-message.assistant p").getByText(/Authoritative answer/).waitFor();
  const calls=requests.slice(before).filter(r=>r.method.startsWith("aiverse.gateway.run."));
  assert.equal(calls.filter(r=>r.method==="aiverse.gateway.run.create").length,1);
  assert.equal(calls.filter(r=>r.method==="aiverse.gateway.run.get").length,2);
  assert.equal(calls.filter(r=>r.method==="aiverse.gateway.run.pause").length,0);
  assert.equal(calls.filter(r=>r.method==="aiverse.gateway.run.resume").length,0);
  assert.deepEqual(errors,[]);
});
test("per-pane Run details shows only actual Gateway usage and never treats it as billed cost",async t=>{
  const {page,errors}=await pageFor(t);
  const pane=page.locator(".live-chat-pane").first();
  const details=pane.getByRole("button",{name:"Run details"});
  assert.equal(await details.isDisabled(),true);
  await pane.locator(".live-chat-input").fill("Get canonical execution evidence");
  await pane.getByRole("button",{name:"Send",exact:true}).click();
  await pane.locator(".live-chat-message.assistant p").getByText(/Authoritative answer/).waitFor();
  assert.equal(await details.isEnabled(),true);
  assert.equal(await details.getAttribute("aria-expanded"),"false");
  await details.click();
  const receipt=pane.locator(".live-chat-receipt");
  assert.equal(await receipt.isVisible(),true);
  assert.equal(await details.getAttribute("aria-expanded"),"true");
  assert.match(await receipt.innerText(),/Canonical Gateway, authenticated owner read/);
  assert.match(await receipt.innerText(),/Input tokens \(Gateway\)\s*123/);
  assert.match(await receipt.innerText(),/Output tokens \(Gateway\)\s*48/);
  assert.match(await receipt.innerText(),/Actions \(Gateway\)\s*2/);
  assert.match(await receipt.innerText(),/deterministic/);
  assert.match(await receipt.innerText(),/not Token-verified billing/);
  assert.doesNotMatch(await receipt.innerText(),/do-not-show|privateBearer|reportedCost|99\.99/);
  await details.click();
  assert.equal(await receipt.isVisible(),false);
  await pane.getByRole("button",{name:"New chat"}).click();
  assert.equal(await details.isDisabled(),true);
  assert.equal(await receipt.isVisible(),false);
  await page.evaluate(()=>window.chatApp.retarget({systemId:"aiverse-01",workspaceId:"film"}));
  assert.equal(await details.isDisabled(),true);
  assert.deepEqual(errors,[]);
});
test("Find messages locates loaded canonical turns, pages older records and never persists search",async t=>{
  const {page,errors}=await pageFor(t);
  const before=requests.length;
  const pane=page.locator(".live-chat-pane").first();
  await page.getByRole("button",{name:"Previous chats"}).click();
  await page.locator(".live-chat-history-item").first().getByRole("button",{name:"Open conversation"}).click();
  await pane.getByRole("button",{name:"Load older messages"}).waitFor();
  const find=pane.getByRole("button",{name:"Find messages"});
  await find.click();
  assert.equal(await find.getAttribute("aria-expanded"),"true");
  const input=pane.getByRole("searchbox",{name:"Search loaded messages"});
  await input.fill("Historical user 051");
  assert.match(await pane.locator(".live-chat-find-count").innerText(),/1 of 1 matching loaded messages/);
  assert.equal(await pane.locator(".live-chat-match").count(),1);
  assert.equal(await pane.locator(".live-chat-match").innerText(),"Historical user 051");
  await input.fill("Historical user");
  assert.match(await pane.locator(".live-chat-find-count").innerText(),/1 of 50 matching loaded messages/);
  await pane.getByRole("button",{name:"Next match"}).click();
  assert.match(await pane.locator(".live-chat-find-count").innerText(),/2 of 50 matching loaded messages/);
  await pane.getByRole("button",{name:"Previous match"}).click();
  assert.match(await pane.locator(".live-chat-find-count").innerText(),/1 of 50 matching loaded messages/);
  await pane.getByRole("button",{name:"Load older messages"}).click();
  await pane.locator(".live-chat-message").nth(149).waitFor();
  assert.match(await pane.locator(".live-chat-find-count").innerText(),/1 of 75 matching loaded messages/);
  await pane.getByRole("button",{name:"Load older messages"}).click();
  await pane.locator(".live-chat-message").nth(155).waitFor();
  assert.match(await pane.locator(".live-chat-find-count").innerText(),/1 of 78 matching loaded messages/);
  await input.fill("UNSEEN SECRET");
  assert.match(await pane.locator(".live-chat-find-count").innerText(),/No matches in loaded messages/);
  assert.equal(await pane.getByRole("button",{name:"Next match"}).isDisabled(),true);
  await input.press("Escape");
  assert.equal(await find.getAttribute("aria-expanded"),"false");
  assert.equal(await pane.locator(".live-chat-find").isVisible(),false);
  assert.equal(requests.slice(before).filter(r=>r.method==="aiverse.gateway.run.create").length,0);
  assert.equal(requests.slice(before).filter(r=>r.method==="aiverse.gateway.session.runs").length,4);
  assert.deepEqual(await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length})),
    {local:0,session:0});
  await page.evaluate(()=>window.chatApp.retarget({systemId:"aiverse-01",workspaceId:"film"}));
  assert.equal(await pane.locator(".live-chat-find-input").inputValue(),"");
  assert.equal(await pane.locator(".live-chat-find").isVisible(),false);
  assert.deepEqual(errors,[]);
});
test("Export loaded conversation saves verified Gateway text locally without leaking raw receipt or status",async t=>{
  const {page,errors}=await pageFor(t),before=requests.length;
  const pane=page.locator(".live-chat-pane").first();
  const exporter=pane.getByRole("button",{name:"Export loaded"});
  assert.equal(await exporter.isDisabled(),true);
  await pane.locator(".live-chat-input").fill("Film shoot notes for local export");
  await pane.getByRole("button",{name:"Send",exact:true}).click();
  await pane.locator(".live-chat-message.assistant p").getByText(/Authoritative answer/).waitFor();
  assert.equal(await exporter.isEnabled(),true);
  const downloadEvent=page.waitForEvent("download");
  await exporter.click();
  const download=await downloadEvent;
  assert.equal(download.suggestedFilename(),"aiverse-loaded-conversation.txt");
  const content=await readFile(await download.path(),"utf8");
  assert.match(content,/AI-Verse canonical conversation, loaded transcript only/);
  assert.match(content,/Source: authenticated canonical Gateway projection/);
  assert.match(content,/You:\nFilm shoot notes for local export/);
  assert.match(content,/AI-Verse:\nAuthoritative answer/);
  assert.match(content,/may not be loaded and Gateway history fields may be truncated/);
  assert.doesNotMatch(content,/do-not-show|privateBearer|reportedCost|99\.99|password/);
  assert.equal(requests.slice(before).filter(x=>x.method==="aiverse.gateway.run.create").length,1);
  assert.deepEqual(await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length})),
    {local:0,session:0});
  await pane.getByRole("button",{name:"New chat"}).click();
  assert.equal(await exporter.isDisabled(),true);
  assert.deepEqual(errors,[]);
});
test("export from canonical history includes only currently loaded pages and expands after Load older",async t=>{
  const {page,errors}=await pageFor(t);
  const pane=page.locator(".live-chat-pane").first();
  await page.getByRole("button",{name:"Previous chats"}).click();
  await page.locator(".live-chat-history-item").first().getByRole("button",{name:"Open conversation"}).click();
  await pane.getByRole("button",{name:"Load older messages"}).waitFor();
  assert.equal(await pane.locator(".live-chat-message").count(),100);
  const firstDownload=page.waitForEvent("download");
  await pane.getByRole("button",{name:"Export loaded"}).click();
  const first=await firstDownload;
  const partial=await readFile(await first.path(),"utf8");
  assert.match(partial,/Historical user 029/);
  assert.doesNotMatch(partial,/Historical user 001/);
  assert.match(partial,/Older pages may not be loaded/);
  await pane.getByRole("button",{name:"Load older messages"}).click();
  await pane.locator(".live-chat-message").nth(149).waitFor();
  await pane.getByRole("button",{name:"Load older messages"}).click();
  await pane.locator(".live-chat-message").nth(155).waitFor();
  const fullDownload=page.waitForEvent("download");
  await pane.getByRole("button",{name:"Export loaded"}).click();
  const full=await fullDownload;
  const text=await readFile(await full.path(),"utf8");
  assert.match(text,/Historical user 001/);
  assert.match(text,/Historical AI 078/);
  assert.ok(text.indexOf("Historical user 001")<text.indexOf("Historical user 078"),
    "export order is actual Gateway chronological order");
  assert.equal((text.match(/\nYou:\n/g)??[]).length,78);
  assert.equal((text.match(/\nAI-Verse:\n/g)??[]).length,78);
  assert.doesNotMatch(text,/privateBearer|do-not-show|reportedCost/);
  assert.deepEqual(errors,[]);
});
test("G06.1 workspace status inspects a real scoped run with factual safe diagnostics only",async t=>{
  const {page,errors}=await pageFor(t),before=requests.length;
  const pane=page.locator(".live-chat-pane").first();
  await pane.locator(".live-chat-input").fill("Gateway diagnostic subject");
  await pane.getByRole("button",{name:"Send",exact:true}).click();
  await pane.locator(".live-chat-message.assistant p").getByText(/Authoritative answer/).waitFor();
  const run=[...runs.values()].at(-1);
  assert.ok(run?.runId&&run?.sessionId);
  await page.getByRole("button",{name:"Workspace status"}).click();
  const panel=page.locator(".personal-diagnostics");
  await panel.getByRole("button",{name:"Refresh workspace status"}).waitFor();
  await panel.getByRole("textbox",{name:"Diagnostic run ID"}).fill(run.runId);
  await panel.getByRole("textbox",{name:"Diagnostic session ID"}).fill(run.sessionId);
  await panel.getByRole("button",{name:"Inspect run"}).click();
  const result=panel.locator(".personal-diagnostics-run-result");
  await result.getByText(/Canonical run diagnostics/).waitFor();
  assert.match(await result.innerText(),/Source reads: 4/);
  await panel.locator(".personal-diagnostics-source").getByText("Registered OS systems").waitFor();
  assert.match(await panel.textContent(),/1 registered · 1 authorized/);
  assert.doesNotMatch(await panel.textContent(),/should-not-be-visible/);
  assert.match(await result.innerText(),/Validated folds: 2/);
  assert.match(await result.innerText(),/Raw prompts and traces excluded/);
  assert.doesNotMatch(await result.innerText(),/privateBearer|do-not-show|reportedCost/);
  const calls=requests.slice(before).filter(x=>x.method==="aiverse.gateway.run.diagnostics");
  assert.equal(calls.length,1);
  assert.deepEqual(calls[0].params,{runId:run.runId,sessionId:run.sessionId});
  assert.equal(calls[0].workspaceId,"operator");
  assert.ok(requests.slice(before).some(x=>x.method==="system.registry.summary"));
  assert.equal(requests.slice(before).filter(x=>x.method==="system.list").length,0,
    "paired UI must not obtain the full OS registry");
  assert.equal(requests.slice(before).filter(x=>x.method==="aiverse.gateway.run.create").length,1);
  assert.deepEqual(await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length})),
    {local:0,session:0});
  assert.deepEqual(errors,[]);
});
test("G06.1 diagnostic inspect rejects wrong session and clears scope after workspace switch",async t=>{
  const {page,errors}=await pageFor(t),before=requests.length;
  const pane=page.locator(".live-chat-pane").first();
  await pane.locator(".live-chat-input").fill("Scoped diagnostic subject");
  await pane.getByRole("button",{name:"Send",exact:true}).click();
  await pane.locator(".live-chat-message.assistant p").getByText(/Authoritative answer/).waitFor();
  const run=[...runs.values()].at(-1);
  await page.getByRole("button",{name:"Workspace status"}).click();
  const panel=page.locator(".personal-diagnostics");
  await panel.getByRole("textbox",{name:"Diagnostic run ID"}).fill(run.runId);
  await panel.getByRole("textbox",{name:"Diagnostic session ID"}).fill("wrong-session");
  await panel.getByRole("button",{name:"Inspect run"}).click();
  await panel.locator(".personal-diagnostics-run-result").getByText(/Run diagnostics unavailable/).waitFor();
  assert.equal((await panel.locator(".personal-diagnostics-run-result").innerText()).includes("Source reads"),false);
  await page.evaluate(()=>window.chatApp.retarget({systemId:"aiverse-01",workspaceId:"film"}));
  assert.equal(await panel.getByRole("textbox",{name:"Diagnostic run ID"}).inputValue(),"");
  assert.equal(await panel.getByRole("textbox",{name:"Diagnostic session ID"}).inputValue(),"");
  await panel.getByRole("textbox",{name:"Diagnostic run ID"}).fill(run.runId);
  await panel.getByRole("textbox",{name:"Diagnostic session ID"}).fill(run.sessionId);
  await panel.getByRole("button",{name:"Inspect run"}).click();
  await panel.locator(".personal-diagnostics-run-result").getByText(/Run diagnostics unavailable/).waitFor();
  const calls=requests.slice(before).filter(x=>x.method==="aiverse.gateway.run.diagnostics");
  assert.equal(calls.length,2);
  assert.deepEqual(calls.map(x=>x.workspaceId),["operator","film"]);
  assert.deepEqual(errors,[]);
});
test("G06.1 stale diagnostics never repaint the Workspace Status panel after OS switch",async t=>{
  const {page,errors}=await pageFor(t);
  const pane=page.locator(".live-chat-pane").first();
  await pane.locator(".live-chat-input").fill("Test slow diagnostics");
  await pane.getByRole("button",{name:"Send",exact:true}).click();
  await pane.locator(".live-chat-message.assistant p").getByText(/Authoritative answer/).waitFor();
  const run=[...runs.values()].at(-1);
  await page.getByRole("button",{name:"Workspace status"}).click();
  const panel=page.locator(".personal-diagnostics");
  await panel.getByRole("textbox",{name:"Diagnostic run ID"}).fill(run.runId);
  await panel.getByRole("textbox",{name:"Diagnostic session ID"}).fill(run.sessionId);
  await panel.getByRole("button",{name:"Inspect run"}).click();
  await panel.locator(".personal-diagnostics-run-result").getByText(/Inspecting canonical run/).waitFor();
  await page.evaluate(()=>window.chatApp.retarget({systemId:"aiverse-01",workspaceId:"film"}));
  await page.waitForTimeout(480);
  const details=await panel.locator(".personal-diagnostics-run-result").innerText();
  assert.match(details,/Inspect a canonical run/);
  assert.doesNotMatch(details,/Source reads|Canonical run diagnostics/);
  assert.equal(await panel.getByRole("textbox",{name:"Diagnostic run ID"}).inputValue(),"");
  assert.equal(await panel.getByRole("textbox",{name:"Diagnostic session ID"}).inputValue(),"");
  assert.deepEqual(errors,[]);
});
test("G06.1 changing an inspection ID while Gateway responds revokes the old result",async t=>{
  const {page,errors}=await pageFor(t);
  const pane=page.locator(".live-chat-pane").first();
  await pane.locator(".live-chat-input").fill("Test slow diagnostics");
  await pane.getByRole("button",{name:"Send",exact:true}).click();
  await pane.locator(".live-chat-message.assistant p").getByText(/Authoritative answer/).waitFor();
  const run=[...runs.values()].at(-1);
  await page.getByRole("button",{name:"Workspace status"}).click();
  const panel=page.locator(".personal-diagnostics");
  await panel.getByRole("textbox",{name:"Diagnostic run ID"}).fill(run.runId);
  await panel.getByRole("textbox",{name:"Diagnostic session ID"}).fill(run.sessionId);
  await panel.getByRole("button",{name:"Inspect run"}).click();
  await panel.locator(".personal-diagnostics-run-result").getByText(/Inspecting canonical run/).waitFor();
  await panel.getByRole("textbox",{name:"Diagnostic session ID"}).fill("different-session");
  await page.waitForTimeout(450);
  const message=await panel.locator(".personal-diagnostics-run-result").innerText();
  assert.match(message,/Run\/session changed/);
  assert.doesNotMatch(message,/Source reads|Canonical run diagnostics/);
  assert.equal(await panel.getByRole("button",{name:"Inspect run"}).isEnabled(),true);
  assert.deepEqual(errors,[]);
});
test("Chat model panel reads real scoped Gateway inventory and never shows fake provider switching",async t=>{
  const {page,errors}=await pageFor(t);
  const before=requests.length;
  await page.getByRole("button",{name:"AI models"}).click();
  await page.locator(".personal-model-name").getByText("AI-Verse Gateway (aiverse)").waitFor();
  assert.match(await page.locator(".personal-model-status").innerText(),/selection is not supported/);
  assert.equal(await page.locator(".personal-model-status select").count(),0);
  assert.deepEqual(requests.slice(before)
    .filter(x=>x.method==="aiverse.gateway.models")
    .map(x=>[x.systemId,x.workspaceId]),[["aiverse-01","operator"]]);
  await page.evaluate(()=>window.chatApp.retarget({systemId:"aiverse-01",workspaceId:"film"}));
  await page.locator(".personal-model-status-heading").getByText(/film/).waitFor();
  const after=requests.filter(x=>x.method==="aiverse.gateway.models");
  assert.equal(after.at(-1).workspaceId,"film");
  assert.deepEqual(errors,[]);
});
test("Chat reconnect recovers a dropped WebSocket without creating a second canonical run",async t=>{
  const {page,errors}=await pageFor(t);
  const before=requests.length;
  const pane=page.locator(".live-chat-pane").first();
  const reconnect=pane.getByRole("button",{name:"Reconnect run"});
  assert.equal(await reconnect.isDisabled(),true);
  await pane.locator(".live-chat-input").fill("Test dropped stream");
  await pane.getByRole("button",{name:"Send",exact:true}).click();
  await pane.locator(".live-chat-status").getByText(/interrupted/).waitFor();
  assert.equal(await reconnect.isEnabled(),true);
  await reconnect.click();
  await pane.locator(".live-chat-message.assistant p").getByText(/Authoritative answer/).waitFor();
  assert.equal(await reconnect.isDisabled(),true);
  assert.equal(await pane.locator(".live-chat-message.user").count(),1);
  assert.doesNotMatch(await pane.locator(".live-chat-log").innerText(),/UNVERIFIED DRAFT/);
  const rpc=requests.slice(before).filter(x=>x.method.startsWith("aiverse.gateway."));
  assert.equal(rpc.filter(x=>x.method==="aiverse.gateway.run.create").length,1);
  assert.equal(rpc.filter(x=>x.method==="aiverse.gateway.run.get").length,2);
  assert.deepEqual(errors,[]);
});
test("Chat library pages through real scoped Gateway RPC without duplicates or browser storage",async t=>{
  const {page,errors}=await pageFor(t);
  const before=requests.length;
  await page.getByRole("button",{name:"Previous chats"}).click();
  await page.locator(".live-chat-history-item").first().waitFor();
  assert.equal(await page.locator(".live-chat-history-item").count(),20);
  assert.equal(await page.getByRole("button",{name:"Load older chats"}).count(),1);
  await page.getByRole("button",{name:"Load older chats"}).click();
  await page.locator(".live-chat-history-item").nth(39).waitFor();
  assert.equal(await page.locator(".live-chat-history-item").count(),40);
  await page.getByRole("button",{name:"Load older chats"}).click();
  await page.locator(".live-chat-history-item").nth(46).waitFor();
  assert.equal(await page.locator(".live-chat-history-item").count(),47);
  assert.equal(await page.getByRole("button",{name:"Load older chats"}).count(),0);
  const titles=await page.locator(".live-chat-history-item span").allTextContents();
  assert.equal(new Set(titles).size,47,"repeated pages must not duplicate canonical sessions");
  const offsets=requests.slice(before)
    .filter(x=>x.method==="aiverse.gateway.session.list")
    .map(x=>[x.workspaceId,x.params.limit,x.params.offset]);
  assert.deepEqual(offsets,[["operator",20,0],["operator",20,20],["operator",20,40]]);
  await page.evaluate(()=>window.chatApp.retarget({systemId:"aiverse-01",workspaceId:"film"}));
  assert.equal(await page.locator(".live-chat-history-item").count(),0);
  await page.getByRole("button",{name:"Previous chats"}).click();
  await page.locator(".live-chat-history-item").first().waitFor();
  assert.equal(await page.locator(".live-chat-history-item").count(),3);
  assert.equal(await page.getByRole("button",{name:"Load older chats"}).count(),0);
  assert.deepEqual(errors,[]);
  assert.deepEqual(await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length})),
    {local:0,session:0});
});
test("Chat opens real canonical transcript and pages older 25+3 without duplicate runs or storage",async t=>{
  const {page,errors}=await pageFor(t);
  const pane=page.locator(".live-chat-pane").first(),before=requests.length;
  await page.getByRole("button",{name:"Previous chats"}).click();
  await page.locator(".live-chat-history-item").first().getByRole("button",{name:"Open conversation"}).click();
  await pane.getByRole("button",{name:"Load older messages"}).waitFor();
  assert.equal(await pane.locator(".live-chat-message").count(),100);
  assert.match(await pane.locator(".live-chat-message").first().innerText(),/Historical user 029/);
  await pane.getByRole("button",{name:"Load older messages"}).click();
  await pane.locator(".live-chat-message").nth(149).waitFor();
  assert.equal(await pane.locator(".live-chat-message").count(),150);
  assert.match(await pane.locator(".live-chat-message").first().innerText(),/Historical user 004/);
  await pane.getByRole("button",{name:"Load older messages"}).click();
  await pane.locator(".live-chat-message").nth(155).waitFor();
  assert.equal(await pane.locator(".live-chat-message").count(),156);
  assert.match(await pane.locator(".live-chat-message").first().innerText(),/Historical user 001/);
  assert.equal(await pane.getByRole("button",{name:"Load older messages"}).count(),0);
  assert.equal(await pane.locator(".live-chat-message.user").count(),78);
  assert.equal(await pane.locator(".live-chat-message.assistant").count(),78);
  assert.deepEqual(requests.slice(before).filter(r=>r.method==="aiverse.gateway.session.runs")
    .map(r=>[r.workspaceId,r.params.sessionId,r.params.offset,r.params.limit]),[
      ["operator","historical-001",0,25],["operator","historical-001",25,25],
      ["operator","historical-001",50,25],["operator","historical-001",75,25],
    ]);
  assert.equal(requests.slice(before).filter(r=>r.method==="aiverse.gateway.run.create").length,0);
  await page.evaluate(()=>window.chatApp.retarget({systemId:"aiverse-01",workspaceId:"film"}));
  assert.equal(await pane.locator(".live-chat-message").count(),0);
  assert.equal(await pane.getByRole("button",{name:"Load older messages"}).count(),0);
  assert.deepEqual(await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length})),
    {local:0,session:0});
  assert.deepEqual(errors,[]);
});
test("opening history preserves active chats in splits and never evicts a full three-pane layout",async t=>{
  const {page,errors}=await pageFor(t);
  const first=page.locator(".live-chat-pane").first();
  await first.locator(".live-chat-input").fill("Keep this active conversation");
  await first.getByRole("button",{name:"Send",exact:true}).click();
  await first.locator(".live-chat-message.assistant p").getByText(/Authoritative answer/).waitFor();
  const original=await first.locator(".live-chat-message").allTextContents();
  await page.getByRole("button",{name:"Previous chats"}).click();
  await page.locator(".live-chat-history-item").first().getByRole("button",{name:"Open conversation"}).click();
  await page.locator(".live-chat-pane").nth(1).getByRole("button",{name:"Load older messages"}).waitFor();
  assert.equal(await page.locator(".live-chat-pane").count(),2);
  assert.deepEqual(await first.locator(".live-chat-message").allTextContents(),original,
    "opening history must not replace a live conversation in the first pane");
  const third=await page.evaluate(()=>window.chatApp.openPane());
  assert.ok(third);
  await page.locator(".live-chat-pane").nth(2).locator(".live-chat-input").fill("Third chat occupied");
  await page.locator(".live-chat-pane").nth(2).getByRole("button",{name:"Send",exact:true}).click();
  await page.locator(".live-chat-pane").nth(2).locator(".live-chat-message.assistant p")
    .getByText(/Authoritative answer/).waitFor();
  await page.getByRole("button",{name:"Previous chats"}).click();
  await page.locator(".live-chat-history-item").first().getByRole("button",{name:"Open conversation"}).click();
  await page.locator(".live-chat-history-no-room").getByText(/All three chats are in use/).waitFor();
  assert.equal(await page.locator(".live-chat-pane").count(),3);
  assert.deepEqual(await first.locator(".live-chat-message").allTextContents(),original);
  assert.equal(await page.locator(".live-chat-pane").nth(1).locator(".live-chat-message").count(),100);
  assert.deepEqual(errors,[]);
});
test("opening a historical session into an empty minimized last pane restores it visibly",async t=>{
  const {page,errors}=await pageFor(t);
  const pane=page.locator(".live-chat-pane").first();
  await pane.getByRole("button",{name:"Close chat"}).click();
  assert.equal(await pane.evaluate(x=>x.classList.contains("live-chat-minimized")),true);
  await page.getByRole("button",{name:"Previous chats"}).click();
  await page.locator(".live-chat-history-item").first().getByRole("button",{name:"Open conversation"}).click();
  await pane.getByRole("button",{name:"Load older messages"}).waitFor();
  assert.equal(await pane.evaluate(x=>x.classList.contains("live-chat-minimized")),false);
  assert.equal(await page.locator(".live-chat-pane").count(),1);
  assert.deepEqual(errors,[]);
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
test("MC2.5 paired chat panes resize by keyboard and pointer without losing their controls",async t=>{
  const {page,errors}=await pageFor(t);
  await page.locator(".live-chat-toolbar .live-chat-split").click();
  const pane=page.locator(".live-chat-pane").first();
  const grip=pane.getByRole("separator",{name:"Resize conversation"});
  const width=()=>pane.evaluate(el=>el.getBoundingClientRect().width);
  const initial=await width();
  await grip.focus();
  await page.keyboard.press("ArrowRight");
  const wider=await width();
  assert.ok(wider>initial+15,"keyboard increment must actually widen the pane");
  await page.keyboard.press("ArrowLeft");
  const restored=await width();
  assert.ok(restored<wider-15,"keyboard decrement must narrow the pane");
  const bounds=await grip.boundingBox();
  assert.ok(bounds,"resize handle must exist and be visible");
  const x=bounds.x+bounds.width/2,y=bounds.y+Math.min(30,bounds.height/2);
  await page.mouse.move(x,y);
  await page.mouse.down();
  await page.mouse.move(x+65,y,{steps:5});
  await page.mouse.up();
  const dragged=await width();
  assert.ok(dragged>restored+35,"pointer drag must change the real pane width");
  assert.ok(dragged<=750,"resizing must obey desktop maximum");
  assert.equal(await pane.getByRole("button",{name:"New chat"}).count(),1);
  assert.equal(await pane.getByRole("button",{name:"Recover run"}).count(),1);
  await pane.getByRole("button",{name:"New chat"}).click();
  assert.ok(Math.abs((await width())-dragged)<5,
    "starting a fresh chat must not reset its pane width");
  await page.setViewportSize({width:600,height:900});
  assert.equal(await grip.isVisible(),false,"mobile uses stacked full-width chat panes");
  assert.ok((await width())<610,"desktop width cannot overflow the mobile viewport");
  assert.deepEqual(errors,[]);
});
test("Recover run refuses to mix an existing conversation, then reads same run in empty pane",async t=>{
  const {page,errors}=await pageFor(t),before=requests.length;
  const pane=page.locator(".live-chat-pane").first();
  await pane.locator(".live-chat-input").fill("Original independent transcript");
  await pane.getByRole("button",{name:"Send",exact:true}).click();
  await pane.locator(".live-chat-message.assistant p").getByText(/Authoritative answer/).waitFor();
  const status=await pane.locator(".live-chat-status").innerText();
  const runId=status.match(/run-\d+/)?.[0];
  assert.ok(runId);
  const original=await pane.locator(".live-chat-message").allTextContents();
  await pane.locator(".live-chat-run-id").fill(runId);
  await pane.getByRole("button",{name:"Recover run"}).click();
  await pane.locator(".live-chat-status").getByText(/requires an empty chat/).waitFor();
  assert.deepEqual(await pane.locator(".live-chat-message").allTextContents(),original);
  assert.equal(requests.slice(before).filter(x=>x.method==="aiverse.gateway.run.get").length,1,
    "blocked manual recovery cannot probe the Gateway");
  await pane.getByRole("button",{name:"New chat"}).click();
  await pane.locator(".live-chat-run-id").fill(runId);
  await pane.getByRole("button",{name:"Recover run"}).click();
  await pane.locator(".live-chat-message.assistant p").getByText(/Authoritative answer/).waitFor();
  assert.equal(await pane.locator(".live-chat-message.user").count(),0,
    "recovering a run ID cannot fabricate the older user turn");
  assert.equal(requests.slice(before).filter(x=>x.method==="aiverse.gateway.run.create").length,1);
  assert.equal(requests.slice(before).filter(x=>x.method==="aiverse.gateway.run.get").length,2);
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


test("explicit Insert Canvas note rereads canonical Data into composer, never invokes Gateway until Send",async t=>{
  const {page,errors}=await pageFor(t),before=requests.length;
  const pane=page.locator(".live-chat-pane").first();
  const canvas=page.locator(".aiverse-canvas");
  await canvas.getByRole("textbox",{name:"New Canvas name"}).fill("Chat note insert test");
  await canvas.getByRole("button",{name:"Create",exact:true}).click();
  await canvas.locator(".canvas-current-title").getByText("Chat note insert test").waitFor();
  const insert=pane.getByRole("button",{name:"Insert Canvas note"});
  await insert.click();
  await pane.locator(".live-chat-status").getByText(/Select a saved note in Canvas/).waitFor();
  assert.equal(requests.slice(before).filter(r=>r.method==="aiverse.canvas.get").length,0);
  await canvas.getByRole("button",{name:"Add note"}).click();
  await canvas.locator(".canvas-note").first().waitFor();
  await canvas.locator(".canvas-note").first().click();
  await canvas.locator(".canvas-note-text").waitFor();
  await canvas.locator(".canvas-note-text").fill("UNSAVED EDITOR CONTENT");
  await pane.locator(".live-chat-input").fill("How can I improve this shot?");
  const beforeInsert=requests.length;
  await insert.click();
  await pane.locator(".live-chat-status").getByText(/inserted for review. Nothing has been sent/).waitFor();
  const draft=await pane.locator(".live-chat-input").inputValue();
  assert.match(draft,/\[Saved Canvas: .*\(v\d+, note note-/);
  assert.match(draft,/New note/);
  assert.doesNotMatch(draft,/UNSAVED EDITOR CONTENT/,
    "only the canonical saved Data note, not a draft editor field, may be admitted");
  assert.match(draft,/How can I improve this shot\?/);
  assert.equal(requests.slice(beforeInsert).filter(r=>r.method==="aiverse.canvas.get").length,1,
    "Canvas note must be refetched from Data before entering Chat");
  assert.equal(requests.slice(before).filter(r=>r.method==="aiverse.gateway.run.create").length,0,
    "inserting a note must never submit an AI request");
  await pane.getByRole("button",{name:"Send",exact:true}).click();
  await pane.locator(".live-chat-message.assistant p").getByText(/Authoritative answer/).waitFor();
  const sent=requests.slice(before).filter(r=>r.method==="aiverse.gateway.run.create");
  assert.equal(sent.length,1);
  assert.equal(sent[0].params.messages[0].content,draft);
  assert.deepEqual(errors,[]);
});
test("Canvas note insertion rejects stale Data version and does not overwrite current draft",async t=>{
  const {page,errors}=await pageFor(t),before=requests.length;
  const pane=page.locator(".live-chat-pane").first();
  const canvas=page.locator(".aiverse-canvas");
  await canvas.getByRole("textbox",{name:"New Canvas name"}).fill("Chat stale reference test");
  await canvas.getByRole("button",{name:"Create",exact:true}).click();
  await canvas.locator(".canvas-current-title").getByText("Chat stale reference test").waitFor();
  await canvas.getByRole("button",{name:"Add note"}).click();
  await canvas.locator(".canvas-note").first().waitFor();
  await canvas.locator(".canvas-note").first().click();
  await canvas.locator(".canvas-note-text").waitFor();
  const store=canvasDocuments.get("aiverse-01|operator");
  const doc=[...store.values()].at(-1);
  assert.ok(doc?.board?.nodes.length);
  doc.version+=1;
  doc.board.nodes[0].text="DATA EDITED ELSEWHERE";
  await pane.locator(".live-chat-input").fill("Keep this draft unchanged");
  await pane.getByRole("button",{name:"Insert Canvas note"}).click();
  await pane.locator(".live-chat-status").getByText(/Canvas changed since it was opened/).waitFor();
  assert.equal(await pane.locator(".live-chat-input").inputValue(),"Keep this draft unchanged");
  assert.equal(requests.slice(before).filter(r=>r.method==="aiverse.gateway.run.create").length,0);
  assert.deepEqual(errors,[]);
});
test("Canvas note too long for Chat composer is refused without truncation or run creation",async t=>{
  const {page,errors}=await pageFor(t),before=requests.length;
  const pane=page.locator(".live-chat-pane").first(),canvas=page.locator(".aiverse-canvas");
  await canvas.getByRole("textbox",{name:"New Canvas name"}).fill("Chat long reference test");
  await canvas.getByRole("button",{name:"Create",exact:true}).click();
  await canvas.locator(".canvas-current-title").getByText("Chat long reference test").waitFor();
  await canvas.getByRole("button",{name:"Add note"}).click();
  await canvas.locator(".canvas-note").first().waitFor();
  await canvas.locator(".canvas-note").first().click();
  const savedText="Important saved note content. ".repeat(48);
  await canvas.locator(".canvas-note-text").fill(savedText);
  await canvas.getByRole("button",{name:"Save note"}).click();
  await canvas.locator(".canvas-status").getByText(/Note updated/).waitFor();
  await pane.locator(".live-chat-input").fill("Preserve my manual draft");
  await pane.getByRole("button",{name:"Insert Canvas note"}).click();
  await pane.locator(".live-chat-status").getByText(/exceeds the 1,200-character Chat composer limit/).waitFor();
  assert.equal(await pane.locator(".live-chat-input").inputValue(),"Preserve my manual draft");
  assert.equal(requests.slice(before).filter(x=>x.method==="aiverse.gateway.run.create").length,0);
  assert.deepEqual(errors,[]);
});
test("Canvas reference selection is revoked by workspace retarget before Chat insertion",async t=>{
  const {page,errors}=await pageFor(t),before=requests.length;
  const pane=page.locator(".live-chat-pane").first(),canvas=page.locator(".aiverse-canvas");
  await canvas.getByRole("textbox",{name:"New Canvas name"}).fill("Scoped Canvas reference test");
  await canvas.getByRole("button",{name:"Create",exact:true}).click();
  await canvas.locator(".canvas-current-title").getByText("Scoped Canvas reference test").waitFor();
  await canvas.getByRole("button",{name:"Add note"}).click();
  await canvas.locator(".canvas-note").first().waitFor();
  await canvas.locator(".canvas-note").first().click();
  await canvas.locator(".canvas-note-text").waitFor();
  await page.evaluate(()=>window.chatApp.retarget({systemId:"aiverse-01",workspaceId:"film"}));
  await pane.getByRole("button",{name:"Insert Canvas note"}).click();
  await pane.locator(".live-chat-status").getByText(/Select a saved note in Canvas/).waitFor();
  assert.equal(await pane.locator(".live-chat-input").inputValue(),"");
  assert.equal(requests.slice(before).filter(x=>x.method==="aiverse.canvas.get"
    &&x.workspaceId==="film").length,0,
    "old workspace selection must not cause a Data lookup in the new workspace");
  assert.equal(requests.slice(before).filter(x=>x.method==="aiverse.gateway.run.create").length,0);
  assert.deepEqual(errors,[]);
});
test("Canvas: first Scratch edit persists through typed RPC and browser reload",async t=>{
  const {page,errors}=await pageFor(t);
  const canvas=page.locator(".aiverse-canvas");
  await canvas.locator(".canvas-current-title").getByText("Scratch Canvas").waitFor();
  assert.equal(await canvas.locator(".canvas-note").count(),0);
  await canvas.getByRole("button",{name:"Add note"}).click();
  await canvas.locator(".canvas-note").first().waitFor();
  const initial=canvasDocuments.get("aiverse-01|operator");
  assert.ok(initial&&[...initial.values()].some(d=>d.title==="Scratch Canvas"));
  const note=canvas.locator(".canvas-note").first();
  await note.click();
  await canvas.getByRole("textbox",{name:"Selected note text"}).fill("Camera staging and storyboard");
  await canvas.getByRole("button",{name:"Save note"}).click();
  await canvas.locator(".canvas-note").getByText("Camera staging and storyboard").waitFor();
  const saved=[...initial.values()].find(d=>d.title==="Scratch Canvas");
  assert.equal(saved.board.nodes[0].text,"Camera staging and storyboard");
  await page.reload({waitUntil:"networkidle"});
  await page.locator(".aiverse-canvas").waitFor();
  await page.getByRole("button",{name:"Canvas library"}).click();
  await page.getByRole("button",{name:"Scratch Canvas",exact:true}).click();
  await page.locator(".canvas-note").getByText("Camera staging and storyboard").waitFor();
  assert.deepEqual(await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length})),
    {local:0,session:0});
  assert.deepEqual(errors,[]);
});
test("Canvas: named documents, rename, node connections, move and canonical duplication",async t=>{
  const {page,errors}=await pageFor(t);
  const canvas=page.locator(".aiverse-canvas");
  await canvas.getByRole("textbox",{name:"New Canvas name"}).fill("Shot list");
  await canvas.getByRole("button",{name:"Create",exact:true}).click();
  await canvas.locator(".canvas-current-title").getByText("Shot list").waitFor();
  await canvas.getByRole("textbox",{name:"Rename Canvas title"}).fill("Shot sequence");
  await canvas.getByRole("button",{name:"Rename"}).click();
  await canvas.locator(".canvas-current-title").getByText("Shot sequence").waitFor();
  await canvas.getByRole("button",{name:"Add note"}).click();
  await canvas.getByRole("button",{name:"Add note"}).click();
  await canvas.locator(".canvas-note").nth(1).waitFor();
  await canvas.getByRole("button",{name:"Connect notes"}).click();
  await canvas.locator(".canvas-edge-item").first().waitFor();
  const before=[...canvasDocuments.get("aiverse-01|operator").values()]
    .find(d=>d.title==="Shot sequence");
  assert.equal(before.board.nodes.length,2);
  assert.equal(before.board.edges.length,1);
  // Drag a note; only release generates a canonical note.move mutation.
  const originalPositions=new Map(before.board.nodes.map(n=>[n.id,{x:n.x,y:n.y}]));
  const first=canvas.locator(".canvas-note").first();
  const box=await first.boundingBox();
  await page.mouse.move(box.x+40,box.y+35);
  await page.mouse.down();await page.mouse.move(box.x+75,box.y+75,{steps:4});await page.mouse.up();
  await canvas.locator(".canvas-status").getByText(/Note moved/).waitFor();
  const move=requests.filter(r=>r.method==="aiverse.canvas.edit"&&
    r.params?.edit?.type==="note.move").at(-1);
  assert.ok(move,"pointer release must send one typed canonical note.move");
  const position=originalPositions.get(move.params.edit.id);
  assert.ok(position,"move must refer to an existing canonical note");
  assert.notDeepEqual({x:move.params.edit.x,y:move.params.edit.y},position);
  const moved=before.board.nodes.find(n=>n.id===move.params.edit.id);
  assert.equal(moved.x,move.params.edit.x);
  assert.equal(moved.y,move.params.edit.y);
  const beforeCopyRequests=requests.length;
  await canvas.getByRole("button",{name:"Duplicate"}).click();
  await canvas.locator(".canvas-current-title").getByText("Shot sequence copy").waitFor();
  const copyRequests=requests.slice(beforeCopyRequests)
    .filter(r=>r.method.startsWith("aiverse.canvas.")&&
      r.method!=="aiverse.canvas.list");
  assert.deepEqual(copyRequests.map(r=>r.method),["aiverse.canvas.duplicate"],
    "one atomic Data-owned request, no partial Canvas document effects");
  const docs=[...canvasDocuments.get("aiverse-01|operator").values()];
  const copy=docs.find(d=>d.title==="Shot sequence copy");
  assert.equal(copy.board.nodes.length,2);
  assert.equal(copy.board.edges.length,1);
  assert.equal(copy.version,1,"atomic duplicate is created as one record");
  assert.ok(requests.some(r=>r.method==="aiverse.canvas.edit"&&r.params?.edit?.type==="note.move"));
  assert.ok(requests.some(r=>r.method==="aiverse.canvas.edit"&&r.params?.edit?.type==="edge.add"));
  assert.deepEqual(errors,[]);
});
test("Canvas: explicit destructive denial, scope switch and no cross-workspace leakage",async t=>{
  const {page,errors}=await pageFor(t);
  const canvas=page.locator(".aiverse-canvas");
  await canvas.getByRole("textbox",{name:"New Canvas name"}).fill("Keep");
  await canvas.getByRole("button",{name:"Create",exact:true}).click();
  await canvas.locator(".canvas-current-title").getByText("Keep").waitFor();
  await canvas.getByRole("button",{name:"Delete",exact:true}).click();
  await canvas.getByRole("button",{name:"Confirm delete"}).click();
  await canvas.getByRole("status").getByText(/Action denied by OS permissions/).waitFor();
  assert.ok([...canvasDocuments.get("aiverse-01|operator").values()].some(d=>d.title==="Keep"));
  await page.evaluate(()=>window.chatApp.retarget({systemId:"aiverse-01",workspaceId:"filmmaking"}));
  await canvas.locator(".canvas-current-title").getByText("Scratch Canvas").waitFor();
  await canvas.getByRole("button",{name:"Canvas library"}).click();
  assert.equal(await canvas.getByRole("button",{name:"Keep",exact:true}).count(),0);
  await canvas.getByRole("textbox",{name:"New Canvas name"}).fill("Filmmaking canvas");
  await canvas.getByRole("button",{name:"Create",exact:true}).click();
  await canvas.locator(".canvas-current-title").getByText("Filmmaking canvas").waitFor();
  const req=requests.filter(r=>r.method==="aiverse.canvas.create").at(-1);
  assert.equal(req.workspaceId,"filmmaking");
  assert.equal([...canvasDocuments.get("aiverse-01|operator").values()]
    .some(d=>d.title==="Filmmaking canvas"),false);
  assert.deepEqual(errors,[]);
});


test("Canvas: stale atomic duplicate never creates a partial copy",async t=>{
  const {page,errors}=await pageFor(t);
  const canvas=page.locator(".aiverse-canvas");
  await canvas.getByRole("textbox",{name:"New Canvas name"}).fill("Version guarded");
  await canvas.getByRole("button",{name:"Create",exact:true}).click();
  await canvas.locator(".canvas-current-title").getByText("Version guarded").waitFor();
  const records=canvasDocuments.get("aiverse-01|operator");
  const item=[...records.values()].find(d=>d.title==="Version guarded");
  assert.ok(item);
  // Another already-authorized actor changes Data while this browser still
  // displays the original canonical document version.
  item.version++;
  await canvas.getByRole("button",{name:"Duplicate"}).click();
  await canvas.getByRole("status").getByText(/Canvas changed elsewhere/).waitFor();
  assert.equal([...records.values()].filter(d=>d.title==="Version guarded copy").length,0);
  assert.ok(requests.some(r=>r.method==="aiverse.canvas.duplicate"&&
    r.params?.id===item.id&&r.params.expectedVersion===1));
  assert.deepEqual(errors,[]);
});


test("Canvas: verified history, two-step Undo, new version and persistence across reload",async t=>{
  const {page,errors}=await pageFor(t);
  const canvas=page.locator(".aiverse-canvas");
  await canvas.getByRole("textbox",{name:"New Canvas name"}).fill("Undo storyboard");
  await canvas.getByRole("button",{name:"Create",exact:true}).click();
  await canvas.locator(".canvas-current-title").getByText("Undo storyboard").waitFor();
  await canvas.getByRole("button",{name:"Add note"}).click();
  await canvas.locator(".canvas-note").first().waitFor();
  await canvas.getByRole("button",{name:"History",exact:true}).click();
  const panel=canvas.getByRole("region",{name:"Canonical Canvas revision history"});
  await panel.getByText("Current · v2").waitFor();
  await panel.getByRole("button",{name:"Undo last change"}).click();
  await canvas.getByRole("status").getByText(/Confirm restoring v1/).waitFor();
  assert.equal(await canvas.locator(".canvas-note").count(),1,
    "first click cannot modify canonical board");
  await panel.getByRole("button",{name:"Confirm restore v1"}).click();
  await canvas.locator(".canvas-current-meta").getByText("Saved · v3").waitFor();
  assert.equal(await canvas.locator(".canvas-note").count(),0);
  await panel.getByText("Current · v3").waitFor();
  const mutations=requests.filter(x=>x.method==="aiverse.canvas.revert");
  assert.equal(mutations.at(-1)?.params.toVersion,1);
  assert.equal(mutations.at(-1)?.params.expectedVersion,2);
  await page.reload({waitUntil:"networkidle"});
  await page.getByRole("button",{name:"Canvas library"}).click();
  await page.getByRole("button",{name:"Undo storyboard",exact:true}).click();
  await canvas.locator(".canvas-current-meta").getByText("Saved · v3").waitFor();
  await canvas.getByRole("button",{name:"History",exact:true}).click();
  await panel.getByText("Current · v3").waitFor();
  assert.deepEqual(errors,[]);
});
test("Canvas: concurrent revision rejects undo and never shows success",async t=>{
  const {page,errors}=await pageFor(t);
  const canvas=page.locator(".aiverse-canvas");
  await canvas.getByRole("textbox",{name:"New Canvas name"}).fill("Concurrent undo");
  await canvas.getByRole("button",{name:"Create",exact:true}).click();
  await canvas.getByRole("button",{name:"Add note"}).click();
  await canvas.locator(".canvas-note").first().waitFor();
  await canvas.getByRole("button",{name:"History",exact:true}).click();
  const panel=canvas.getByRole("region",{name:"Canonical Canvas revision history"});
  await panel.getByRole("button",{name:"Undo last change"}).click();
  const record=[...canvasDocuments.get("aiverse-01|operator").values()]
    .find(x=>x.title==="Concurrent undo");
  assert.ok(record);record.version+=1;
  await panel.getByRole("button",{name:"Confirm restore v1"}).click();
  await canvas.getByRole("status").getByText(/Canvas changed elsewhere/).waitFor();
  assert.equal(await canvas.locator(".canvas-note").count(),1);
  assert.equal(record.version,3,"failed optimistic undo must not apply another effect");
  await canvas.getByRole("button",{name:"Reload Canvas"}).click();
  await canvas.locator(".canvas-current-meta").getByText("Saved · v3").waitFor();
  assert.equal(await canvas.locator(".canvas-note").count(),1,
    "reload uses the newer canonical board after stale undo failure");
  assert.deepEqual(errors,[]);
});


test("Canvas: Load older history returns disjoint keyset pages and no browser revision store",async t=>{
 const {page,errors}=await pageFor(t);
 const canvas=page.locator(".aiverse-canvas");
 await canvas.getByRole("textbox",{name:"New Canvas name"}).fill("Long take plan");
 await canvas.getByRole("button",{name:"Create",exact:true}).click();
 await canvas.locator(".canvas-current-title").getByText("Long take plan").waitFor();
 const store=canvasDocuments.get("aiverse-01|operator");
 const d=[...store.values()].find(x=>x.title==="Long take plan");
 assert.ok(d);
 const archive=canvasRevisions.get("aiverse-01|operator|"+d.id);
 assert.ok(archive);
 for(let version=2;version<=48;version++){
   archive.push({...clone(d),version,title:"Long take v"+version});
 }
 d.version=48;d.title="Long take v48";
 await canvas.getByRole("button",{name:"Reload Canvas"}).click();
 await canvas.locator(".canvas-current-meta").getByText("Saved · v48").waitFor();
 await canvas.getByRole("button",{name:"History",exact:true}).click();
 const panel=canvas.getByRole("region",{name:"Canonical Canvas revision history"});
 await panel.getByText("Current · v48").waitFor();
 assert.equal(await panel.locator(".canvas-history-item").count(),20);
 await panel.getByRole("button",{name:"Load older versions"}).click();
 await panel.getByText("v28 · Long take v28").waitFor();
 assert.equal(await panel.locator(".canvas-history-item").count(),40);
 await panel.getByRole("button",{name:"Load older versions"}).click();
 await panel.getByText("v1 · Long take plan").waitFor();
 assert.equal(await panel.locator(".canvas-history-item").count(),48);
 assert.equal(await panel.getByRole("button",{name:"Load older versions"}).count(),0);
 const historyCalls=requests.filter(x=>x.method==="aiverse.canvas.history"&&x.params?.id===d.id);
 assert.deepEqual(historyCalls.map(x=>x.params.beforeVersion),[undefined,29,9]);
 assert.deepEqual(historyCalls.map(x=>x.params.limit),[20,20,20]);
 assert.deepEqual(await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length})),
  {local:0,session:0});
 assert.deepEqual(errors,[]);
});

test("Canvas: switching to atomic copy clears stale source history and reopens correct scope",async t=>{
 const {page,errors}=await pageFor(t);
 const canvas=page.locator(".aiverse-canvas");
 await canvas.getByRole("textbox",{name:"New Canvas name"}).fill("Source history");
 await canvas.getByRole("button",{name:"Create",exact:true}).click();
 await canvas.locator(".canvas-current-title").getByText("Source history").waitFor();
 await canvas.getByRole("button",{name:"Add note"}).click();
 await canvas.locator(".canvas-note").first().waitFor();
 await canvas.getByRole("button",{name:"History",exact:true}).click();
 const panel=canvas.getByRole("region",{name:"Canonical Canvas revision history"});
 await panel.getByText("Current · v2").waitFor();
 await canvas.getByRole("button",{name:"Duplicate"}).click();
 await canvas.locator(".canvas-current-title").getByText("Source history copy").waitFor();
 assert.equal(await panel.isVisible(),false,
   "a copy must not inherit visible revisions of its source document");
 await canvas.getByRole("button",{name:"History",exact:true}).click();
 await panel.getByText("Current · v1").waitFor();
 assert.equal(await panel.locator(".canvas-history-item").count(),1);
 assert.deepEqual(errors,[]);
});
