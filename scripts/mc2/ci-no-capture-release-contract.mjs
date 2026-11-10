/**
 * Phase 3A.43: read-only release-boundary regression.
 * Validates the actual source used by the Node/browser Dashboard build;
 * native Swift/ObjC fixtures must never turn into browser RPC consent.
 *
 * Runs on Windows, macOS and Linux. No network, secret, user content,
 * archive, filesystem mutation or local-Gateway process.
 */
import {readFileSync,readdirSync} from "node:fs";
import {join,relative,resolve} from "node:path";
import {fileURLToPath} from "node:url";

const root=resolve(fileURLToPath(new URL("../..",import.meta.url)));
const DENY="PERSISTENT_CHATS_RELEASE_BOUNDARY_REFUSED";
const fail=()=>{throw Error(DENY)};
const read=(path)=>readFileSync(join(root,path),"utf8");
function section(source,start,end){
  const from=source.indexOf(start);
  if(from<0)fail();
  const until=source.indexOf(end,from+start.length);
  if(until<0)fail();
  return source.slice(from+start.length,until);
}
function guard({session,proto,service,launcher,tsconfig,manifest,appImports}){
  if(typeof session!=="string"||typeof proto!=="string"
    ||typeof service!=="string"||typeof launcher!=="string"
    ||!tsconfig||!manifest||!Array.isArray(appImports))fail();
  const consent=section(session,
    "export interface ProspectiveRecordingIntentStatus{","\n}");
  for(const key of ["captureAuthorized","hostOriginAttested",
      "userRecordingConsentVerified","historyImportAuthorized"]){
    if(!new RegExp("\\b"+key+"\\s*:\\s*false\\s*;").test(consent)
        ||new RegExp("\\b"+key+"\\s*:\\s*true").test(consent))fail();
  }
  const methods=section(session,"const PAIRED_BROWSER_METHODS=new Set([","]);");
  if(/capture|record|consent|archive|memory|history\.import/i.test(methods))fail();
  if(!launcher.includes("Recording remains disabled."))fail();
  if(!service.includes('reply(@"CAPTURE_DISABLED"'))fail();
  if(!service.includes("NSXPCListener serviceListener"))fail();
  const protocol=section(proto,"@protocol AIVerseActualXPCDenial","@end");
  const selectors=[...protocol.matchAll(/- \(void\)\s*([A-Za-z][A-Za-z0-9]*):?/g)].map(m=>m[1]);
  if(selectors.join(",")!=="probeDenied,delayedDenied,terminateWithoutReply"
    ||/consent|authorize|archive|record|capture|memory/i.test(protocol))fail();
  const nativeNames=/native-macos-|ci-macos-|xpc-peer-deny/;
  if(appImports.some(entry=>nativeNames.test(entry)))fail();
  if(!Array.isArray(tsconfig.include) || tsconfig.include.some(
    glob=>glob.includes("*.m")||glob.includes("*.swift")))fail();
  if(manifest.private!==true || manifest.type!=="module")fail();
  if(Object.values(manifest.scripts||{}).some(cmd=>
      /ci-macos-|native-macos-actual-xpc|native-macos-owner-auth-preview/.test(cmd)))fail();
  return true;
}
function sourceFiles(dir){
  const found=[];
  const walk=(path)=>{
    for(const ent of readdirSync(path,{withFileTypes:true})){
      const file=join(path,ent.name);
      if(ent.isDirectory())walk(file);
      else if(ent.isFile()&&/\.(ts|js|mjs)$/.test(ent.name))found.push(file);
    }
  };
  walk(join(root,dir));
  return found;
}
function appImports(){
  return [...sourceFiles("apps"),...sourceFiles("packages")].flatMap(file=>{
    const source=readFileSync(file,"utf8");
    return [...source.matchAll(/\b(?:import|require)\s*(?:\(|[^;\n]*?from\s*)?["']([^"']+)["']/g)]
      .map(m=>relative(root,file)+":"+m[1]);
  });
}
const actual={
  session:read("apps/gateway/src/local-app-session.ts"),
  proto:read("scripts/mc2/native-macos-actual-xpc-protocol.h"),
  service:read("scripts/mc2/native-macos-actual-xpc-service.m"),
  launcher:read("scripts/mc2/start-connected.ts"),
  tsconfig:JSON.parse(read("tsconfig.json")),
  manifest:JSON.parse(read("package.json")),
  appImports:appImports(),
};
if(!guard(actual))fail();
const refused=(mutate)=>{
  const copy={...actual};mutate(copy);
  try{guard(copy)}catch(e){if(e?.message===DENY)return;throw e}
  fail();
};
refused(x=>{x.session=x.session.replace("captureAuthorized:false;","captureAuthorized:true;")});
refused(x=>{x.session=x.session.replace('"workspace.get",',
  '"workspace.get", "aiverse.chat.capture",')});
refused(x=>{x.proto=x.proto.replace("@end",
  "- (void)authorizeConversationRecording:(NSString *)claim;\n@end")});
refused(x=>{x.appImports=[...x.appImports,"apps/gateway/src/forged.ts:native-macos-actual-xpc-owner"]});
refused(x=>{x.manifest={...x.manifest,scripts:{build:"bash ci-macos-actual-xpc-lifecycle.sh"}}});
console.log("PASS: 3A.43 current Dashboard release/browser/XPC boundary rejects capture, native fixture packaging, and synthetic activation");
