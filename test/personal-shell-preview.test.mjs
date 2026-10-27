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
  assert.match(shared,/const state=\{recipients:\[\],files:\[\],canvas:\[\]/);
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
  assert.match(shared,/\["Auto","Fast","Detailed"\]/);
  assert.match(shared,/fileInput\.multiple=true/);
  assert.match(shared,/Files are shown as preview labels only/);
  assert.match(shared,/Attach from canvas/);
  assert.match(shared,/References only · No files are copied/);
  assert.match(shared,/canvasItems\(\)/);
  assert.match(addon,/activeCanvasItems/);
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
