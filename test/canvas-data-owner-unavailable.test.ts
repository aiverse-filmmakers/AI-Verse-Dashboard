import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,readdirSync,rmSync} from "node:fs";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {SystemRegistry} from "../packages/registry/src/index.js";
import {DisposableCache} from "../packages/os-read-adapter/src/index.js";
import {QueryRouter,SubscriptionHub,startGateway} from "../apps/gateway/src/index.js";
import {DashboardClient} from "../packages/client/src/index.js";

describe("Canvas read/write must fail closed before canonical Data owner installs",()=>{
  it("denies all nine methods without creating an independent Dashboard Canvas store",async()=>{
    const root=mkdtempSync(join(tmpdir(),"aiverse-no-canvas-owner-"));
    let gateway:Awaited<ReturnType<typeof startGateway>>|undefined;
    try{
      writeFileSync(join(root,"AI-VERSE.yaml"),
        'schema_version: "2.0"\narchitecture: unified-workspace\n');
      writeFileSync(join(root,"AGENTS.md"),"# CI only");
      for(const folder of ["operator","system","workspaces"])mkdirSync(join(root,folder));
      const registry=new SystemRegistry();
      const systemId=registry.register(root,{label:"No Data owner"}).systemId;
      gateway=await startGateway(new QueryRouter(registry,new DisposableCache()),
        new SubscriptionHub(),{port:0});
      const origin="http://127.0.0.1:"+gateway.port;
      const client=new DashboardClient(origin,{systemId,workspaceId:"operator"},
        gateway.authToken);
      const operations:Array<[string,Record<string,unknown>]>=[
        ["aiverse.canvas.list",{limit:50}],
        ["aiverse.canvas.get",{id:"board-1"}],
        ["aiverse.canvas.history",{id:"board-1",limit:10}],
        ["aiverse.canvas.create",{title:"Unapproved",idempotencyKey:"create-1"}],
        ["aiverse.canvas.rename",{id:"board-1",title:"Other",
          expectedVersion:1,idempotencyKey:"rename-1"}],
        ["aiverse.canvas.edit",{id:"board-1",edit:{type:"note.add"},
          expectedVersion:1,idempotencyKey:"edit-1"}],
        ["aiverse.canvas.duplicate",{id:"board-1",expectedVersion:1,
          idempotencyKey:"copy-1"}],
        ["aiverse.canvas.revert",{id:"board-1",toVersion:1,expectedVersion:2,
          idempotencyKey:"undo-1"}],
        ["aiverse.canvas.delete",{id:"board-1",expectedVersion:1,
          idempotencyKey:"delete-1"}],
      ];
      for(const [method,params] of operations){
        const res:Response=await fetch(origin+"/rpc",{method:"POST",
          headers:{authorization:"Bearer "+gateway.authToken,
            "content-type":"application/json",origin},
          body:JSON.stringify({type:"req",v:"1.0",id:"owner-unavailable",
            systemId,workspaceId:"operator",method,params})});
        assert.equal(res.status,200,method);
        const body=await res.json() as {ok:boolean;error:{code:string}};
        assert.equal(body.ok,false);
        assert.equal(body.error.code,"CANVAS_OWNER_UNAVAILABLE",method);
      }
      await assert.rejects(client.canvasList(),(e:unknown)=>
        (e as {code:string}).code==="CANVAS_OWNER_UNAVAILABLE");
      assert.deepEqual(readdirSync(root).sort(),
        ["AGENTS.md","AI-VERSE.yaml","operator","system","workspaces"].sort());
      const unauthed=await fetch(origin+"/rpc",{method:"POST",headers:{
        origin,"content-type":"application/json"},body:JSON.stringify({
        type:"req",v:"1.0",id:"no-auth",systemId,workspaceId:"operator",
        method:"aiverse.canvas.create",params:{title:"bad"}})});
      assert.equal(unauthed.status,401);
    }finally{if(gateway)await gateway.close();rmSync(root,{recursive:true,force:true});}
  });
});
