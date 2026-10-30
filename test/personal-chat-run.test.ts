import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {DashboardClient,DashboardChatEventFeed,PersonalChatRunController,
  type ChatEventFeed,type ChatRunEvent,type ChatWebSocket} from "../packages/client/src/index.js";
import type {ClientScope,FetchFn} from "../packages/client/src/client.js";

const TOKEN="test-dashboard-auth-0011223344556677";
const SCOPE={systemId:"aiverse-01",workspaceId:"film"};
const run=(status="running",extras:Record<string,unknown>={})=>({
  runId:"run-a",sessionId:"session-a",systemId:"canonical-a",
  workspaceId:"film",status,source:"canonical-gateway",...extras,
});
const nextTick=()=>new Promise<void>(resolve=>setImmediate(resolve));
function clientWith(handler:(method:string,params:Record<string,unknown>|undefined)=>Promise<unknown>|unknown,
  scope:ClientScope=SCOPE){
 const calls:Array<{method:string;params:Record<string,unknown>|undefined;scope:string|undefined}>=[];
 const transport:FetchFn=async(_url,init)=>{
   const body=JSON.parse(init.body) as {
     method:string;params?:Record<string,unknown>;workspaceId?:string;systemId:string;
   };
   calls.push({method:body.method,params:body.params,scope:body.workspaceId});
   const result=await handler(body.method,body.params);
   return {json:async()=>({ok:true,systemId:body.systemId,
     observedAt:"2026-10-27T15:00:00Z",result})};
 };
 return {client:new DashboardClient("http://127.0.0.1:3100",scope,TOKEN,transport),calls};
}
function testFeed(){
 const watchers:Array<{
   scope:Required<ClientScope>;runId:string;
   handlers:{event(event:ChatRunEvent):void;interrupted(code:string):void};
   cancelled:boolean;
 }>=[];
 const feed:ChatEventFeed={subscribe:(scope,runId,handlers)=>{
   const watch={scope,runId,handlers,cancelled:false};
   watchers.push(watch);
   return ()=>{watch.cancelled=true;};
 }};
 return {feed,watchers};
}
const event=(kind:string,seq:number,text?:string):ChatRunEvent=>({
  ...SCOPE,runId:"run-a",eventId:"evt-"+seq,kind,seq,
  ...(text!==undefined?{text}:{}),
});
describe("Personal Chat canonical run controller",()=>{
 it("submits once, streams partial text, and accepts canonical GET as final output",async()=>{
   let resultStatus="running";
   const {client,calls}=clientWith(method=>{
     if(method==="aiverse.gateway.run.create")return run("running");
     if(method==="aiverse.gateway.run.get")return run(resultStatus,{output:"canonical final answer"});
     throw Error("unrecognized RPC");
   });
   const {feed,watchers}=testFeed();
   const changes:string[]=[];
   const controller=new PersonalChatRunController(client,feed,
     view=>changes.push(view.phase));
   const initial=await controller.send("Describe this shot","shot-1");
   assert.equal(initial.phase,"running");
   assert.equal(initial.sessionId,"session-a");
   assert.equal(watchers.length,1);
   assert.equal(watchers[0].scope.workspaceId,"film");
   assert.equal(calls[0].method,"aiverse.gateway.run.create");
   assert.deepEqual((calls[0].params as {messages:unknown}).messages,
     [{role:"user",content:"Describe this shot"}]);
   watchers[0].handlers.event(event("assistant.delta",1,"first "));
   watchers[0].handlers.event(event("assistant.delta",1,"duplicate"));
   watchers[0].handlers.event(event("assistant.delta",2,"answer"));
   assert.equal(controller.snapshot().output,"first answer");
   resultStatus="completed";
   watchers[0].handlers.event(event("run.completed",3));
   await nextTick();
   assert.equal(watchers[0].cancelled,true);
   assert.equal(controller.snapshot().phase,"completed");
   assert.equal(controller.snapshot().output,"canonical final answer");
   watchers[0].handlers.event(event("assistant.delta",4,"late"));
   assert.equal(controller.snapshot().output,"canonical final answer");
   assert.ok(changes.includes("submitting"));
   assert.ok(changes.includes("completed"));
   assert.deepEqual(calls.map(x=>x.method),
     ["aiverse.gateway.run.create","aiverse.gateway.run.get"]);
 });
 it("Stop invokes the canonical run cancel exactly once and never promotes draft text",async()=>{
   const {client,calls}=clientWith(method=>{
     if(method==="aiverse.gateway.run.create")return run("running");
     if(method==="aiverse.gateway.run.cancel")return run("canceled");
     throw Error("unexpected Gateway method "+method);
   });
   const f=testFeed(),chat=new PersonalChatRunController(client,f.feed);
   await chat.send("Shoot a long shot","stable-create");
   f.watchers[0].handlers.event(event("assistant.delta",1,"UNCONFIRMED PREVIEW"));
   const stopped=await chat.stop("stable-stop-1");
   assert.equal(stopped.phase,"canceled");
   assert.equal(stopped.output,"");
   assert.equal(stopped.runId,"run-a");
   assert.equal(f.watchers[0].cancelled,true);
   assert.deepEqual(calls.map(c=>c.method),[
     "aiverse.gateway.run.create","aiverse.gateway.run.cancel"]);
   assert.deepEqual(calls[1].params,{runId:"run-a",sessionId:"session-a",operationId:"stable-stop-1"});
   await assert.rejects(chat.stop("second-stop"),(e:unknown)=>
     (e as {code?:string}).code==="CHAT_STOP_UNAVAILABLE");
   f.watchers[0].handlers.event(event("assistant.delta",2,"FORGED LATE"));
   assert.equal(chat.snapshot().output,"");
 });
 it("stopped responses can continue in the exact session without unverified history",async()=>{
   let creates=0;
   const {client,calls}=clientWith(method=>{
     if(method==="aiverse.gateway.run.create")return run("running",{
       runId:++creates===1?"run-a":"run-b",
     });
     if(method==="aiverse.gateway.run.cancel")return run("canceled");
     throw Error("unrecognized Gateway method "+method);
   });
   const f=testFeed(),chat=new PersonalChatRunController(client,f.feed);
   await chat.send("Original prompt","first-key");
   f.watchers[0].handlers.event(event("assistant.delta",1,"NEVER REUSE DRAFT"));
   await chat.stop("stop-key");
   assert.equal(chat.snapshot().phase,"canceled");
   const next=await chat.send("Continue the discussion","second-key");
   assert.equal(next.runId,"run-b");
   assert.equal(next.sessionId,"session-a");
   assert.equal(next.contextLimited,true);
   const second=calls.filter(c=>c.method==="aiverse.gateway.run.create")[1];
   assert.equal(second.params?.sessionId,"session-a");
   assert.deepEqual(second.params?.messages,[{role:"user",content:"Continue the discussion"}]);
   assert.doesNotMatch(JSON.stringify(second.params),/NEVER REUSE DRAFT|Original prompt/);
 });
 it("late Stop response after A to B to A workspace switching never repaints the old run",async()=>{
   let release:(value:unknown)=>void=()=>{};
   const {client,calls}=clientWith(method=>{
     if(method==="aiverse.gateway.run.create")return run();
     if(method==="aiverse.gateway.run.cancel")return new Promise(resolve=>{release=resolve;});
     throw Error("unexpected method "+method);
   });
   const f=testFeed(),chat=new PersonalChatRunController(client,f.feed);
   await chat.send("Private draft","stable-create");
   const pending=chat.stop("stop-owner");
   chat.retarget({systemId:"aiverse-01",workspaceId:"other"});
   chat.retarget(SCOPE);
   release(run("canceled"));
   await pending;
   assert.equal(chat.snapshot().phase,"idle");
   assert.equal(chat.snapshot().runId,undefined);
   assert.equal(chat.snapshot().output,"");
   assert.equal(calls.filter(x=>x.method==="aiverse.gateway.run.cancel").length,1);
 });
 it("Stop racing with a completed run reconciles the real finished reply",async()=>{
   const {client,calls}=clientWith(method=>{
     if(method==="aiverse.gateway.run.create")return run();
     if(method==="aiverse.gateway.run.cancel")
       throw Object.assign(Error("Already complete"),{code:"RUN_NOT_CANCELABLE"});
     if(method==="aiverse.gateway.run.get")return run("completed",{output:"Real finished answer"});
     throw Error("Unexpected method "+method);
   });
   const f=testFeed(),chat=new PersonalChatRunController(client,f.feed);
   await chat.send("Describe frame","first");
   const response=await chat.stop("stop-late");
   assert.equal(response.phase,"completed");
   assert.equal(response.output,"Real finished answer");
   assert.equal(response.errorCode,undefined);
   assert.deepEqual(calls.map(c=>c.method),[
     "aiverse.gateway.run.create","aiverse.gateway.run.cancel","aiverse.gateway.run.get",
   ]);
   assert.equal(f.watchers[0].cancelled,true);
 });
 it("Stop uncertainty preserves canonical run identity for GET-only recovery",async()=>{
   let failControl=true;
   const {client,calls}=clientWith(method=>{
     if(method==="aiverse.gateway.run.create")return run();
     if(method==="aiverse.gateway.run.cancel"&&failControl){
       failControl=false;
       throw Object.assign(Error("disconnect"),{code:"TRANSPORT_UNAVAILABLE"});
     }
     if(method==="aiverse.gateway.run.get")return run("canceled");
     throw Error("unexpected Gateway call "+method);
   });
   const f=testFeed(),chat=new PersonalChatRunController(client,f.feed);
   await chat.send("test","create");
   const interrupted=await chat.stop("stop-key");
   assert.equal(interrupted.phase,"interrupted");
   assert.equal(interrupted.runId,"run-a");
   assert.equal(interrupted.errorCode,"TRANSPORT_UNAVAILABLE");
   const recovered=await chat.reconnect();
   assert.equal(recovered.phase,"canceled");
   assert.equal(calls.filter(c=>c.method==="aiverse.gateway.run.create").length,1);
   assert.equal(calls.filter(c=>c.method==="aiverse.gateway.run.cancel").length,1);
   assert.equal(calls.filter(c=>c.method==="aiverse.gateway.run.get").length,1);
 });
 it("opens canonical 50-run transcript then loads older 25+3 without changing model context",async()=>{
   const fixtureRows=Array.from({length:78},(_,index)=>{
     const number=78-index,id=String(number).padStart(3,"0");
     return {run_id:"historical-"+id,session_id:"session-a",status:"completed",
       user_text:"Earlier prompt "+id,output:"Verified reply "+id,
       user_text_truncated:false,output_truncated:false};
   });
   const {client,calls}=clientWith((method,params)=>{
     assert.equal(method,"aiverse.gateway.session.runs");
     const offset=Number(params?.offset??0),limit=Number(params?.limit??25);
     return {source:"canonical-gateway",workspaceId:"film",sessionId:"session-a",
       data:fixtureRows.slice(offset,offset+limit),
       has_more:offset+limit<fixtureRows.length,
       next_offset:offset+limit<fixtureRows.length?offset+limit:null};
   });
   const chat=new PersonalChatRunController(client,testFeed().feed);
   const opened=await chat.openSession("session-a");
   assert.equal(opened.view.phase,"completed");
   assert.equal(opened.hasOlder,true);
   assert.equal(opened.turns.length,100);
   assert.equal(opened.turns[0].content,"Earlier prompt 029");
   assert.equal(opened.turns.at(-1)?.content,"Verified reply 078");
   const older=await chat.loadOlderSessionRuns();
   assert.equal(older.hasOlder,true);
   assert.equal(older.turns.length,50);
   assert.equal(older.turns[0].content,"Earlier prompt 004");
   assert.equal(older.turns.at(-1)?.content,"Verified reply 028");
   const oldest=await chat.loadOlderSessionRuns();
   assert.equal(oldest.hasOlder,false);
   assert.equal(oldest.turns.length,6);
   assert.equal(oldest.turns[0].content,"Earlier prompt 001");
   await assert.rejects(chat.loadOlderSessionRuns(),(e:unknown)=>
     (e as {code?:string}).code==="CHAT_OLDER_HISTORY_UNAVAILABLE");
   assert.deepEqual(calls.map(c=>c.params?.offset),[0,25,50,75]);
   assert.equal(calls.some(c=>c.method==="aiverse.gateway.run.create"),false);
   assert.equal(chat.snapshot().phase,"completed");
   assert.equal(chat.snapshot().output,"Verified reply 078");
   assert.equal(chat.snapshot().contextLimited,true);
 });
 it("rejects duplicate older history run and retries same canonical offset safely",async()=>{
   let poison=true;
   const row=(num:number)=>({run_id:"historical-"+num,session_id:"session-a",
     status:"completed",user_text:"Message "+num,output:"Answer "+num,
     user_text_truncated:false,output_truncated:false});
   const {client,calls}=clientWith((method,params)=>{
     assert.equal(method,"aiverse.gateway.session.runs");
     const offset=Number(params?.offset??0);
     const incoming=offset===50&&poison?[row(100)]:Array.from({length:offset===50?10:25},
       (_,i)=>row(100-offset-i));
     const has_more=offset<50;
     return {source:"canonical-gateway",workspaceId:"film",sessionId:"session-a",
       data:incoming,has_more,next_offset:has_more?offset+25:null};
   });
   const chat=new PersonalChatRunController(client,testFeed().feed);
   const opened=await chat.openSession("session-a");
   assert.equal(opened.hasOlder,true);
   await assert.rejects(chat.loadOlderSessionRuns(),(e:unknown)=>
     (e as {code?:string}).code==="CHAT_HISTORY_INVALID");
   poison=false;
   const older=await chat.loadOlderSessionRuns();
   assert.equal(older.hasOlder,false);
   assert.equal(older.turns.length,20);
   assert.deepEqual(calls.map(c=>c.params?.offset),[0,25,50,50]);
 });
 it("switching workspace cancels older-history projection and denies replay",async()=>{
   let release:(value:unknown)=>void=()=>{};
   const data=Array.from({length:25},(_,index)=>({run_id:"r-"+index,
     session_id:"session-a",status:"completed",user_text:"U"+index,output:"A"+index,
     user_text_truncated:false,output_truncated:false}));
   const {client}=clientWith((_method,params)=>{
     if(params?.offset===50)return new Promise(resolve=>{release=resolve;});
     return {source:"canonical-gateway",workspaceId:"film",sessionId:"session-a",
       data:data.map((row,i)=>({...row,run_id:"r-"+(Number(params?.offset??0)+i)})),
       has_more:true,next_offset:Number(params?.offset??0)+25};
   });
   const chat=new PersonalChatRunController(client,testFeed().feed);
   // Return unique run identities on the second page in this separate fixture.
   await chat.openSession("session-a");
   const pending=chat.loadOlderSessionRuns();
   chat.retarget({systemId:"aiverse-01",workspaceId:"other"});
   chat.retarget(SCOPE);
   release({source:"canonical-gateway",workspaceId:"film",sessionId:"session-a",
     data:[],has_more:false,next_offset:null});
   try{await pending;}catch{}
   assert.equal(chat.snapshot().phase,"idle");
   assert.equal(chat.snapshot().output,"");
   await assert.rejects(chat.loadOlderSessionRuns(),(e:unknown)=>
     (e as {code?:string}).code==="CHAT_OLDER_HISTORY_UNAVAILABLE");
 });
 it("rejects Stop before a canonical run identity exists",async()=>{
   const {client,calls}=clientWith(()=>{throw Error("must not reach Gateway")});
   const chat=new PersonalChatRunController(client,testFeed().feed);
   await assert.rejects(chat.stop("control-1"),(e:unknown)=>
     (e as {code?:string}).code==="CHAT_STOP_UNAVAILABLE");
   assert.equal(calls.length,0);
 });
 it("reconnects a known interrupted run using GET and event replay, never creates another run",async()=>{
   let state="running";
   const {client,calls}=clientWith(method=>{
     if(method==="aiverse.gateway.run.create")return run("running");
     if(method==="aiverse.gateway.run.get")return run(state,{output:state==="completed"?"Verified full reply":undefined});
     throw Error("Unexpected RPC");
   });
   const f=testFeed();
   const chat=new PersonalChatRunController(client,f.feed);
   await chat.send("What is the camera move?","only-create-key");
   f.watchers[0].handlers.event(event("assistant.delta",1,"Unverified partial"));
   assert.equal(chat.snapshot().output,"Unverified partial");
   f.watchers[0].handlers.interrupted("EVENT_STREAM_INTERRUPTED");
   assert.equal(chat.snapshot().phase,"interrupted");
   assert.equal(chat.snapshot().runId,"run-a");
   const recovered=await chat.reconnect();
   assert.equal(recovered.phase,"running");
   assert.equal(recovered.output,"","old streamed partial must be erased before replay");
   assert.equal(f.watchers.length,2,"fresh subscription to same run");
   assert.equal(f.watchers[0].cancelled,true,"previous event listener is closed");
   assert.deepEqual(calls.map(x=>x.method),[
     "aiverse.gateway.run.create","aiverse.gateway.run.get"]);
   f.watchers[0].handlers.event(event("assistant.delta",2,"FORGED LATE"));
   f.watchers[1].handlers.event(event("assistant.delta",1,"Full replay"));
   assert.equal(chat.snapshot().output,"Full replay");
   state="completed";
   f.watchers[1].handlers.event(event("run.completed",2));
   await nextTick();
   assert.equal(chat.snapshot().phase,"completed");
   assert.equal(chat.snapshot().output,"Verified full reply");
   assert.deepEqual(calls.map(x=>x.method),[
     "aiverse.gateway.run.create","aiverse.gateway.run.get","aiverse.gateway.run.get"]);
   await assert.rejects(chat.reconnect(),(e:unknown)=>
     (e as {code?:string}).code==="CHAT_RECONNECT_UNAVAILABLE");
 });
 it("reconnect accepts an already-completed canonical run without resubscribing",async()=>{
   const {client,calls}=clientWith(method=>method==="aiverse.gateway.run.create"
     ?run("running"):run("completed",{output:"Canonical finished result"}));
   const f=testFeed(),chat=new PersonalChatRunController(client,f.feed);
   await chat.send("Try it","stable-once");
   f.watchers[0].handlers.interrupted("EVENT_STREAM_INTERRUPTED");
   const next=await chat.reconnect();
   assert.equal(next.phase,"completed");
   assert.equal(next.output,"Canonical finished result");
   assert.equal(f.watchers.length,1);
   assert.equal(calls.filter(c=>c.method==="aiverse.gateway.run.create").length,1);
 });
 it("recovers only via canonical run GET, preserving paused recovery-required state",async()=>{
   const {client,calls}=clientWith(method=>{
     assert.equal(method,"aiverse.gateway.run.get");
     return run("paused_recovery_required");
   });
   const {feed,watchers}=testFeed();
   const controller=new PersonalChatRunController(client,feed);
   const recovered=await controller.recover("run-a");
   assert.equal(recovered.phase,"recovery-required");
   assert.equal(recovered.runId,"run-a");
   assert.equal(recovered.sessionId,"session-a");
   assert.equal(recovered.output,"");
   assert.equal(watchers.length,0,"do not fake or auto-resume a recovered Gateway run");
   assert.equal(calls.length,1);
 });
 it("retries an uncertain create with the identical idempotency key",async()=>{
   let attempt=0;
   const {client,calls}=clientWith(method=>{
     if(method!=="aiverse.gateway.run.create")throw Error("unexpected GET");
     if(++attempt===1)throw Error("connection dropped after possible commit");
     return run("running");
   });
   const {feed}=testFeed();
   const controller=new PersonalChatRunController(client,feed);
   const first=await controller.send("Please analyze","stable-1");
   assert.equal(first.phase,"interrupted");
   assert.equal(first.runId,undefined);
   const second=await controller.retrySubmission();
   assert.equal(second.phase,"running");
   assert.deepEqual(calls.map(x=>x.params?.idempotencyKey),["stable-1","stable-1"]);
   await assert.rejects(controller.retrySubmission(),(e:unknown)=>
     (e as {code?:string}).code==="CHAT_NOT_RETRYABLE");
 });
 it("ignores old events and late A-B-A submission responses",async()=>{
   let release:(value:{json():Promise<unknown>})=>void=()=>{};
   const fetchFn:FetchFn=async(_url,init)=>{
     const req=JSON.parse(init.body) as {systemId:string};
     return new Promise(resolve=>{
       release=result=>resolve({json:async()=>({...(await result.json() as Record<string,unknown>),systemId:req.systemId})});
     });
   };
   const client=new DashboardClient("http://127.0.0.1:3100",SCOPE,TOKEN,fetchFn);
   const {feed,watchers}=testFeed();
   const controller=new PersonalChatRunController(client,feed);
   const inflight=controller.send("first","first-key");
   controller.retarget({systemId:"aiverse-01",workspaceId:"other"});
   controller.retarget(SCOPE);
   release({json:async()=>({ok:true,result:run("running"),
     observedAt:"2026-10-27T15:00:00Z"})});
   await inflight;
   assert.equal(controller.snapshot().phase,"idle");
   assert.equal(watchers.length,0);
   // Complete a new run and then switch away; the old stream cannot repaint A.
   const immediate=clientWith(method=>method==="aiverse.gateway.run.create"
     ?run("running"):run("completed",{output:"done"}));
   const f=testFeed();
   const active=new PersonalChatRunController(immediate.client,f.feed);
   await active.send("second","second-key");
   const old=f.watchers[0];
   active.retarget({systemId:"aiverse-01",workspaceId:"other"});
   active.retarget(SCOPE);
   old.handlers.event(event("assistant.delta",1,"private A text"));
   assert.equal(old.cancelled,true);
   assert.equal(active.snapshot().phase,"idle");
   assert.equal(active.snapshot().output,"");
 });
 it("does not mark a terminal event as success when canonical reconciliation fails",async()=>{
   const {client}=clientWith(method=>{
     if(method==="aiverse.gateway.run.create")return run("running");
     throw Object.assign(Error("host unavailable"),{code:"TRANSPORT_UNAVAILABLE"});
   });
   const f=testFeed();
   const controller=new PersonalChatRunController(client,f.feed);
   await controller.send("test","stable-2");
   f.watchers[0].handlers.event(event("run.completed",1));
   await nextTick();
   assert.equal(controller.snapshot().phase,"interrupted");
   assert.equal(controller.snapshot().errorCode,"TRANSPORT_UNAVAILABLE");
 });
});
class TestSocket implements ChatWebSocket {
 readyState=0;
 sent:string[]=[];
 closed=false;
 listeners=new Map<string,Array<(event:{data?:unknown})=>void>>();
 send(v:string){this.sent.push(v);}
 close(){this.closed=true;this.readyState=3;this.emit("close");}
 addEventListener(type:string,listener:(event:{data?:unknown})=>void){
   this.listeners.set(type,[...(this.listeners.get(type)??[]),listener]);
 }
 emit(type:string,data?:unknown){
   for(const f of this.listeners.get(type)??[])f({data});
 }
}
describe("authenticated local Dashboard run event feed",()=>{
 it("rejects non-local hosts and never sends host bearer in URL",()=>{
   assert.throws(()=>new DashboardChatEventFeed("https://remote.example",TOKEN),
     /CHAT_HOST_ORIGIN_INVALID/);
   const socket=new TestSocket();
   const requests:{url:string;protocols:string[]}[]=[];
   const feed=new DashboardChatEventFeed("http://127.0.0.1:3100",TOKEN,(url,protocols)=>{
     requests.push({url,protocols});return socket;
   });
   const events:ChatRunEvent[]=[];
   const failures:string[]=[];
   const stop=feed.subscribe(SCOPE,"run-a",{
     event:ev=>events.push(ev),interrupted:code=>failures.push(code),
   });
   assert.equal(requests[0].url,"ws://127.0.0.1:3100/ws?systemId=aiverse-01");
   assert.ok(!requests[0].url.includes(TOKEN));
   assert.ok(requests[0].protocols.some(x=>x.includes(TOKEN)));
   socket.readyState=1;socket.emit("open");
   assert.deepEqual(JSON.parse(socket.sent[0]),{
     type:"gateway-run-subscribe",workspaceId:"film",runId:"run-a",
   });
   socket.emit("message",JSON.stringify({
     type:"event",event:"aiverse.gateway.run.event",systemId:"aiverse-01",
     workspaceId:"film",seq:1,payload:{runId:"run-a",eventId:"evt-1",
       kind:"assistant.delta",text:"hello"},
   }));
   assert.equal(events[0].text,"hello");
   socket.emit("message",JSON.stringify({
     type:"event",event:"aiverse.gateway.run.event",systemId:"aiverse-01",
     workspaceId:"other",seq:2,payload:{runId:"run-a",eventId:"evt-2",
       kind:"assistant.delta",text:"wrong workspace"},
   }));
   assert.equal(failures[0],"CHAT_SCOPE_MISMATCH");
   assert.equal(events.length,1);
   stop();
 });
 it("opens a scoped WebSocket using ambient HttpOnly cookie without bearer protocols",()=>{
   const socket=new TestSocket();
   const requests:Array<{url:string;protocols:string[]}>=[];
   const feed=new DashboardChatEventFeed("http://127.0.0.1:3100",
     {mode:"host-cookie"},(url,protocols)=>{requests.push({url,protocols});return socket;});
   const stop=feed.subscribe(SCOPE,"run-a",{event:()=>{},interrupted:()=>{}});
   assert.deepEqual(requests[0].protocols,["aiverse.dashboard.v1"]);
   assert.equal(requests[0].url,"ws://127.0.0.1:3100/ws?systemId=aiverse-01");
   stop();
 });
 it("reports malformed or denied subscriptions without displaying fabricated text",()=>{
   const socket=new TestSocket();
   const feed=new DashboardChatEventFeed("http://localhost:3100",TOKEN,()=>socket);
   const errors:string[]=[];
   feed.subscribe(SCOPE,"run-a",{event:()=>assert.fail("event must not render"),
     interrupted:code=>errors.push(code)});
   socket.emit("message",JSON.stringify({type:"res",id:"gateway-run-subscribe",
     ok:false,error:{code:"RUN_BINDING_MISMATCH"}}));
   assert.deepEqual(errors,["RUN_BINDING_MISMATCH"]);
   assert.equal(socket.closed,true);
 });
});
