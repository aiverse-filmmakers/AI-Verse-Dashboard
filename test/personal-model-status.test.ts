import {test} from "node:test";
import assert from "node:assert/strict";
import {inspectModelCatalog} from "../apps/web/src/personal-model-status.js";

const scope={systemId:"aiverse-01",workspaceId:"film"};
const catalog=()=>({
  source:"canonical-gateway",workspaceId:"film",
  models:[{id:"aiverse",label:"AI-Verse Gateway",kind:"gateway-virtual"}],
  runtimeKind:"deterministic",modelSelectionSupported:false,
  providerSelectionSupported:false,inferenceVerified:false,
  evidence:"authenticated-status-and-models",observedAt:"2026-10-30T00:00:00Z",
});
test("only canonical authenticated virtual model is presented as gateway-managed",()=>{
  const view=inspectModelCatalog(catalog(),scope);
  assert.equal(view.model,"aiverse");
  assert.equal(view.runtimeKind,"deterministic");
  assert.equal(view.selectionSupported,false);
  assert.equal(view.providerSelectionSupported,false);
  assert.ok(!JSON.stringify(view).includes("secret"));
});
test("does not trust a public preview or another workspace",()=>{
  assert.throws(()=>inspectModelCatalog({...catalog(),source:"preview"},scope),/SCOPE_MISMATCH/);
  assert.throws(()=>inspectModelCatalog({...catalog(),workspaceId:"operator"},scope),/SCOPE_MISMATCH/);
});
test("rejects fabricated providers, physical models and enabled switches",()=>{
  for(const variant of [
    {...catalog(),models:[{id:"gpt-unknown",label:"GPT",kind:"provider"}]},
    {...catalog(),models:[...catalog().models,{id:"second"}]},
    {...catalog(),modelSelectionSupported:true},
    {...catalog(),providerSelectionSupported:true},
    {...catalog(),inferenceVerified:true},
    {...catalog(),evidence:"unverified"},
  ])assert.throws(()=>inspectModelCatalog(variant,scope),/INVALID_SOURCE/);
});
test("sanitizes malicious runtime metadata and malformed observation",()=>{
  for(const runtime of ["../../private","Bearer token-secret","a".repeat(100),"",123]){
    assert.throws(()=>inspectModelCatalog({...catalog(),runtimeKind:runtime},scope),/INVALID_SOURCE/);
  }
  assert.throws(()=>inspectModelCatalog({...catalog(),observedAt:"not-a-date"},scope),/INVALID_SOURCE/);
  assert.throws(()=>inspectModelCatalog(null,scope),/INVALID_SOURCE/);
});
