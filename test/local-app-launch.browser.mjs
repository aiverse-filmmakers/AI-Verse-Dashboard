/**
 * Chromium end-to-end proof: opt-in real Dashboard host serves a first-party
 * pairing page and only mounts authenticated Personal chat after cookie proof.
 * The runtime is deliberately unconfigured for this browser fixture; the
 * separate real-Gateway CI proves actual model execution.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,readFileSync,rmSync,writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";
import {SystemRegistry} from "../dist/packages/registry/src/index.js";
import {DisposableCache} from "../dist/packages/os-read-adapter/src/index.js";
import {QueryRouter,SubscriptionHub,startGateway} from "../dist/apps/gateway/src/index.js";
import {LocalApplicationSession} from "../dist/apps/gateway/src/local-app-session.js";

const ROOT=resolve(fileURLToPath(new URL("..",import.meta.url)));
const load=rel=>readFileSync(join(ROOT,rel),"utf8");
const root=mkdtempSync(join(tmpdir(),"aiverse-browser-local-"));
writeFileSync(join(root,"AI-VERSE.yaml"),'schema_version: "2.0"\narchitecture: unified-workspace\n');
writeFileSync(join(root,"AGENTS.md"),"# operator\n");
for(const name of ["operator","system","workspaces"])mkdirSync(join(root,name));
const reg=new SystemRegistry(),systemId=reg.register(root).systemId;
const assets={
 html:load("apps/web/local-app/index.html"),
 boot:load("apps/web/local-app/boot.js"),
 css:load("apps/web/local-app/shell.css")+"\n"+load("apps/web/src/personal-chat.css"),
 chat:load("dist/apps/web/personal-chat.bundle.js"),
};
const session=new LocalApplicationSession({systemId,workspaceId:"operator"},assets);
const host=await startGateway(new QueryRouter(reg,new DisposableCache()),
 new SubscriptionHub(),{port:0,localApp:session});
const base="http://127.0.0.1:"+host.port;
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
test.after(async()=>{
 await browser.close();
 await host.close();
 rmSync(root,{recursive:true,force:true});
});
test("locally packaged first-party app pairs, mounts real chat, and revokes session",async t=>{
 const context=await browser.newContext({viewport:{width:1480,height:960}});
 t.after(()=>context.close());
 const page=await context.newPage();
 const errors=[];
 page.on("pageerror",e=>errors.push(e.message));
 const direct=await fetch(base+"/local-app/",{signal:AbortSignal.timeout(5000)});
 assert.equal(direct.status,200,"packaged local page must answer unauthenticated GET");
 assert.match(await direct.text(),/id="pair-form"/);
 const response=await page.goto(base+"/local-app/",{waitUntil:"domcontentloaded",timeout:10000});
 await page.locator("#pair-form").waitFor({state:"visible",timeout:10000});
 assert.equal(response.status(),200);
 assert.match(response.headers()["content-security-policy"],/frame-ancestors 'none'/);
 assert.equal(await page.locator(".live-chat-pane").count(),0);
 assert.equal(await page.locator("#pair-form").isVisible(),true);
 const denied=await page.evaluate(async()=>{
   const res=await fetch("/local-app/chat.js",{credentials:"same-origin"});
   return res.status;
 });
 assert.equal(denied,401);
 assert.equal(await page.evaluate(()=>localStorage.length),0);
 assert.equal(await page.evaluate(()=>sessionStorage.length),0);
 // Only the trusted Node test harness has the ephemeral code, not the HTML/JS.
 const privateCode=session.pairingCode();
 assert.equal((await page.content()).includes(privateCode),false);
 await page.locator("#pair-code").fill(privateCode);
 await page.getByRole("button",{name:"Connect this browser"}).click();
 await page.locator(".live-chat-pane").first().waitFor();
 assert.equal(await page.locator("#pair-form").isVisible(),false);
 assert.equal(await page.locator("#local-scope").innerText(),"operator");
 assert.equal(await page.getByRole("button",{name:"Split chat"}).count(),2);
 await page.locator(".live-chat-toolbar .live-chat-split").click();
 assert.equal(await page.locator(".live-chat-pane").count(),2);
 const cookie=await context.cookies(base);
 assert.equal(cookie.some(c=>c.name==="aiverse_local_session"&&c.httpOnly&&c.sameSite==="Strict"),true);
 assert.equal(await page.evaluate(()=>localStorage.length),0);
 assert.equal(await page.evaluate(()=>sessionStorage.length),0);
 assert.equal((await page.content()).includes(privateCode),false);
 assert.equal((await page.content()).includes(host.authToken),false);
 const body=await page.evaluate(()=>document.querySelector(".live-chat-pane").textContent);
 assert.match(body,/Recover run/);
 // The chat UI must NOT invent a successful AI reply when the host has no
 // canonical bridge. It displays the real denial.
 const input=page.locator(".live-chat-pane").first().locator("textarea");
 await input.fill("Test canonical dispatch");
 await page.locator(".live-chat-pane").first().getByRole("button",{name:"Send",exact:true}).click();
 await page.locator(".live-chat-pane").first().locator(".live-chat-status")
   .getByText(/GATEWAY_NOT_CONFIGURED/).waitFor();
 assert.doesNotMatch(await page.locator(".live-chat-message.assistant").first().innerText(),/sample answer/i);
 await page.getByRole("button",{name:"Disconnect"}).click();
 await page.locator("#pair-form").waitFor({state:"visible"});
 assert.equal(await page.locator(".live-chat-pane").count(),0);
 const after=await page.evaluate(async()=>{
   const res=await fetch("/local-app/chat.js",{credentials:"same-origin"});
   return res.status;
 });
 assert.equal(after,401);
 assert.deepEqual(errors,[]);
});
