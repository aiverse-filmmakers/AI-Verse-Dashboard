/**
 * MC2.2 host-only launch for an ALREADY-APPROVED local Gateway installation.
 * Reuses Gateway's owned config and the operator's existing ephemeral bearer.
 * Does not install/configure Gateway, authorize providers, edit OS or persist keys.
 */
import {readFileSync,statSync} from "node:fs";
import {homedir} from "node:os";
import {join,resolve} from "node:path";
import {SystemRegistry} from "../../packages/registry/src/index.js";
import {DisposableCache} from "../../packages/os-read-adapter/src/index.js";
import {CanonicalGatewayClient} from "../../packages/client/src/canonical-gateway-client.js";
import {CanonicalGatewayBridge} from "../../apps/gateway/src/canonical-gateway-bridge.js";
import {QueryRouter,SubscriptionHub,startGateway} from "../../apps/gateway/src/index.js";

function fail(code:string):never{
  // Never print source OS roots, tokens, gateway error messages or env contents.
  throw Object.assign(new Error(code),{code});
}
const env=process.env;
const home=resolve(env.AIVERSE_GATEWAY_HOME?.trim()||join(homedir(),".aiverse","gateway"));
if(!env.AIVERSE_GATEWAY_TOKEN?.trim())fail("GATEWAY_TOKEN_NOT_PROVIDED");
const token=env.AIVERSE_GATEWAY_TOKEN.trim();
const address=env.AIVERSE_GATEWAY_URL?.trim()||"http://127.0.0.1:8787";
const configPath=join(home,"config.json");
let doc:Record<string,unknown>;
try{
  const stat=statSync(configPath);
  if(!stat.isFile()||stat.size>128*1024||stat.size<10)fail("GATEWAY_CONFIG_INVALID");
  doc=JSON.parse(readFileSync(configPath,"utf8")) as Record<string,unknown>;
}catch{fail("GATEWAY_CONFIG_UNAVAILABLE")}
const system=doc.system;
if(!system||typeof system!=="object"||Array.isArray(system))fail("GATEWAY_CONFIG_INVALID");
const owned=system as {id?:unknown;root?:unknown};
if(typeof owned.id!=="string"||!owned.id||typeof owned.root!=="string"||!owned.root)fail("GATEWAY_CONFIG_INVALID");
const port=Number(env.AIVERSE_DASHBOARD_PORT||"3100");
if(!Number.isInteger(port)||port<1024||port>65535)fail("DASHBOARD_PORT_INVALID");

// This registry rechecks OS compatibility, realpath containment and root
// identity before granting any outbound canonical-Gateway operation.
const registry=new SystemRegistry();
let systemId:string;
try{systemId=registry.register(owned.root,{label:"Local AI-Verse"}).systemId;}
catch{fail("OS_ROOT_NOT_APPROVED")}
const resolveBearer=()=>token;
const transport=new CanonicalGatewayClient({
  origin:address,canonicalSystemId:owned.id,workspaceId:"operator",resolveBearer,
},{timeoutMs:8000});
let readiness;
try{readiness=await transport.preflight();}
catch{fail("CANONICAL_GATEWAY_PREFLIGHT_FAILED")}
finally{transport.invalidate()}
const bridge=new CanonicalGatewayBridge(registry,[{
  dashboardSystemId:systemId,canonicalSystemId:owned.id,origin:address,
  resolveBearer,
}]);

let server:Awaited<ReturnType<typeof startGateway>>;
try{
  server=await startGateway(new QueryRouter(registry,new DisposableCache()),
    new SubscriptionHub(),{port,canonicalBridge:bridge});
}catch{fail("DASHBOARD_HOST_START_FAILED")}
const report={
  state:"ready",scope:"local-operator",dashboardPort:server.port,
  dashboardSystemId:systemId,canonicalGatewaySystemId:readiness.systemId,
  gatewayModel:"aiverse",gatewayRuntimeKind:readiness.runtime,
  authentication:"local-host-bearer-required",privateBearerExported:false,
  providerLoginPerformed:false,connectionStorageWritten:false,
  personalUIEnabled:false,
};
// Auth token is deliberately never printed or persisted. The future native
// app host must hold the Dashboard bearer and supply authorized UI sessions.
process.stdout.write(JSON.stringify(report)+"\n");
const close=async()=>{try{await server.close();}finally{process.exitCode=0}};
for(const signal of ["SIGINT","SIGTERM"] as const){
  process.once(signal,()=>{void close()});
}
