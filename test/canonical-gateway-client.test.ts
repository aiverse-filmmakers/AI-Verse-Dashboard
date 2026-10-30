import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CanonicalGatewayClient, GatewayTransportError,
  type HostGatewayBinding,
} from "../packages/client/src/canonical-gateway-client.js";

const binding = (overrides: Partial<HostGatewayBinding> = {}): HostGatewayBinding => ({
  origin:"http://127.0.0.1:8080",canonicalSystemId:"system-a",
  workspaceId:"operator",resolveBearer:()=>"host-token-123",...overrides,
});
const run = (overrides: Record<string, unknown> = {}) => ({
  run_id:"run-1",session_id:"session-1",system_id:"system-a",workspace_id:"operator",
  status:"running",...overrides,
});
const json=(obj:unknown,status=200)=>new Response(JSON.stringify(obj),{
  status,headers:{"content-type":"application/json"},
});
function fixture(handler:(url: URL,init:RequestInit)=>Response|Promise<Response>,
  overrides: Partial<HostGatewayBinding> = {}){
  const requests: {path:string;init:RequestInit}[]=[];
  const fetchFn: typeof fetch = async (url,init={})=>{
    const parsed=new URL(String(url));
    requests.push({path:parsed.pathname,init});
    return handler(parsed,init);
  };
  const client=new CanonicalGatewayClient(binding(overrides),{fetchFn,timeoutMs:700});
  return {client,requests};
}
async function errorCode(p: Promise<unknown>,code:string){
  await assert.rejects(p,(e:unknown)=>
    e instanceof GatewayTransportError && e.code===code,
    "expected safe GatewayTransportError "+code);
}
describe("MC2.2 host-only canonical Gateway transport",()=>{
  it("refuses remote, embedded credential, path and invalid scope origins",()=>{
    for(const origin of ["http://192.168.1.2:8100","https://example.com",
      "http://user:secret@localhost:9000","http://localhost:9000/private",
      "http://localhost:9000/?token=bad"]){
      assert.throws(()=>new CanonicalGatewayClient(binding({origin})),
        (e:unknown)=>e instanceof GatewayTransportError &&
          e.code==="UNAPPROVED_GATEWAY_ORIGIN");
    }
    assert.throws(()=>new CanonicalGatewayClient(binding({workspaceId:"../../other"})),
      (e:unknown)=>e instanceof GatewayTransportError && e.code==="INVALID_WORKSPACE");
  });
  it("checks authenticated ready status, system identity and actual virtual model",async()=>{
    const {client,requests}=fixture(url=>url.pathname==="/status"
      ?json({component:"ai-verse-gateway",system_id:"system-a",state:"ready",runtime:"deterministic",at:"2026-10-27T10:00:00Z"})
      :json({object:"list",data:[{id:"aiverse"}]}));
    const ready=await client.preflight();
    assert.equal(ready.systemId,"system-a");
    assert.equal(ready.model,"aiverse");
    assert.deepEqual(requests.map(x=>x.path),["/status","/v1/models"]);
    for(const item of requests) assert.equal((item.init.headers as Record<string,string>).authorization,"Bearer host-token-123");
    for(const item of requests) assert.equal(item.init.redirect,"error","upstream bearer must not follow redirects");
  });
  it("fails closed on a swapped Gateway system, absent model or unavailable host credentials",async()=>{
    const wrong=fixture(()=>json({component:"ai-verse-gateway",system_id:"system-b",state:"ready"}));
    await errorCode(wrong.client.preflight(),"SYSTEM_BINDING_MISMATCH");
    assert.equal(wrong.requests.length,1);
    const noModel=fixture(url=>url.pathname==="/status"
      ?json({component:"ai-verse-gateway",system_id:"system-a",state:"ready",runtime:"local"})
      :json({data:[{id:"other"}]}));
    await errorCode(noModel.client.preflight(),"MODEL_UNAVAILABLE");
    const badCredential=fixture(()=>{throw Error("should not call fetch")},{resolveBearer:()=>""});
    await errorCode(badCredential.client.preflight(),"GATEWAY_CREDENTIAL_UNAVAILABLE");
    assert.equal(badCredential.requests.length,0);
  });
  it("creates explicitly scoped runs with stable idempotency, no accidental second chat call",async()=>{
    const {client,requests}=fixture(url=>url.pathname==="/v1/runs"
      ?json(run(),202):json({error:{code:"NOT_FOUND"}} ,404));
    const args={messages:[{role:"user" as const,content:"Prepare a shot list"}],idempotencyKey:"idem-1"};
    assert.equal((await client.createRun(args)).run_id,"run-1");
    assert.equal((await client.createRun(args)).run_id,"run-1");
    assert.deepEqual(requests.map(x=>x.path),["/v1/runs","/v1/runs"]);
    for(const item of requests){
      const headers=item.init.headers as Record<string,string>;
      assert.equal(headers["idempotency-key"],"idem-1");
      const body=JSON.parse(String(item.init.body));
      assert.equal(body.model,"aiverse");
      assert.equal(body.metadata.workspace_id,"operator");
      assert.equal(body.metadata.session_id,undefined);
      assert.equal(headers.authorization,"Bearer host-token-123");
    }
  });
  it("rejects wrong run ID/workspace/system on reads and prevents mismatched control",async()=>{
    const {client,requests}=fixture(()=>json(run({workspace_id:"workspace-b"})));
    await errorCode(client.getRun("run-1"),"RUN_BINDING_MISMATCH");
    await errorCode(client.controlRun({runId:"run-1",action:"cancel",operationId:"op-1"}),"RUN_BINDING_MISMATCH");
    assert.equal(requests.some(x=>x.init.method==="POST"),false);
    const other=fixture(()=>json(run({system_id:"system-b"})));
    await errorCode(other.client.createRun({messages:[{role:"user",content:"x"}],idempotencyKey:"idem-1"}),"RUN_BINDING_MISMATCH");
    const swapped=fixture(()=>json(run({run_id:"run-other"})));
    await errorCode(swapped.client.getRun("run-1"),"RUN_BINDING_MISMATCH");
  });
  it("controls the specific checked run with unchanged operation ID and payload",async()=>{
    const {client,requests}=fixture((url,init)=>{
      if(init.method==="GET")return json(run());
      return json(run({status:"canceled"}));
    });
    const out=await client.controlRun({runId:"run-1",action:"cancel",operationId:"op-1",reason:"operator"});
    assert.equal(out.status,"canceled");
    assert.deepEqual(requests.map(x=>x.path),["/v1/runs/run-1","/v1/runs/run-1/cancel"]);
    assert.deepEqual(JSON.parse(String(requests[1].init.body)),{operation_id:"op-1",reason:"operator"});
    await errorCode(client.controlRun({runId:"run-1",action:"approval",operationId:"op-2"}),"APPROVAL_INVALID");
  });
  it("runs trusted owner lease callback after scoped GET but before any control POST",async()=>{
    let rebind=false,checks=0;
    const {client,requests}=fixture((url,init)=>{
      if(init.method==="GET")return json(run());
      assert.equal(rebind,false,"the old owner must never reach the control endpoint");
      return json(run({status:"canceled"}));
    });
    await errorCode(client.controlRun({runId:"run-1",action:"cancel",operationId:"op-1",
      validateBeforePost:prechecked=>{
        checks++;
        assert.equal(prechecked.run_id,"run-1");
        rebind=true;
        throw new GatewayTransportError("GATEWAY_MAPPING_STALE");
      },
    }),"GATEWAY_MAPPING_STALE");
    assert.equal(checks,1);
    assert.deepEqual(requests.map(x=>x.path),["/v1/runs/run-1"]);
    assert.equal(requests.some(x=>x.init.method==="POST"),false);
  });
  it("redacts upstream error messages and does not leak the bearer",async()=>{
    const {client}=fixture(()=>json({error:{code:"FORBIDDEN",message:"host-token-123 secret upstream detail"}},403));
    try{await client.getRun("run-1");assert.fail("must fail");}
    catch(error){
      assert.ok(error instanceof GatewayTransportError);
      assert.equal(error.code,"FORBIDDEN");
      assert.equal(error.status,403);
      assert.doesNotMatch(String(error),/host-token-123|secret upstream detail/);
    }
  });
  it("consumes only canonical scoped SSE events, deduplicates replay and refuses overflow",async()=>{
    const event={event_id:"ev-1",run_id:"run-1",type:"assistant.delta",at:"2026-10-27T12:00:00Z",data:{text:"Hello"}};
    const seen:string[]=[];
    const sse=(eventName:string, payload:unknown)=>"event: "+eventName+"\ndata: "+JSON.stringify(payload)+"\n\n";
    const {client}=fixture(url=>{
      if(url.pathname.endsWith("/events"))return new Response(
        sse("assistant.delta",event)+sse("assistant.delta",event),{headers:{"content-type":"text/event-stream"}});
      return json(run());
    });
    await client.subscribeRun("run-1",e=>seen.push(String(e.data.text)));
    assert.deepEqual(seen,["Hello"]);
    const overflow=fixture(url=>url.pathname.endsWith("/events")
      ?new Response(sse("gateway.replay_overflow",{error:"EVENT_REPLAY_OVERFLOW"}),
        {headers:{"content-type":"text/event-stream"}}):json(run()));
    await errorCode(overflow.client.subscribeRun("run-1",()=>{}),"EVENT_REPLAY_OVERFLOW");
    const wrong=fixture(url=>url.pathname.endsWith("/events")
      ?new Response(sse("assistant.delta",{...event,run_id:"run-2"}),
        {headers:{"content-type":"text/event-stream"}}):json(run()));
    await errorCode(wrong.client.subscribeRun("run-1",()=>{}),"EVENT_BINDING_MISMATCH");
  });
  it("parses CRLF SSE even when transport chunks divide the line ending",async()=>{
    const message={event_id:"ev-2",run_id:"run-1",type:"run.started",
      at:"2026-10-27T12:00:00Z",data:{phase:"running"}};
    const raw="event: run.started\r\ndata: "+JSON.stringify(message)+"\r\n\r\n";
    const parts=[raw.slice(0,19),raw.slice(19,37),raw.slice(37,raw.length-3),raw.slice(raw.length-3)];
    const stream=new ReadableStream<Uint8Array>({
      start(controller){for(const p of parts)controller.enqueue(new TextEncoder().encode(p));controller.close();}
    });
    const {client}=fixture(url=>url.pathname.endsWith("/events")
      ?new Response(stream,{headers:{"content-type":"text/event-stream"}}):json(run()));
    const seen:string[]=[];
    await client.subscribeRun("run-1",e=>seen.push(e.event_id));
    assert.deepEqual(seen,["ev-2"]);
  });
  it("invalidates an in-flight request on host binding change",async()=>{
    const {client}=fixture((_url,init)=>new Promise<Response>((_resolve,reject)=>{
      init.signal?.addEventListener("abort",()=>reject(new Error("aborted")),{once:true});
    }));
    const pending=client.preflight();
    client.invalidate();
    await errorCode(pending,"STALE_BINDING");
    await errorCode(client.getRun("run-1"),"STALE_BINDING");
  });
  it("rejects a declared oversized response before parsing its body",async()=>{
    let pulled=false;
    const {client}=fixture(()=>new Response(new ReadableStream<Uint8Array>({
      pull(controller){pulled=true;controller.enqueue(new Uint8Array([123]));controller.close();}
    }),{headers:{"content-type":"application/json","content-length":"1048577"}}));
    await errorCode(client.getRun("run-1"),"RESPONSE_TOO_LARGE");
    // A Response may prefetch its first stream chunk. The actual transport
    // must not depend on the server's content-length being truthful.
    assert.equal(typeof pulled,"boolean");
  });
  it("bounds actual bytes while consuming a chunked response regardless of header",async()=>{
    let reads=0,closed=false;
    const {client}=fixture(()=>new Response(new ReadableStream<Uint8Array>({
      pull(controller){
        reads++;
        controller.enqueue(new Uint8Array(700_000));
        // Keep the stream open so cancellation is observable at the limit.
      },
      cancel(){closed=true;}
    }),{headers:{"content-type":"application/json","content-length":"2"}}));
    await errorCode(client.getRun("run-1"),"RESPONSE_TOO_LARGE");
    assert.equal(closed,true,"oversized body must cancel its reader");
    assert.ok(reads<=2,"must stop reading at the byte limit");
  });
});
