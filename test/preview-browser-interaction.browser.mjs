/**
 * End-to-end browser interaction regression suite for the real static Dashboard preview.
 * Runs in isolated Chromium context, against the actual app.js + shared-chat.js + personal-shell.js.
 * No mocking of handlers, no canonical OS writes, no paid AI calls.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { chromium } from "playwright";

const ROOT=path.resolve(fileURLToPath(new URL("../apps/web/preview/",import.meta.url)));
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".jpg":"image/jpeg"};
const server=createServer(async(req,res)=>{
  let pathname;
  try{pathname=decodeURIComponent(new URL(req.url,"http://127.0.0.1").pathname)}catch{res.writeHead(400).end();return;}
  const relative=pathname==="/"?"/index.html":pathname;
  const full=path.resolve(ROOT,"."+relative);
  if(!full.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}
  try{const data=await readFile(full);res.writeHead(200,{"content-type":mime[path.extname(full)]||"application/octet-stream","cache-control":"no-store"}).end(data);}
  catch{res.writeHead(404).end("Not found");}
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const origin="http://127.0.0.1:"+server.address().port;
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
async function setup(t) {
  const context=await browser.newContext({viewport:{width:1680,height:1150},deviceScaleFactor:1});
  t.after(()=>context.close());
  const page=await context.newPage();
  const errors=[];
  page.on("pageerror",err=>errors.push(err.message));
  await page.goto(origin,{waitUntil:"load"});
  await page.locator(".canvas-node").first().waitFor();
  return {page,errors};
}
async function drag(page,start,end,steps=14){
  await page.mouse.move(start.x,start.y);
  await page.mouse.down();
  await page.mouse.move(end.x,end.y,{steps});
  await page.mouse.up();
}
async function pointOf(page,selector) {
  const b=await page.locator(selector).first().boundingBox();
  assert.ok(b,selector+" is visible");
  return {x:b.x+b.width/2,y:b.y+b.height/2};
}
async function state(page){
  return page.evaluate(()=>JSON.parse(localStorage.getItem("aiverse-design-preview-v1")));
}
async function newWorkspace(page){
  await page.locator("#create-workspace").click();
  await page.locator("#workspace-name").fill("Browser QC fixture");
  await page.locator("#dialog-actions button").click();
  await page.locator("#nodes .canvas-node").waitFor({state:"detached"}).catch(()=>{});
  assert.equal(await page.locator("#nodes .canvas-node").count(),0);
}
async function editText(page,cardSelector,fieldSelector,text){
  const field=page.locator(cardSelector+" "+fieldSelector).first();
  await field.click(); // first click selects
  await field.click(); // selected card -> edit
  await page.waitForFunction(([c,f])=>document.querySelector(c+" "+f)?.isContentEditable,[cardSelector,fieldSelector]);
  await page.keyboard.type(text);
  await page.keyboard.press("Enter");
  assert.ok((await field.textContent()).includes(text));
}

test("C1,C2,C8: empty note, deliberate editing, dragging from text, safe Backspace, delete and Undo",async t=>{
  const {page,errors}=await setup(t);
  await newWorkspace(page);
  await page.locator("#add-note").click();
  const note=page.locator(".canvas-node.note").first();
  assert.equal(await note.count(),1);
  assert.ok(await note.locator(".node-content p").isVisible(),"empty body must have a visible click area");
  await editText(page,'.canvas-node.note','.node-content h3',"Planning card");
  await editText(page,'.canvas-node.note','.node-content p',"Editable details");
  await page.reload();
  assert.match(await note.locator("h3").innerText(),/Planning card/);
  assert.match(await note.locator(".node-content p").innerText(),/Editable details/);
  const before=await note.boundingBox();
  const title=await pointOf(page,'.canvas-node.note h3');
  await drag(page,title,{x:title.x+85,y:title.y+50});
  const after=await note.boundingBox();
  assert.ok(after.x>before.x+50 && after.y>before.y+25,"dragging from title moves card");
  assert.equal(await page.evaluate(()=>String(window.getSelection())), "","drag should not select text");
  await note.locator(".node-content p").click();
  await note.locator(".node-content p").click();
  await page.waitForFunction(()=>document.querySelector(".canvas-node.note .node-content p")?.isContentEditable);
  const countBefore=await note.count();
  await page.keyboard.press("Backspace");
  assert.equal(await note.count(),countBefore,"Backspace while editing must not delete card");
  await page.keyboard.press("Escape");
  await note.click({position:{x:10,y:12}});
  await page.keyboard.press("Delete");
  assert.equal(await note.count(),0,"Delete with canvas card focus removes it");
  await page.keyboard.press("Control+z");
  assert.equal(await note.count(),1,"Undo returns deleted card");
  assert.equal(errors.length,0,errors.join("\n"));
});

test("C3,C4: marquee selects on release, live @ canvas chips mirror selection, two-finger wheel pans",async t=>{
  const {page,errors}=await setup(t);
  const nodes=page.locator(".canvas-node");
  const viewport=await page.locator("#viewport").boundingBox();
  const a=await page.locator('[data-node="welcome"]').boundingBox();
  const b=await page.locator('[data-node="next"]').boundingBox();
  assert.ok(a&&b&&viewport);
  const start={x:Math.max(viewport.x+8,Math.min(a.x,b.x)-20),y:Math.max(viewport.y+8,Math.min(a.y,b.y)-20)};
  const end={x:Math.max(a.x+a.width,b.x+b.width)+2,y:Math.max(a.y+a.height,b.y+b.height)+18};
  assert.ok(end.y<viewport.y+viewport.height-18,"fixture cards must fit inside canvas for marquee");
  await drag(page,start,end);
  const selected=page.locator("#nodes .canvas-node.selected");
  assert.equal(await selected.count(),2,"mouse release must select welcome and next without selecting the other card");
  const chips=page.locator("#chat-form .shared-context-chip");
  assert.equal(await chips.count(),2,"chat references match selected cards");
  await page.locator("#viewport").click({position:{x:8,y:8}});
  assert.equal(await selected.count(),0,"click empty canvas deselects");
  assert.equal(await chips.count(),0,"all pending refs disappear on deselection");
  await page.locator('[data-node="welcome"] .node-handle').click();
  assert.equal(await selected.count(),1);
  assert.equal(await chips.count(),1);
  await page.locator('[data-node="welcome"] .node-handle').click();
  assert.equal(await chips.count(),1,"reclick never duplicates context");
  const prev=await page.locator("#world").getAttribute("style");
  await page.mouse.move(viewport.x+viewport.width/2,viewport.y+viewport.height/2);
  await page.mouse.wheel(72,96); // synthetic trackpad-like wheel scroll
  const now=await page.locator("#world").getAttribute("style");
  assert.notEqual(now,prev,"wheel gesture pans canvas transform");
  assert.equal(errors.length,0,errors.join("\n"));
});

test("C4,C5: second chat gets current selection, closing active chat falls back and workspace switch clears",async t=>{
  const {page,errors}=await setup(t);
  await page.locator(".split-chat-action").click();
  assert.equal(await page.locator(".secondary-chat-pane").count(),1);
  await page.locator(".secondary-chat-pane textarea").focus();
  await page.locator('[data-node="welcome"] .node-handle').click();
  assert.equal(await page.locator(".secondary-chat-pane .shared-context-chip").count(),1);
  assert.equal(await page.locator("#chat-form .shared-context-chip").count(),0);
  await page.locator(".secondary-chat-pane .chat-heading-actions button").last().click(); // close active pane
  await page.locator('[data-node="next"] .node-handle').click();
  assert.equal(await page.locator(".secondary-chat-pane").count(),0);
  assert.equal(await page.locator("#chat-form .shared-context-chip").count(),1,"context retargets to remaining chat");
  await page.locator("#create-workspace").click();
  await page.locator("#workspace-name").fill("Another project");
  await page.locator("#dialog-actions button").click();
  assert.equal(await page.locator("#chat-form .shared-context-chip").count(),0,"workspace switch removes stale references");
  assert.equal(errors.length,0,errors.join("\n"));
});

test("C6,C7: live connector line, add/remove by direct manipulation, double-click break, undo and cancel",async t=>{
  const {page,errors}=await setup(t);
  const from=await pointOf(page,'[data-node="welcome"] .node-connector');
  const to=await pointOf(page,'[data-node="next"] .node-content');
  const count=await page.locator("#connections .edge-hit").count();
  await page.mouse.move(from.x,from.y);await page.mouse.down();
  await page.mouse.move(to.x,to.y,{steps:18});
  assert.equal(await page.locator("#connections .edge-preview").count(),1,"temporary connection line visible during drag");
  await page.mouse.up();
  assert.equal(await page.locator("#connections .edge-preview").count(),0,"preview disappears after release");
  assert.equal(await page.locator("#connections .edge-hit").count(),count+1,"new connection created");
  // Single click selects a connection and exposes removal action.
  const edge=page.locator("#connections .edge-hit").last();
  const at=await edge.evaluate(el=>{
    const p=el.getPointAtLength(el.getTotalLength()/2);
    const m=el.getScreenCTM();return {x:p.x*m.a+p.y*m.c+m.e,y:p.x*m.b+p.y*m.d+m.f};
  });
  await page.mouse.click(at.x,at.y);
  assert.equal(await page.locator("#edge-actions button").count(),2);
  await page.locator("#edge-actions button").first().click();
  assert.equal(await page.locator("#connections .edge-hit").count(),count);
  await page.locator("#viewport").focus();
  await page.keyboard.press("Control+z");
  assert.equal(await page.locator("#connections .edge-hit").count(),count+1,"Undo restores line");
  const edge2=page.locator("#connections .edge-hit").last();
  const at2=await edge2.evaluate(el=>{
    const p=el.getPointAtLength(el.getTotalLength()/2),m=el.getScreenCTM();
    return{x:p.x*m.a+p.y*m.c+m.e,y:p.x*m.b+p.y*m.d+m.f};
  });
  await page.mouse.dblclick(at2.x,at2.y,{delay:80});
  assert.equal(await page.locator("#connections .edge-hit").count(),count,"double-click breaks the link");
  assert.equal(errors.length,0,errors.join("\n"));
});

test("C1,C9,C10: repeating create/delete/undo and saving after reload retains user data",async t=>{
  const {page,errors}=await setup(t);
  await newWorkspace(page);
  for(let i=0;i<3;i++){
    await page.locator("#add-note").click();
    assert.equal(await page.locator(".canvas-node.note").count(),i+1);
    await page.locator(".canvas-node.note").last().locator(".node-handle").click();
    await page.keyboard.press("Delete");
    assert.equal(await page.locator(".canvas-node.note").count(),i);
    await page.keyboard.press("Control+z");
    assert.equal(await page.locator(".canvas-node.note").count(),i+1);
  }
  await page.reload();
  assert.equal(await page.locator(".canvas-node.note").count(),3,"reload retains repeated undo results");
  assert.equal(errors.length,0,errors.join("\n"));
});

test("C5: last conversation minimizes to rail, restores, other chat can replace original",async t=>{
  const {page,errors}=await setup(t);
  const main=page.locator(".app-shell > .chat-panel").first();
  await page.locator(".close-primary-chat").click();
  assert.ok(await page.locator(".chat-minimized-rail").isVisible(),"last conversation leaves visible minimized chat rail");
  assert.ok(!(await main.isVisible()),"main chat minimized");
  const restore=page.getByRole("button",{name:"Restore AI-Verse"});
  assert.ok(await restore.isVisible(),"restore chat action discoverable");
  await restore.click();
  assert.ok(await main.isVisible(),"restoring rail reopens same conversation");
  await page.locator(".split-chat-action").click();
  await page.locator(".secondary-chat-pane").first().locator("textarea").fill("A secondary draft");
  await page.locator(".close-primary-chat").click();
  assert.ok(!(await main.isVisible()),"primary may close when a second conversation exists");
  assert.ok(await page.locator(".secondary-chat-pane").first().isVisible(),"second pane remains");
  await page.locator(".secondary-chat-pane .chat-heading-actions button").last().click();
  assert.ok(await page.locator(".chat-minimized-rail").isVisible(),"closing the last secondary pane minimizes instead");
  await page.getByRole("button",{name:/Restore Chat/}).click();
  assert.ok(await page.locator(".secondary-chat-pane").first().isVisible(),"secondary conversation can restore without main");
  assert.equal(await page.locator(".secondary-chat-pane textarea").inputValue(),"A secondary draft");
  assert.equal(errors.length,0,errors.join("\n"));
});

test("C10: all conversation windows offer pointer/keyboard resizing with persistence",async t=>{
  const {page,errors}=await setup(t);
  const main=page.locator(".app-shell > .chat-panel").first();
  const initial=(await main.boundingBox()).width;
  const grip=main.locator(".chat-resize-grip");
  assert.equal(await grip.getAttribute("role"),"separator");
  await grip.focus();
  await page.keyboard.press("ArrowRight");
  assert.ok((await main.boundingBox()).width>initial+10,"keyboard resizes primary pane");
  let g=await grip.boundingBox();
  await drag(page,{x:g.x+g.width/2,y:g.y+g.height/2},{x:g.x+g.width/2+65,y:g.y+g.height/2});
  const resized=(await main.boundingBox()).width;
  assert.ok(resized>initial+50,"pointer divider grows chat pane");
  await page.locator(".split-chat-action").click();
  const secondary=page.locator(".secondary-chat-pane").first();
  assert.ok(await secondary.locator(".chat-resize-grip").count(),"secondary has its own handle");
  const secondaryFirst=(await secondary.boundingBox()).width;
  const rightGrip=secondary.locator(".chat-resize-grip");
  await rightGrip.focus();
  await page.keyboard.press("ArrowRight");
  assert.ok((await secondary.boundingBox()).width>secondaryFirst+10);
  await page.reload();
  assert.ok((await main.boundingBox()).width>=resized-2,"primary width persists across reload");
  assert.ok((await page.locator(".secondary-chat-pane").first().boundingBox()).width>secondaryFirst+10,"secondary width persists");
  assert.equal(errors.length,0,errors.join("\n"));
});

test("C3,C4: click-drag marquee selects multiple cards in real browser and deselection removes tags",async t=>{
  const {page,errors}=await setup(t);
  const viewport=await page.locator("#viewport").boundingBox();
  const boxes=await Promise.all(["welcome","inspiration"].map(id=>page.locator('[data-node="'+id+'"]').boundingBox()));
  const x=Math.max(viewport.x+6,Math.min(...boxes.map(b=>b.x))-12),y=Math.max(viewport.y+6,Math.min(...boxes.map(b=>b.y))-12);
  const to={x:Math.max(...boxes.map(b=>b.x+b.width))+18,y:Math.max(...boxes.map(b=>b.y+b.height))+18};
  assert.ok(to.x<viewport.x+viewport.width-6&&to.y<viewport.y+viewport.height-6,"fixture selection fits");
  await page.mouse.move(x,y);await page.mouse.down();
  await page.mouse.move(to.x,to.y,{steps:16});
  assert.ok(await page.locator("#selection-rectangle").isVisible(),"marquee visible during drag");
  await page.mouse.up();
  assert.equal(await page.locator(".canvas-node.selected").count(),3,"the marquee intersects and selects all three cards");
  assert.equal(await page.locator("#chat-form .shared-context-chip").count(),3,"tag count equals current selection");
  await page.locator("#viewport").click({position:{x:8,y:8}});
  assert.equal(await page.locator(".canvas-node.selected").count(),0);
  assert.equal(await page.locator("#chat-form .shared-context-chip").count(),0);
  assert.equal(errors.length,0,errors.join("\n"));
});

test("Every chat keeps full composer tools and Split after promoting second chat to sole pane",async t=>{
  const {page,errors}=await setup(t);
  const selector=".split-chat-action";
  await page.locator(".chat-heading-actions "+selector).first().click();
  assert.equal(await page.locator(".secondary-chat-pane").count(),1);
  await page.locator(".close-primary-chat").click();
  const only=page.locator(".secondary-chat-pane").first();
  assert.ok(await only.isVisible(),"secondary survives closing original");
  const parity=async pane=>{
    assert.equal(await pane.locator(".shared-tool-at").count(),1,"team @ picker");
    assert.equal(await pane.locator('input[type="file"]').count(),1,"file attachment input");
    assert.equal(await pane.locator(".shared-model-choice").count(),1,"model dropdown");
    assert.equal(await pane.locator(".shared-chat-tools .shared-tool").count(),2,"tag plus file controls");
    assert.equal(await pane.locator(".send-button").count(),1,"send");
    assert.equal(await pane.locator(".chat-heading-actions .split-chat-action").count(),1,"split");
    assert.equal(await pane.locator(".chat-heading-actions .new-chat-action").count(),1,"new chat/clear");
    assert.ok(await pane.locator(".shared-tool-at").isVisible());
  };
  await parity(only);
  await only.locator(".chat-heading-actions .split-chat-action").click();
  assert.equal(await page.locator(".secondary-chat-pane").count(),2,"split still works when the original was closed");
  for(const pane of await page.locator(".secondary-chat-pane").all()) await parity(pane);
  await page.locator(".secondary-chat-pane").last().locator(".chat-heading-actions button").last().click();
  assert.equal(await page.locator(".secondary-chat-pane").count(),1);
  await parity(page.locator(".secondary-chat-pane"));
  await page.locator(".secondary-chat-pane").locator(".chat-heading-actions button").last().click();
  assert.ok(await page.locator(".chat-minimized-rail").isVisible(),"last pane minimizes");
  await page.locator(".restore-chat-action").click();
  await parity(page.locator(".secondary-chat-pane"));
  assert.equal(errors.length,0,errors.join("\n"));
});


test("Every chat operates its @ multi-recipient picker, model, file, suggestions and send controls",async t=>{
  const {page,errors}=await setup(t);
  const main=page.locator(".app-shell > .chat-panel").first();
  assert.equal(await main.locator(".suggestions button").count(),2,"original offers quick prompts");
  async function tag(pane,teamIndex,agentIndex=null){
    await pane.locator(".shared-tool-at").click();
    const picker=pane.locator(".shared-chat-picker");
    assert.ok(await picker.isVisible(),"team list appears");
    await picker.locator(".shared-menu-row").nth(teamIndex).click();
    assert.ok(await picker.getByText("Entire team",{exact:true}).isVisible(),"team-first choice");
    await picker.locator(".shared-menu-row").nth(agentIndex===null?0:agentIndex+1).click();
  }
  await tag(main,1,null);
  await tag(main,1,0);
  assert.equal(await main.locator(".shared-chat-chip:not(.shared-context-chip)").count(),2,"can tag both team and individual");
  assert.match(await main.locator(".shared-chat-chips").innerText(),/Film studio \(team\)/);
  assert.match(await main.locator(".shared-chat-chips").innerText(),/Film studio \/ Director/);
  await main.locator(".shared-model-choice").selectOption("GPT (demo)");
  assert.equal(await main.locator(".shared-model-choice").inputValue(),"GPT (demo)");
  await main.locator('input[type="file"]').setInputFiles({name:"brief.txt",mimeType:"text/plain",buffer:Buffer.from("example text")});
  assert.match(await main.locator(".shared-chat-chips").innerText(),/brief.txt/);
  await main.locator(".chat-heading-actions .split-chat-action").click();
  const other=page.locator(".secondary-chat-pane").first();
  assert.equal(await other.locator(".suggestions button").count(),2,"new pane retains quick prompts");
  await tag(other,0,null);
  await tag(other,0,1);
  assert.equal(await other.locator(".shared-chat-chip:not(.shared-context-chip)").count(),2);
  assert.match(await other.locator(".shared-chat-chips").innerText(),/Personal team \/ Researcher/);
  await other.locator(".shared-model-choice").selectOption("Claude (demo)");
  await other.locator('input[type="file"]').setInputFiles({name:"still.png",mimeType:"image/png",buffer:Buffer.from("mock image")});
  assert.match(await other.locator(".shared-chat-chips").innerText(),/still.png/);
  await other.locator("textarea").fill("Plan two camera angles");
  await other.locator(".send-button").click();
  assert.match(await other.locator(".conversation").innerText(),/Plan two camera angles/);
  assert.match(await other.locator(".conversation").innerText(),/design preview/i);
  // Sending a secondary message does not erase original conversation recipients or model.
  assert.equal(await main.locator(".shared-chat-chip:not(.shared-context-chip)").count(),2);
  assert.equal(await main.locator(".shared-model-choice").inputValue(),"GPT (demo)");
  await page.locator(".close-primary-chat").click();
  assert.ok(await other.isVisible());
  assert.equal(await other.locator(".shared-model-choice").inputValue(),"Claude (demo)");
  await other.locator(".chat-heading-actions .new-chat-action").click();
  assert.equal(await other.locator(".chat-message.user").count(),0,"new conversation reset works in secondary");
  await other.locator(".chat-heading-actions .split-chat-action").click();
  assert.equal(await page.locator(".secondary-chat-pane").count(),2,"new conversations preserve split control");
  assert.equal(errors.length,0,errors.join("\n"));
});

test("Visual focus QC: primary and secondary composers have no blue boxes; canvas feedback stays quiet",async t=>{
  const {page,errors}=await setup(t);
  const composerAppearance=async field=>field.evaluate(el=>{
    const style=getComputedStyle(el);
    return {outline:style.outlineStyle,border:style.borderTopStyle,resize:style.resize,background:style.backgroundColor};
  });
  const primary=page.locator("#message");
  await primary.focus();
  const mainLook=await composerAppearance(primary);
  assert.equal(mainLook.outline,"none","main composer is not wrapped in a focus square");
  assert.equal(mainLook.border,"none","main composer has no native textarea border");
  assert.equal(mainLook.resize,"none","main composer has no native resize triangle");

  await page.locator(".chat-heading-actions .split-chat-action").first().click();
  const other=page.locator(".secondary-chat-pane textarea").first();
  await other.focus();
  const secondLook=await composerAppearance(other);
  assert.deepEqual(secondLook,mainLook,"secondary chat shares the same unobtrusive textarea styling");

  await page.locator("#viewport").focus();
  const viewportOutline=await page.locator("#viewport").evaluate(el=>getComputedStyle(el).outlineStyle);
  assert.equal(viewportOutline,"none","focused canvas has no blue browser-style frame");
  await page.locator('[data-node="welcome"] .node-handle').click();
  const selected=page.locator('[data-node="welcome"]');
  assert.ok(await selected.evaluate(el=>el.classList.contains("selected")),"canvas selection still works");
  const nodeColor=await selected.evaluate(el=>getComputedStyle(el).outlineColor);
  const accent=await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue("--accent").trim());
  assert.equal(nodeColor.toLowerCase(),"rgb(189, 84, 41)","selected note uses the existing restrained accent, not blue");
  assert.equal(accent,"#bd5429");

  const v=await page.locator("#viewport").boundingBox();
  await page.mouse.move(v.x+8,v.y+8);
  await page.mouse.down();
  await page.mouse.move(v.x+95,v.y+82,{steps:10});
  const selection=page.locator("#selection-rectangle");
  assert.ok(await selection.isVisible(),"drag multiselect still gives temporary feedback");
  const marqueeBorder=await selection.evaluate(el=>getComputedStyle(el).borderTopColor);
  assert.notEqual(marqueeBorder,"rgb(103, 151, 223)","selection rectangle is not blue");
  await page.mouse.up();
  assert.ok(!(await selection.isVisible()),"temporary selection feedback clears on release");
  assert.equal(errors.length,0,errors.join("\\n"));
});


test("Functional workspace pages: navigate actual domain layouts and operate sample records",async t=>{
 const {page,errors}=await setup(t);
 await page.locator(".quiet-feature-toggle").click();
 assert.ok(await page.locator(".os-real-shell").isVisible(),"new real-world app shell replaces PowerPoint-like tour");
 assert.equal(await page.locator(".os-nav-item").count(),13,"all 13 owner-backed workspaces are discoverable");
 assert.match(await page.locator(".os-source").innerText(),/Illustrative/);
 // Attention: a real approval queue layout with mutable sample decisions.
 assert.equal(await page.locator(".os-queue").count(),4);
 await page.getByRole("button",{name:"Approve",exact:true}).click();
 assert.match(await page.locator(".os-toast").innerText(),/Example request approved/);
 assert.equal(await page.locator(".os-stat strong").first().innerText(),"2");
 // Activity: real progress and timeline inspector, with sample run state control.
 await page.getByRole("button",{name:"Open Activity page"}).click();
 assert.equal(await page.locator(".os-run").count(),4);
 assert.match(await page.locator(".os-log").innerText(),/Scope checked/);
 await page.getByRole("button",{name:"Pause example run"}).click();
 assert.match(await page.locator(".os-toast").innerText(),/paused/);
 // Teams: real roster, task counts, searchable roles.
 await page.getByRole("button",{name:"Open AI team page"}).click();
 assert.equal(await page.locator(".os-agent").count(),5);
 await page.getByRole("searchbox",{name:"Search agents"}).fill("Editor");
 assert.equal(await page.locator(".os-agent").count(),1);
 // Goals: checklist changes status without touching backend.
 await page.getByRole("button",{name:"Open Goals page"}).click();
 assert.equal(await page.locator(".os-goal").count(),3);
 await page.locator(".os-check input").first().uncheck();
 assert.match(await page.locator(".os-toast").innerText(),/Example milestone/);
 // Calendar: actual seven-day grid, change enabled schedule.
 await page.getByRole("button",{name:"Open Scheduled work page"}).click();
 assert.equal(await page.locator(".os-day").count(),7);
 await page.locator(".os-table .os-small-btn").first().click();
 assert.match(await page.locator(".os-toast").innerText(),/Example data updated/);
 // Skills: a package list and real proposal decision controls.
 await page.getByRole("button",{name:"Open Skills page"}).click();
 assert.equal(await page.locator(".os-skill-item").count(),5);
 await page.getByRole("button",{name:"Learning proposals"}).click();
 assert.equal(await page.locator(".os-card").count(),2);
 await page.getByRole("button",{name:"Approve example"}).first().click();
 assert.match(await page.locator(".os-card").first().innerText(),/Accepted/);
 // Knowledge: source-oriented search, not fake universal cards.
 await page.getByRole("button",{name:"Open Knowledge page"}).click();
 await page.getByRole("searchbox",{name:"Search memory"}).fill("captions");
 assert.equal(await page.locator(".os-memory-item").count(),1);
 assert.match(await page.locator(".os-card").innerText(),/Evidence source/);
 // Editable Data grid: working status change and record creation.
 await page.getByRole("button",{name:"Open Project data page"}).click();
 assert.equal(await page.locator(".os-table tbody tr").count(),6);
 await page.locator(".os-table select").first().selectOption("Review");
 assert.match(await page.locator(".os-toast").innerText(),/Example data updated/);
 await page.getByRole("button",{name:"+ Add shot"}).click();
 await page.locator(".os-dialog input").first().fill("04A");
 await page.locator(".os-dialog input").nth(1).fill("Follow camera through room");
 await page.locator(".os-dialog select").selectOption("FPV");
 await page.getByRole("button",{name:"Save in preview"}).click();
 assert.equal(await page.locator(".os-table tbody tr").count(),7);
 // Outputs: actual file-browser shape, filter, selected details.
 await page.getByRole("button",{name:"Open Outputs page"}).click();
 assert.equal(await page.locator(".os-file-card").count(),5);
 await page.getByRole("button",{name:"Documents",exact:true}).click();
 assert.equal(await page.locator(".os-file-card").count(),2);
 // Cost: a chart and attribution table, with period control.
 await page.getByRole("button",{name:"Open Usage & cost page"}).click();
 assert.equal(await page.locator(".os-bar-col").count(),7);
 await page.getByRole("button",{name:"30 days"}).click();
 assert.equal(await page.locator(".os-bar-col").count(),4);
 // Health and connections have actual inspectors and permission detail.
 await page.getByRole("button",{name:"Open System health page"}).click();
 assert.equal(await page.locator(".os-health-row").count(),7);
 await page.getByRole("button",{name:"Open Connections page"}).click();
 assert.equal(await page.locator(".os-connection-row").count(),4);
 assert.match(await page.locator(".os-card").last().innerText(),/Permission/);
 assert.equal(errors.length,0,errors.join("\n"));
});
test("Functional pages preserve chat, canvas, visibility on reload and narrow layout",async t=>{
 const {page,errors}=await setup(t);
 const before=await page.locator(".canvas-node").count();
 await page.locator("#message").fill("Draft left untouched");
 await page.locator(".quiet-feature-toggle").click();
 assert.ok(await page.locator(".os-real-shell").isVisible());
 await page.getByRole("button",{name:"Open Conversations page"}).click();
 assert.match(await page.locator(".os-transcript").innerText(),/EXAMPLE/);
 await page.reload();
 assert.ok(await page.locator(".os-real-shell").isVisible(),"feature view persists via existing app selection");
 assert.equal(await page.locator("#message").inputValue(),"Draft left untouched");
 await page.locator(".app-picker-toggle").click();
 await page.getByRole("button",{name:"Open Canvas",exact:true}).click();
 assert.equal(await page.locator(".canvas-node").count(),before,"canvas unaffected");
 await page.locator(".app-picker-toggle").click();
 await page.getByRole("button",{name:"Open Activity",exact:true}).click();
 assert.match(await page.locator(".app-empty-card").innerText(),/Nothing running here yet/);
 await page.getByRole("button",{name:"Explore planned OS features"}).click();
 await page.setViewportSize({width:760,height:950});
 assert.ok(await page.locator(".os-real-shell").isVisible());
 const widths=await page.evaluate(()=>({actual:document.documentElement.scrollWidth,window:innerWidth}));
 assert.ok(widths.actual<=widths.window+1,"no horizontal document overflow");
 assert.equal(errors.length,0,errors.join("\n"));
});

test.after(async()=>{await browser.close();await new Promise(resolve=>server.close(resolve));});
