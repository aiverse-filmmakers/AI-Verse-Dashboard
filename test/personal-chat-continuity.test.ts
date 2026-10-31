import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {DashboardClient,PersonalChatRunController,
  type ChatEventFeed,type ChatRunEvent,type FetchFn} from "../packages/client/src/index.js";

const SCOPE={systemId:"aiverse-01",workspaceId:"operator"};
type Submission={method:string;workspaceId:string;params?:{
  sessionId?:string;idempotencyKey?:string;
  messages?:Array<{role:"user"|"assistant";content:string}>;runId?:string;
}};
function rig(){
  const calls:Submission[]=[];
  const listening:Array<{runId:string;event:(event:ChatRunEvent)=>void;cancelled:boolean}>=[];
  const answers=new Map<string,string>();
  let count=0,createError=false,forceSessionMismatch=false,failGet=false;
  const fetcher:FetchFn=async(_url,init)=>{
    const frame=JSON.parse(init.body) as Submission&{systemId:string};
    calls.push(frame);
    if(frame.method==="aiverse.gateway.run.create"&&createError){
      createError=false;
      throw Object.assign(new Error("uncertain network"),{code:"TRANSPORT_UNAVAILABLE"});
    }
    let result:Record<string,unknown>;
    if(frame.method==="aiverse.gateway.run.create"){
      const runId="run-"+(++count);
      answers.set(runId,"canonical answer "+count);
      result={runId,sessionId:forceSessionMismatch?"session-other":"session-1",
        systemId:"canonical-a",workspaceId:frame.workspaceId,status:"running",
        source:"canonical-gateway"};
    }else if(frame.method==="aiverse.gateway.run.get"){
      if(failGet)throw Object.assign(new Error("unavailable"),{code:"TRANSPORT_UNAVAILABLE"});
      const runId=String(frame.params?.runId??"");
      result={runId,sessionId:"session-1",systemId:"canonical-a",
        workspaceId:"operator",status:"completed",source:"canonical-gateway",
        output:answers.get(runId)??"older canonical answer"};
    }else throw Error("Unknown RPC "+frame.method);
    return {json:async()=>({
      type:"res",v:"1.0",id:"proof",ok:true,systemId:frame.systemId,
      result,observedAt:"2026-10-28T14:00:00Z",
    })};
  };
  const feed:ChatEventFeed={subscribe:(_scope,runId,handlers)=>{
    const record={runId,event:handlers.event,cancelled:false};
    listening.push(record);
    return ()=>{record.cancelled=true};
  }};
  const client=new DashboardClient("http://127.0.0.1:3100",SCOPE,
    "test-dashboard-auth-0011223344556677",fetcher);
  const chat=new PersonalChatRunController(client,feed);
  const finish=async(runId?:string)=>{
    const target=listening.at(-1);
    assert.ok(target);
    assert.equal(target.runId,runId??target.runId);
    target.event({...SCOPE,runId:target.runId,eventId:"terminal-"+target.runId,
      kind:"run.completed",seq:1});
    await new Promise<void>(resolve=>setImmediate(resolve));
    assert.equal(chat.snapshot().phase,"completed");
  };
  return {chat,calls,listening,answers,finish,
    interruptNext:()=>{createError=true},
    mismatchSession:()=>{forceSessionMismatch=true},
    makeGetFail:()=>{failGet=true},
  };
}
describe("MC2.5 canonical multi-turn chat continuity and recovery",()=>{
  it("sends verified transcript and reuses the SAME Gateway session on second and third turns",async()=>{
    const r=rig();
    await r.chat.send("First shot","key-first");
    await r.finish("run-1");
    assert.equal(r.chat.snapshot().sessionId,"session-1");
    await r.chat.send("What about lighting?","key-second");
    assert.equal(r.calls[2].method,"aiverse.gateway.run.create");
    assert.equal(r.calls[2].params?.sessionId,"session-1");
    assert.deepEqual(r.calls[2].params?.messages,[
      {role:"user",content:"First shot"},
      {role:"assistant",content:"canonical answer 1"},
      {role:"user",content:"What about lighting?"},
    ]);
    await r.finish("run-2");
    await r.chat.send("Change the focal length","key-third");
    assert.equal(r.calls[4].params?.sessionId,"session-1");
    assert.deepEqual(r.calls[4].params?.messages,[
      {role:"user",content:"First shot"},
      {role:"assistant",content:"canonical answer 1"},
      {role:"user",content:"What about lighting?"},
      {role:"assistant",content:"canonical answer 2"},
      {role:"user",content:"Change the focal length"},
    ]);
  });
  it("does not reuse an uncertain request as a new conversation and retries its original payload",async()=>{
    const r=rig();
    await r.chat.send("An initial shot","original");
    await r.finish("run-1");
    r.interruptNext();
    const interrupted=await r.chat.send("Follow up","stable-followup");
    assert.equal(interrupted.phase,"interrupted");
    assert.equal(interrupted.runId,undefined);
    await assert.rejects(r.chat.send("A dangerous duplicate","different-key"),
      (e:unknown)=>(e as {code?:string}).code==="CHAT_PREVIOUS_RUN_UNRESOLVED");
    const original=r.calls.at(-1);
    const retried=await r.chat.retrySubmission();
    assert.equal(retried.phase,"running");
    assert.deepEqual(r.calls.at(-1)?.params,original?.params);
    assert.equal(r.calls.at(-1)?.params?.sessionId,"session-1");
    await r.finish("run-2");
    assert.equal(r.chat.snapshot().phase,"completed");
  });
  it("recovers a canonical session ID but never fabricates its missing transcript",async()=>{
    const r=rig();
    const recovered=await r.chat.recover("run-older");
    assert.equal(recovered.phase,"completed");
    assert.equal(recovered.sessionId,"session-1");
    assert.equal(recovered.output,"older canonical answer");
    assert.equal(recovered.contextLimited,true);
    await r.chat.send("Follow up after recovery","after-recovery");
    const frame=r.calls.at(-1);
    assert.equal(frame?.params?.sessionId,"session-1");
    assert.deepEqual(frame?.params?.messages,[{role:"user",content:"Follow up after recovery"}],
      "Gateway getRun did not return earlier user turns; never invent them");
    assert.equal(r.chat.snapshot().contextLimited,true);
  });
  it("retarget and explicit new chat discard the old session and user context",async()=>{
    const r=rig();
    await r.chat.send("first","key-1");await r.finish("run-1");
    r.chat.retarget({systemId:"aiverse-01",workspaceId:"other"});
    r.chat.retarget(SCOPE);
    await r.chat.send("new system choice","key-new");
    assert.equal(r.calls.at(-1)?.params?.sessionId,undefined);
    assert.deepEqual(r.calls.at(-1)?.params?.messages,
      [{role:"user",content:"new system choice"}]);
    await r.finish("run-2");
    r.chat.close();
    await r.chat.send("fresh new conversation","key-fresh");
    assert.equal(r.calls.at(-1)?.params?.sessionId,undefined);
    assert.deepEqual(r.calls.at(-1)?.params?.messages,
      [{role:"user",content:"fresh new conversation"}]);
  });
  it("rejects Gateway session reassignment rather than silently breaking continuity",async()=>{
    const r=rig();
    await r.chat.send("first","key-1");await r.finish("run-1");
    r.mismatchSession();
    const next=await r.chat.send("same session please","key-2");
    assert.equal(next.phase,"interrupted");
    assert.equal(next.errorCode,"CHAT_SESSION_BINDING_MISMATCH");
    assert.equal(next.runId,undefined);
    await assert.rejects(r.chat.send("another","key-3"),
      (e:unknown)=>(e as {code?:string}).code==="CHAT_PREVIOUS_RUN_UNRESOLVED");
  });
  it("excludes unconfirmed streamed deltas from follow-up context after a failed canonical GET",async()=>{
    const r=rig();
    await r.chat.send("initial","key-initial");
    const target=r.listening.at(-1)!;
    target.event({...SCOPE,runId:"run-1",eventId:"draft-1",kind:"assistant.delta",
      text:"DO NOT PROMOTE THIS DRAFT",seq:1});
    r.makeGetFail();
    target.event({...SCOPE,runId:"run-1",eventId:"terminal-1",kind:"run.completed",seq:2});
    await new Promise<void>(resolve=>setImmediate(resolve));
    assert.equal(r.chat.snapshot().phase,"interrupted");
    await assert.rejects(r.chat.send("follow","new-key"),
      (e:unknown)=>(e as {code?:string}).code==="CHAT_PREVIOUS_RUN_UNRESOLVED");
  });
  it("bounds the history to six complete user/assistant pairs",async()=>{
    const r=rig();
    for(let n=0;n<8;n++){
      await r.chat.send("message "+n,"key-"+n);
      await r.finish("run-"+(n+1));
    }
    await r.chat.send("turn nine","key-9");
    const messages=r.calls.at(-1)?.params?.messages??[];
    assert.equal(messages.length,13);
    assert.equal(messages[0].content,"message 2");
    assert.equal(messages.at(-1)?.content,"turn nine");
    assert.equal(r.chat.snapshot().contextLimited,true);
  });
});
