import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {dashboardWsAuthProtocol,DASHBOARD_WS_PROTOCOL}
  from "../packages/protocol/src/index.js";
import {DashboardChatEventFeed,type ChatRunEvent,
  type ChatWebSocket,type ChatWebSocketFactory}
  from "../packages/client/src/index.js";

class StubSocket implements ChatWebSocket {
  readyState=1;
  sent:string[]=[];
  closed=false;
  listeners=new Map<string,Array<(event:{data?:unknown})=>void>>();
  addEventListener(type:string,fn:(event:{data?:unknown})=>void):void{
    this.listeners.set(type,[...(this.listeners.get(type)??[]),fn]);
  }
  send(data:string):void{this.sent.push(data);}
  close():void{this.closed=true;this.readyState=3;this.emit("close");}
  emit(type:string,data?:unknown):void{
    for(const fn of this.listeners.get(type)??[])fn({data});
  }
}
function fixture(token:string|{mode:"host-cookie"}="test-dashboard-auth-token-0123456789"){
  const sockets:StubSocket[]=[];
  const requests:Array<{url:string;protocols:string[]}>=[];
  const factory:ChatWebSocketFactory=(url,protocols)=>{
    requests.push({url,protocols});
    const socket=new StubSocket();sockets.push(socket);return socket;
  };
  const feed=new DashboardChatEventFeed("http://127.0.0.1:3100",token,factory);
  const events:ChatRunEvent[]=[];
  const interruptions:string[]=[];
  const scope={systemId:"aiverse-01",workspaceId:"operator"};
  const subscribe=()=>feed.subscribe(scope,"run-1",{
    event:x=>events.push(x),interrupted:x=>interruptions.push(x)});
  const frame=(overrides:Record<string,unknown>={})=>JSON.stringify({
    type:"event",v:"1.0",event:"aiverse.gateway.run.event",
    systemId:scope.systemId,workspaceId:scope.workspaceId,seq:1,
    payload:{runId:"run-1",eventId:"ev-1",kind:"assistant.delta",text:"hello"},
    ...overrides,
  });
  return {scope,feed,events,interruptions,sockets,requests,subscribe,frame};
}
describe("MC2.2 typed canonical WebSocket event feed",()=>{
  it("connects only through the local Dashboard WS with native protocol auth and IDs",()=>{
    const f=fixture();
    const cancel=f.subscribe();
    assert.equal(f.requests.length,1);
    assert.equal(f.requests[0].url,
      "ws://127.0.0.1:3100/ws?systemId=aiverse-01");
    assert.deepEqual(f.requests[0].protocols,[
      DASHBOARD_WS_PROTOCOL,dashboardWsAuthProtocol("test-dashboard-auth-token-0123456789")]);
    const socket=f.sockets[0];socket.emit("open");
    assert.deepEqual(JSON.parse(socket.sent[0]),{
      type:"gateway-run-subscribe",workspaceId:"operator",runId:"run-1"});
    socket.emit("message",f.frame());
    assert.deepEqual(f.events,[{
      systemId:"aiverse-01",workspaceId:"operator",runId:"run-1",
      eventId:"ev-1",kind:"assistant.delta",seq:1,text:"hello",
    }]);
    cancel();
    assert.deepEqual(JSON.parse(socket.sent[1]),{type:"gateway-run-unsubscribe"});
    assert.equal(socket.closed,true);
    socket.emit("message",f.frame({seq:2}));
    assert.equal(f.events.length,1,"disposed feed must ignore late events");
    assert.equal(f.interruptions.length,0);
  });
  it("supports admitted host-cookie mode without inventing a browser bearer",()=>{
    const f=fixture({mode:"host-cookie"});
    const cancel=f.subscribe();
    assert.deepEqual(f.requests[0].protocols,[DASHBOARD_WS_PROTOCOL]);
    cancel();
  });
  it("fails closed on wrong system, workspace or run and closes the socket once",()=>{
    const cases:Array<Record<string,unknown>>=[
      {systemId:"other-system"},
      {workspaceId:"film"},
      {payload:{runId:"run-2",eventId:"ev-1",kind:"assistant.delta"}},
      {payload:{runId:"run-1",eventId:"ev-1",kind:"assistant.delta",text:42}},
      {seq:0},
    ];
    for(const change of cases){
      const f=fixture();
      f.subscribe();
      const socket=f.sockets[0];socket.emit("open");
      socket.emit("message",f.frame(change));
      assert.deepEqual(f.events,[]);
      assert.equal(f.interruptions.length,1);
      assert.equal(socket.closed,true);
      socket.emit("error");
      assert.equal(f.interruptions.length,1);
    }
  });
  it("rejects untrusted oversized frames and malformed JSON without forwarding it",()=>{
    for(const bad of ["not-json","x".repeat(131073)]){
      const f=fixture();f.subscribe();
      f.sockets[0].emit("message",bad);
      assert.deepEqual(f.interruptions,["CHAT_INVALID_STREAM"]);
      assert.deepEqual(f.events,[]);
    }
  });
  it("projects only safe upstream denial codes and refuses unsafe error messages",()=>{
    const f=fixture();f.subscribe();
    f.sockets[0].emit("message",JSON.stringify({type:"res",
      id:"gateway-run-subscribe",ok:false,
      error:{code:"DENIED",message:"private native host credential"}}));
    assert.deepEqual(f.interruptions,["DENIED"]);
    assert.equal(f.sockets[0].closed,true);
    const g=fixture();g.subscribe();
    g.sockets[0].emit("message",JSON.stringify({type:"res",
      id:"gateway-run-subscribe",ok:false,error:{code:"Bearer PRIVATE"}}));
    assert.deepEqual(g.interruptions,["CHAT_SUBSCRIPTION_DENIED"]);
  });
  it("rejects non-loopback origins and invalid declared scope before socket creation",()=>{
    for(const url of ["https://example.com","http://192.168.1.4:3100",
      "http://username:password@localhost:3100",
      "http://localhost:3100/rpc"]){
      assert.throws(()=>new DashboardChatEventFeed(url,"test-dashboard-auth-token-0123456789",
        ()=>new StubSocket()),/CHAT_HOST_ORIGIN_INVALID/);
    }
    const f=fixture();
    assert.throws(()=>f.feed.subscribe({systemId:"aiverse-01",workspaceId:"../../private"},
      "run-1",{event:()=>{},interrupted:()=>{}}),/CHAT_SCOPE_REQUIRED/);
    assert.equal(f.requests.length,0);
  });
});
