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
  const chatRequests=requests.filter(r=>r.method.startsWith("aiverse.gateway."));
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
