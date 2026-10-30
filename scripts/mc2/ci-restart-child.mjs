/**
 * CI-only child process for real Gateway and Dashboard stop/restart evidence.
 * No member data or credentials. Readiness and pairing secret travel exclusively
 * over a private parent/child IPC channel, never stdout, URL or repository.
 */
import {readFile} from "node:fs/promises";
import {resolve,join} from "node:path";
import {pathToFileURL} from "node:url";
import {SystemRegistry} from "../../dist/packages/registry/src/index.js";
import {DisposableCache} from "../../dist/packages/os-read-adapter/src/index.js";
import {CanonicalGatewayBridge,QueryRouter,SubscriptionHub,startGateway} from "../../dist/apps/gateway/src/index.js";
import {LocalApplicationSession} from "../../dist/apps/gateway/src/local-app-session.js";

if(process.env.CI!=="true"||typeof process.send!=="function")
  throw Error("RESTART_PROOF_CI_IPC_REQUIRED");
const mode=process.argv[2];
const env=process.env;
let service;
let shutting=false;
try {
  const requestedPort=Number(env.AIVERSE_RESTART_PORT);
  if(!Number.isInteger(requestedPort)||requestedPort<1024||requestedPort>65535)
    throw Error("CI_RESTART_PORT_INVALID");
  if(mode==="canonical"){
    const source=resolve(env.AIVERSE_MC2_GATEWAY_SOURCE??"gateway-source");
    const {startServer}=await import(pathToFileURL(join(source,"src/server.mjs")).href);
    const {loadConfig}=await import(pathToFileURL(join(source,"src/config.mjs")).href);
    const home=resolve(env.AIVERSE_RESTART_HOME);
    service=await startServer(await loadConfig(home),home,{port:requestedPort});
    process.send({type:"ready",mode,port:service.port,pid:process.pid});
  }else if(mode==="dashboard"){
    const osRoot=resolve(env.AIVERSE_RESTART_OS_ROOT);
    const systemIdExpected=env.AIVERSE_RESTART_SYSTEM_ID;
    const registry=new SystemRegistry();
    const systemId=registry.register(osRoot,{systemId:systemIdExpected}).systemId;
    const source=(await Promise.all([
      "apps/web/local-app/index.html",
      "apps/web/local-app/boot.js",
      "apps/web/local-app/shell.css",
      "apps/web/src/personal-chat.css",
      "dist/apps/web/personal-chat.bundle.js",
    ].map(x=>readFile(x,"utf8"))));
    const assets={html:source[0],boot:source[1],css:source[2]+"\n"+source[3],chat:source[4]};
    const app=new LocalApplicationSession({systemId,workspaceId:"operator"},assets);
    const bridge=new CanonicalGatewayBridge(registry,[{
      dashboardSystemId:systemId,
      canonicalSystemId:env.AIVERSE_RESTART_CANONICAL_SYSTEM_ID,
      origin:env.AIVERSE_RESTART_CANONICAL_ORIGIN,
      resolveBearer:()=>env.AIVERSE_RESTART_TOKEN,
    }]);
    service=await startGateway(new QueryRouter(registry,new DisposableCache()),
      new SubscriptionHub(),{port:requestedPort,canonicalBridge:bridge,localApp:app});
    // The generated one-time pairing code is sent ONLY over the CI parent's
    // private IPC channel. It is not printed or saved anywhere.
    process.send({type:"ready",mode,port:service.port,systemId,pid:process.pid,
      pairingCode:app.pairingCode()});
  }else throw Error("CI_RESTART_MODE_INVALID");
  const close=async()=>{
    if(shutting)return;shutting=true;
    try{await service.close();process.send?.({type:"stopped",mode,pid:process.pid});process.exit(0);}
    catch{process.exit(1);}
  };
  process.on("message",msg=>{if(msg?.type==="stop")void close();});
  process.on("SIGTERM",()=>{void close()});
  process.on("disconnect",()=>{void close()});
}catch{
  process.send?.({type:"failed",mode,code:"CI_RESTART_CHILD_FAILED"});
  process.exit(1);
}
