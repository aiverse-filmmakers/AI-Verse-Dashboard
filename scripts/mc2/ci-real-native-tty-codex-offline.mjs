/**
 * 3A.28: Actual FIRST-PARTY interactive TTY launcher -> pinned Codex.
 * Runs only in Docker --network none, using the pinned canonical Gateway
 * deterministic fake-host and disposable OS. No user HOME, login, secrets,
 * model turns, transcript, archive or production permission.
 * The TTY pairing code is never logged.
 */
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {createServer} from "node:net";
import {mkdtemp,mkdir,writeFile,rm} from "node:fs/promises";
import {join} from "node:path";
import {setTimeout as sleep} from "node:timers/promises";

assert.equal(process.platform,"linux");
assert.equal(process.env.CI,"true");
assert.equal(process.env.AIVERSE_PERSISTENT_CHATS_REAL_CODEX_TTY_CI,"1");
for(const name of ["GITHUB_TOKEN","OPENAI_API_KEY","CODEX_API_KEY",
                   "AIVERSE_GATEWAY_TOKEN"]){
  assert.equal(process.env[name],undefined);
}
const GatewayRoot="/app/gateway-source";
const {installComponent,setupComponent}=await import(
  GatewayRoot+"/src/lifecycle.mjs");
const {loadConfig}=await import(GatewayRoot+"/src/config.mjs");
const {startServer}=await import(GatewayRoot+"/src/server.mjs");

async function freePort(){
  const server=createServer();
  await new Promise((ok,fail)=>server.once("error",fail).listen(
    0,"127.0.0.1",ok));
  const value=server.address().port;
  await new Promise(ok=>server.close(ok));
  return value;
}
const root=await mkdtemp("/scratch/native-tty-codex-");
const osRoot=join(root,"os");
const home=join(root,"gateway");
const hostFile=join(root,"fake-host.json");
let gateway,terminal;
let text="",dead=false;
async function until(re,maxMs=12000,after=0){
  const began=Date.now();
  while(Date.now()-began<maxMs){
    const match=text.slice(after).match(re);
    if(match)return match;
    if(dead)throw Error("OFFLINE_NATIVE_TTY_EXITED");
    await sleep(35);
  }
  throw Error("OFFLINE_NATIVE_TTY_PROOF_TIMEOUT");
}
async function cmd(source,re,ms=12000){
  const start=text.length;
  terminal.stdin.write(source+"\n");
  return until(re,ms,start);
}
try{
  await mkdir(osRoot,{mode:0o700});
  for(const sub of ["operator","system","workspaces","workspaces/film"])
    await mkdir(join(osRoot,sub),{mode:0o700});
  await writeFile(join(osRoot,"AI-VERSE.yaml"),
    'schema_version: "2.0"\narchitecture: unified-workspace\n',{mode:0o600});
  await writeFile(join(osRoot,"AGENTS.md"),"# disposable only\n",{mode:0o600});
  await writeFile(join(osRoot,"workspaces/film/WORKSPACE.yaml"),
    'schema_version: "2.0"\nid: "film"\nname: "Film"\nstatus: "active"\n',{mode:0o600});
  await writeFile(hostFile,JSON.stringify({
    transport:"json-subprocess",
    command:[process.execPath,GatewayRoot+"/fixtures/fake-host.mjs"],
    timeout_seconds:10,max_output_bytes:1048576,
    max_stderr_bytes:65536,env_names:[],cwd:osRoot,
  }),{mode:0o600});
  await installComponent({home});
  const setup=await setupComponent({
    home,system_root:osRoot,host_config:hostFile,
    runtime:"deterministic",system_id:"ci-native-tty",workspace:"operator",port:0,
  });
  assert.equal(typeof setup.api_token,"string");
  assert.ok(setup.api_token.startsWith("avg_"));
  gateway=await startServer(await loadConfig(home),home,{port:0});
  const port=await freePort();
  const origin="http://127.0.0.1:"+port;

  // Script allocates a real PTY. The node launcher remains unmodified.
  terminal=spawn("script",[
    "-q","-e","-f","-c",
    "node /app/scripts/mc2/start-personal.mjs","/dev/null",
  ],{
    cwd:"/app",detached:true,stdio:["pipe","pipe","pipe"],
    env:{
      CI:"true",PATH:"/usr/local/bin:/usr/bin:/bin",
      HOME:join(root,"isolated-home"),
      AIVERSE_GATEWAY_HOME:home,
      AIVERSE_GATEWAY_TOKEN:setup.api_token,
      AIVERSE_GATEWAY_URL:"http://127.0.0.1:"+gateway.port,
      AIVERSE_DASHBOARD_PORT:String(port),
      AIVERSE_PERSISTENT_CHATS_REAL_CODEX_TTY_CI:"1",
      AIVERSE_PERSISTENT_CHATS_CHILD_PROOF:"1",
    },
  });
  terminal.on("exit",()=>{dead=true;});
  terminal.on("error",()=>{dead=true;});
  const capture=part=>{text=(text+String(part)).slice(-25000);};
  terminal.stdout.on("data",capture);
  terminal.stderr.on("data",capture);
  const pairing=(await until(
    /One-time pairing code \(expires in five minutes\): ([A-Za-z0-9_-]{40,})/,
    20000))[1];
  // A browser pairing is only a native host session gate, NOT consent.
  await cmd(":codex-child-proof real-readonly",/CODEX_CHILD_PROOF_DENIED/);
  const paired=await fetch(origin+"/local-app/pair",{
    method:"POST",headers:{origin,"content-type":"application/json"},
    body:JSON.stringify({code:pairing}),redirect:"error",
    signal:AbortSignal.timeout(6000),
  });
  assert.equal(paired.status,200);
  await cmd(":codex-child-proof real-readonly",/CODEX_CHILD_PROOF_DENIED/);
  await cmd(":chat-intent on",
    /Prospective chat request noted for up to 2 minutes/);
  await cmd(":codex-child-proof real-readonly",/CODEX_CHILD_PROOF_DENIED/);
  await cmd(":chat-review confirm operator future-text-only",
    /Prospective text scope review acknowledged/);
  // This command performs only initialize/initialized/config/read, then
  // terminates and reaps the pinned real Codex child.
  await cmd(":codex-child-proof real-readonly",
    /Native pinned Codex initialized and config-read only\. Recording remains disabled\./,
    16000);
  await cmd(":chat-intent off",/Prospective chat request cleared/);
  await cmd(":codex-child-proof real-readonly",/CODEX_CHILD_PROOF_DENIED/);
  await cmd(":use film",/Selected workspace: film/);
  await cmd(":codex-child-proof real-readonly",/CODEX_CHILD_PROOF_DENIED/);
  // Do not print source bytes, host token, pairing code or terminal lines.
  console.log(
    "PASS: actual interactive native launcher -> pinned real Codex app-server read-only handshake under no-network Docker, revoked across stop and workspace switch");
  console.log("BLOCKED: user recording consent, prompts, messages, history, archive and Memory");
}finally{
  if(terminal){
    try{process.kill(-terminal.pid,"SIGTERM")}catch{}
    try{terminal.stdin.end()}catch{}
  }
  if(gateway)await gateway.close();
  await rm(root,{force:true,recursive:true,maxRetries:3,retryDelay:100});
}
