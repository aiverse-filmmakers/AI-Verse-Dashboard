import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = new URL("../apps/web/preview/", import.meta.url);
const read = p => readFileSync(new URL(p,root),"utf8");
const html = read("index.html");
const css = read("style.css");
const core = read("app.js");
const addon = read("personal-shell.js");
const shared = read("shared-chat.js");

test("all three preview modules parse and initialize in dependency order", () => {
  assert.doesNotThrow(() => new Function(core));
  assert.doesNotThrow(() => new Function(shared));
  assert.doesNotThrow(() => new Function(addon));
  assert.match(html, /src="app\.js"/);
  assert.match(html, /src="shared-chat\.js"/);
  assert.match(html, /src="personal-shell\.js"/);
  assert.ok(html.indexOf('src="app.js"')<html.indexOf('src="shared-chat.js"'));
  assert.ok(html.indexOf('src="shared-chat.js"')<html.indexOf('src="personal-shell.js"'));
});

test("quiet default with same main chat, canvas, and no visible extra panels", () => {
  assert.match(html,/class="chat-panel"/);
  assert.match(html,/id="viewport"/);
  assert.match(addon,/panes: 0, chats: \{\}, app: "canvas"/);
  assert.match(addon,/popover\.hidden = true/);
  assert.match(css,/\.secondary-chat-host\{display:none/);
  assert.match(css,/\.shared-chat-picker\[hidden\]/);
});

test("multiple teams are not flattened into a permanent agent sidebar",()=>{
  assert.match(addon,/name: "Personal team"/);
  assert.match(addon,/name: "Film studio"/);
  assert.match(addon,/name: "Content lab"/);
  assert.match(addon,/"Create another AI team"/);
  assert.match(addon,/"Add teammate"/);
  assert.match(addon,/profile\.append\(button\("team-chat-button"/);
  assert.match(addon,/startTargetChat\("agent:"/);
  assert.match(addon,/No real agents are running/);
});

test("team and individual labels retain their provenance",()=>{
  assert.match(addon,/display:team\.name\+" \/ "\+agent\.name/);
  assert.match(shared,/display:team\.name\+" \/ "\+agent\.name/);
  assert.match(shared,/display:team\.name\+" \(team\)"/);
  assert.match(addon,/recipient\?recipient\.display/);
});

test("all chat panes use the same standard visual structure and composer",()=>{
  assert.match(addon,/make\("section","chat-panel secondary-chat-pane unified-chat-pane"\)/);
  assert.match(addon,/make\("div","chat-heading"\)/);
  assert.match(addon,/make\("div","conversation"\)/);
  assert.match(addon,/make\("div","chat-bottom"\)/);
  assert.match(addon,/make\("div","composer-bottom"\)/);
  assert.match(addon,/window\.AIVerseChatUI\.mount/g);
  assert.equal((addon.match(/window\.AIVerseChatUI\.mount/g)||[]).length,2);
  assert.match(css,/\.unified-chat-pane/);
  assert.match(css,/\.unified-chat-pane \.chat-welcome/);
  assert.match(css,/\.chat-message-context/);
});

test("each composer can choose several recipients, organized team first",()=>{
  assert.match(shared,/const state=\{recipients:\[\],files:\[\],canvas:initialCanvas\.filter/);
  assert.match(shared,/state\.recipients\.push\(key\)/);
  assert.match(shared,/state\.recipients\.includes\(key\)/);
  assert.match(shared,/state\.recipients\.length >= 12/);
  assert.match(shared,/function drawMenu\(search=""/);
  assert.match(shared,/"Choose a team"/);
  assert.match(shared,/state\.stage=team\.id;drawMenu\(\)/);
  assert.match(shared,/"Entire team"/);
  assert.match(shared,/for\(const member of t\.members\)/);
  assert.match(shared,/control\("‹ Teams"/);
  assert.match(shared,/chip-remove/);
  assert.match(shared,/function closeMenu\(\)/);
});

test("each composer has model preference, file labels, and canvas references",()=>{
  assert.match(shared,/shared-model-choice/);
  assert.match(shared,/\["Auto","GPT \(demo\)","Claude \(demo\)","Gemini \(demo\)","Local \(demo\)"\]/);
  assert.match(shared,/fileInput\.multiple=true/);
  assert.match(shared,/Files are shown as preview labels only/);
  assert.doesNotMatch(shared,/Attach from canvas/);
  assert.match(shared,/setCanvasSelection:\(workspaceId,nodes\)=>/);
  assert.match(shared,/clearCanvasFromOtherWorkspaces:workspaceId=>/);
  assert.match(addon,/window\.AIVerseCanvasSelectionChanged=/);
  assert.match(css,/\.shared-chat-tools/);
  assert.match(css,/\.shared-model-choice/);
});

test("standalone default message flow and explicit enhanced message flow coexist",()=>{
  assert.match(addon,/if\(!enhanced\)return false/);
  assert.match(addon,/window\.AIVerseDemoPost\(message,meta\)/);
  assert.match(core,/window\.AIVerseDemoPost=/);
  assert.match(core,/renderMessageContext\(m\)/);
  assert.match(addon,/meta\.recipients\.length\|\|meta\.files\.length\|\|meta\.canvas\.length/);
  assert.match(shared,/form\.addEventListener\("submit",event=>/);
  assert.match(shared,/onSubmit\(\{message,meta,event\}\)/);
});

test("chat scopes and recipients survive changing pane layout and removal",()=>{
  assert.match(addon,/data\.paneRecipients/);
  assert.match(addon,/data\.mainRecipients/);
  assert.match(addon,/data\.threads/);
  assert.match(addon,/data\.paneModels/);
  assert.match(addon,/if\(i<data\.panes\)/);
  assert.match(addon,/secondaryControllers\.push\(ui\)/);
  assert.match(addon,/controller\.destroy\(\)/);
  assert.match(addon,/data\.mainRecipients=data\.mainRecipients\.filter/);
});

test("honest static preview has no agent dispatch or credential connection",()=>{
  assert.doesNotMatch(shared,/\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|\bnavigator\.sendBeacon\b/);
  assert.doesNotMatch(addon,/\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|\bnavigator\.sendBeacon\b/);
  assert.match(core,/not sent to a live AI/);
  assert.match(shared,/Nothing is sent to an AI/);
  assert.match(addon,/Nothing is sent to a real AI/);
  assert.match(shared,/Team messages are not dispatched/);
});



test("last active chat receives automatic scoped canvas references",()=>{
  assert.match(addon,/lastActiveChat/);
  assert.match(addon,/window\.AIVerseCanvasSelectionChanged=/);
  assert.match(addon,/chat\.setCanvasSelection\(liveCanvasSelection\.workspaceId,liveCanvasSelection\.nodes\)/);
  assert.match(core,/function canvasSelectionChanged\(\)/);
  assert.match(core,/canvasSelectionChanged\(\)/);
  assert.match(core,/window\.AIVerseCanvasScopeChanged\?\.\(id\)/);
  assert.match(shared,/setCanvasSelection:\(workspaceId,nodes\)=>/);
  assert.match(shared,/JSON\.stringify\(next\)!==JSON\.stringify\(state\.canvas\)/);
  assert.doesNotMatch(shared,/toggleCanvas\(\)/);
});

test("the first and every other chat can close independently",()=>{
  assert.match(addon,/const closeMain=button/);
  assert.match(addon,/data\.mainVisible=false/);
  assert.match(addon,/data\.mainVisible = data\.mainVisible !== false/);
  assert.match(addon,/lastActiveChat=data\.panes\?String\(data\.panes\):null/);
  assert.match(addon,/const topNewChat=button/);
  assert.match(addon,/if\(!data\.mainVisible\)\{data\.mainVisible=true/);
  assert.match(addon,/document\.body\.classList\.toggle\("primary-chat-closed",!data\.mainVisible\)/);
  assert.match(css,/\.primary-chat-closed\.with-parallel-chats \.app-shell/);
});

test("canvas research direct manipulation has inline edits and contextual actions",()=>{
  assert.match(core,/function beginInlineEdit\(/);
  assert.match(core,/field\.contentEditable='plaintext-only'/);
  assert.match(core,/if\(e\.key==='Escape'\)/);
  assert.match(core,/data-action="duplicate"/);
  assert.match(core,/data-action="connect"/);
  assert.match(core,/data-action="delete"/);
  assert.match(core,/function duplicateSelection\(\)/);
  assert.match(core,/function groupSelection\(\)/);
  assert.match(core,/function alignSelection\(\)/);
  assert.match(core,/function deleteSelection\(\)/);
  assert.match(core,/function redo\(\)/);
  assert.match(core,/function undo\(\)/);
  assert.match(css,/\.node-quick-actions/);
});

test("selection rectangle, drag-to-connect and connection editing remain possible",()=>{
  assert.match(core,/type:'select'/);
  assert.match(core,/selection-rectangle/);
  assert.match(core,/e\.shiftKey/);
  assert.match(core,/event\.shiftKey\|\|event\.metaKey\|\|event\.ctrlKey/);
  assert.match(core,/type:'connect'/);
  assert.match(core,/elementFromPoint\(e\.clientX,e\.clientY\)/);
  assert.match(core,/function showEdgeActions\(\)/);
  assert.match(core,/workspace\(\)\.edges\.splice\(selectedEdge,1\)/);
  assert.match(css,/\.connections \.edge-hit/);
});

test("creation composer defaults to optional model choice and preserves editable planning cards",()=>{
  assert.match(core,/function createCanvasDraft\(\)/);
  assert.match(core,/id="creation-kind"/);
  assert.match(core,/id="creation-prompt"/);
  assert.match(core,/Choose for me \(default\)/);
  assert.match(core,/Landscape · 16:9/);
  assert.match(core,/Portrait · 9:16/);
  assert.match(core,/Square · 1:1/);
  assert.match(core,/Cost: unavailable/);
  assert.match(core,/status:'demo-draft'/);
  assert.match(core,/generation:\{kind,model,aspect,prompt,provider:null/);
  assert.match(core,/w\.edges\.push\(\[promptCard\.id,output\.id\]\)/);
  assert.match(core,/No credits will be spent/);
});

test("no live generation or upload has been added to the public preview",()=>{
  assert.doesNotMatch(core,/\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|\bnavigator\.sendBeacon\b/);
  assert.doesNotMatch(shared,/\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|\bnavigator\.sendBeacon\b/);
  assert.match(core,/No AI generation was run/);
  assert.match(shared,/Nothing is sent to an AI/);
});


test("click selects a note and first drag on title or body moves the card, not text",()=>{
  assert.match(core,/el\.onpointerdown=e=>startNodeDrag\(e,id\)/);
  assert.match(core,/const wasSelected=selectedIds\.has\(id\)/);
  assert.match(core,/e\.preventDefault\(\)/);
  assert.match(core,/e\.currentTarget\.focus\(\{preventScroll:true\}\)/);
  assert.doesNotMatch(core,/e\.target\.closest\('a,button,h3,p/);
  assert.match(core,/if\(!wasSelected\)setSelection\(\[id\]\)/);
  assert.match(core,/el\.dataset\.editEligible==='true'/);
  assert.match(css,/\.canvas-node\s*,\s*\.canvas-node \.node-content h3/);
  assert.match(css,/user-select:none/);
  assert.match(css,/\.canvas-node \.inline-editing/);
});

test("selected canvas context is live, clears on deselection and retargets between chats",()=>{
  assert.match(core,/window\.AIVerseCanvasSelectionChanged\?\.\(\{workspaceId:w\.id,nodes\}\)/);
  assert.doesNotMatch(core,/if\(nodes\.length\)window\.AIVerseCanvasSelectionChanged/);
  assert.match(core,/if\(!e\.shiftKey\)setSelection\(\[\]\)/);
  assert.match(addon,/for\(const chat of controllers\)/);
  assert.match(addon,/chat\.clearCanvasSelection\(\)/);
  assert.match(addon,/window\.AIVerseCanvasRetarget=dispatchCanvasSelection/);
  assert.match(shared,/setCanvasSelection:\(workspaceId,nodes\)=>/);
  assert.match(shared,/state\.canvas=next;renderChips\(\)/);
  assert.match(shared,/clearCanvasSelection:\(\)=>/);
  assert.doesNotMatch(shared,/input\.value="";state\.files=\[\];state\.canvas=\[\]/);
});

test("empty canvas drag creates a selection rectangle; trackpad wheel pans",()=>{
  assert.match(core,/if\(e\.button===1\|\|spacePanHeld\|\|e\.pointerType===\x27touch\x27\)/);
  assert.match(core,/type:'select'/);
  assert.match(core,/type:'pan'/);
  assert.match(core,/const previous=e\.shiftKey\?\[\.\.\.selectedIds\]:\[\]/);
  assert.match(core,/if\(movement\.moved\)setSelection\(\[\.\.\.movement\.previous,\.\.\.hits\]\)/);
  assert.match(core,/workspace\(\)\.view\.x-=e\.deltaX/);
  assert.match(core,/workspace\(\)\.view\.y-=e\.deltaY/);
  assert.match(css,/\.canvas-viewport\{cursor:crosshair\}/);
});

test("connection preview is visible; single-click selects and double-click breaks",()=>{
  assert.match(core,/function connectPreview\(e\)/);
  assert.match(core,/path\.classList\.add\('edge-preview'\)/);
  assert.match(core,/connectPreview\(e\)/);
  assert.match(core,/path\.onclick=select/);
  assert.match(core,/path\.ondblclick=e=>/);
  assert.match(core,/closest\(\x27\.canvas-node,button,\.inspector,\.canvas-toolbar,\.selection-actions,\.edge-actions,\[data-edge\]\x27\)/);
  assert.match(core,/function removeSelectedEdge\(\)/);
  assert.match(core,/remove\.onclick=removeSelectedEdge/);
  assert.match(css,/\.edge-hit\{stroke:transparent;stroke-width:19/);
  assert.match(css,/\.edge-preview\{stroke:var\(--accent\)/);
  assert.match(css,/\.canvas-viewport \.connections\{width:100%;height:100%/);
});

test("Delete and Backspace remove selected cards, not editable text",()=>{
  assert.match(core,/e\.key==='Delete'\|\|e\.key==='Backspace'/);
  assert.match(core,/if\(selectedIds\.size\)\{e\.preventDefault\(\);deleteSelection\(\)/);
  assert.match(core,/else if\(Number\.isInteger\(selectedEdge\)\)/);
  assert.match(core,/e\.target\.closest\('input,textarea,\[contenteditable="true"\]/);
  assert.match(core,/if\(\$\('#dialog'\)\.open\|\|editing\)return/);
});

test("new note body remains visible and editable while empty",()=>{
  assert.match(core,/function addNote\(pos=newPosition\(\),title='New thought',body=''\)/);
  assert.match(core,/node-content"><h3/);
  assert.match(core,/n\.type==='link'\?.*'<p>'\+esc\(n\.body\)\+'<\/p>'/);
  assert.match(css,/\.canvas-node\.note \.node-content p:empty\{display:block;min-height:/);
  assert.match(css,/Click to add a note/);
  assert.match(core,/beginInlineEdit\(field,id,field\.tagName==='H3'\?'title':'body'\)/);
});


test("selected link removal does not cascade into selected-card deletion",()=>{
  assert.match(core,/path\.onkeydown=e=>/);
  assert.match(core,/e\.preventDefault\(\);e\.stopPropagation\(\);selectedEdge=Number\(path\.dataset\.edge\);removeSelectedEdge\(\)/);
  assert.match(core,/path\.ondblclick=e=>/);
  assert.match(core,/remove\.textContent='× Remove link'/);
  assert.match(core,/path\.classList\.toggle\('is-selected'/);
  assert.match(css,/edge-hit\.is-selected \+ \.edge-visual/);
});
