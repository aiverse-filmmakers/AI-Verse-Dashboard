import {describe,it,afterEach} from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from "node:fs";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {SystemRegistry} from "../packages/registry/src/index.js";
import {createCanvasOwnerPreflight} from "../apps/gateway/src/index.js";

const roots:string[]=[];
afterEach(()=>{for(const root of roots.splice(0))rmSync(root,{recursive:true,force:true});});
function fixture(){
 const root=mkdtempSync(join(tmpdir(),"canvas-preflight-"));roots.push(root);
 writeFileSync(join(root,"AI-VERSE.yaml"),
  'schema_version: "2.0"\narchitecture: unified-workspace\n');
 writeFileSync(join(root,"AGENTS.md"),"# test");
 for(const name of ["operator","workspaces","system",
   "workspaces/film"])mkdirSync(join(root,name));
 writeFileSync(join(root,"workspaces/film","WORKSPACE.yaml"),
  'schema_version: "2.0"\nid: "film"\nname: "Film"\nstatus: "active"\n');
 const registry=new SystemRegistry(),systemId=registry.register(root).systemId;
 let state="current",errorCode="",inspections=0;
 const fake={
  TrustedDataRoot:{fromExistingDirectory:(dir:string)=>({dir})},
  createStandaloneDataScope:(_root:{dir:string},workspaceId:string)=>({
   kind:"standalone",workspaceId}),
  createWorkspaceDataScope:(_root:{dir:string},workspaceId:string)=>({
   kind:"workspace",workspaceId}),
  SqliteStorageDriver:class {},
  inspectScopedDataDatabase:(_driver:unknown,scope:{kind:string;workspaceId:string})=>{
   inspections++;
   if(errorCode)throw Object.assign(new Error(errorCode),{code:errorCode});
   return {state,binding:{...scope,bindingVersion:1}};
  },
 };
 const preflight=createCanvasOwnerPreflight(registry,systemId,fake);
 return {root,registry,systemId,preflight,
  setState:(s:string)=>{state=s},
  setError:(code:string)=>{errorCode=code},
  count:()=>inspections};
}
describe("host-only Canvas Data readiness",()=>{
 it("recognizes exact active standalone + workspace bindings",()=>{
  const a=fixture();
  assert.deepEqual(a.preflight.inspect("operator"),{
   ready:true,reason:"ready",workspaceId:"operator",systemId:a.systemId});
  assert.deepEqual(a.preflight.inspect("film"),{
   ready:true,reason:"ready",workspaceId:"film",systemId:a.systemId});
  assert.equal(a.count(),2);
 });
 it("never provisions an absent or quarantined Data scope",()=>{
  const a=fixture();
  a.setError("DATABASE_NOT_FOUND");
  assert.equal(a.preflight.inspect("operator").reason,"database-missing");
  a.setError("DATABASE_QUARANTINED");
  assert.equal(a.preflight.inspect("operator").reason,"database-quarantined");
  a.setError("DATABASE_SCOPE_CONFLICT");
  assert.equal(a.preflight.inspect("operator").reason,"scope-conflict");
  a.setError("DATABASE_FORMAT_UNRECOGNIZED");
  assert.equal(a.preflight.inspect("operator").reason,"database-unavailable");
 });
 it("does not pass missing, forged or paused workspace to native Data",()=>{
  const a=fixture();
  assert.equal(a.preflight.inspect("../film").reason,"invalid-workspace");
  assert.equal(a.preflight.inspect("missing").reason,"scope-inactive");
  writeFileSync(join(a.root,"workspaces","film","WORKSPACE.yaml"),
   'schema_version: "2.0"\nid: "film"\nname: "Film"\nstatus: "paused"\n');
  assert.equal(a.preflight.inspect("film").reason,"scope-inactive");
  assert.equal(a.count(),0,"unadmitted scopes cannot inspect SQLite");
 });
 it("rejects pending Data migrations instead of running them",()=>{
  const a=fixture();
  a.setState("required");
  assert.equal(a.preflight.inspect("operator").reason,"migration-required");
  a.setState("incomplete");
  assert.equal(a.preflight.inspect("operator").reason,"migration-required");
 });
 it("revokes when canonical registered root generation changes",()=>{
  const a=fixture();
  a.registry.unregister(a.systemId);
  assert.equal(a.preflight.inspect("operator").reason,"root-rebound");
  assert.equal(a.count(),0);
 });
});
