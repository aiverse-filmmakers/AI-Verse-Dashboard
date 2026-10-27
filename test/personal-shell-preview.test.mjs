import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const base = new URL("../apps/web/preview/", import.meta.url);
const html = readFileSync(new URL("index.html", base), "utf8");
const css = readFileSync(new URL("style.css", base), "utf8");
const js = readFileSync(new URL("personal-shell.js", base), "utf8");

test("optional Personal shell parses and loads beside original chat", () => {
  assert.doesNotThrow(() => new Function(js));
  assert.match(html, /<script type="module" src="app\.js"><\/script><script type="module" src="personal-shell\.js"><\/script>/);
  assert.match(html, /<aside class="chat-panel"/);
  assert.match(html, /id="viewport"/);
  assert.match(js, /shell\.insertBefore\(secondaryHost, main\)/);
});

test("first load preserves one chat and canvas; extras are hidden", () => {
  assert.match(js, /panes:\s*0,\s*chats:\s*\{\},\s*app:\s*"canvas"/);
  assert.match(js, /popover\.hidden\s*=\s*true/);
  assert.match(js, /appMenu\.hidden\s*=\s*true/);
  assert.match(js, /appSurface\.hidden\s*=\s*true/);
  assert.match(css, /\.secondary-chat-host\s*\{\s*display:none/);
});

test("multiple editable demo teams are separate from real AI and workspace ownership", () => {
  assert.match(js, /name: "Personal team"/);
  assert.match(js, /name: "Film studio"/);
  assert.match(js, /name: "Content lab"/);
  assert.match(js, /"Create another AI team"/);
  assert.match(js, /"Add teammate"/);
  assert.match(js, /"Design preview only\. No real agents are running\."/);
  assert.match(js, /aiverse-personal-shell-preview-v1/);
  assert.doesNotMatch(js, /\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b/);
});

test("additional panes and app views are opt-in while focus retains main chat", () => {
  assert.match(js, /if \(data\.panes >= 2\)/);
  assert.match(js, /"notes","assets","activity"/);
  assert.match(js, /appToggle\.setAttribute\("aria-expanded","false"\)/);
  assert.match(css, /\.focus-mode \.chat-panel\s*\{\s*display:flex/);
  assert.match(css, /personal-teams-popover\[hidden\]/);
});


test("team and agent start a stable recipient thread without replacing primary chat", () => {
  assert.match(js, /"Chat with the entire " \+ t\.name \+ " team"/);
  assert.match(js, /startTargetChat\("team:" \+ t\.id\)/);
  assert.match(js, /startTargetChat\("agent:" \+ t\.id \+ ":" \+ member\.id\)/);
  assert.match(js, /const findRecipient = key =>/);
  assert.match(js, /data\.chatTargets\[String\(slot\)\] = key/);
  assert.match(js, /const source = recipient \? data\.threads\[recipient\.key\]/);
  assert.match(js, /data\.threads = data\.threads && typeof data\.threads/);
  assert.match(js, /if \(targetKey && !recipient\) delete data\.chatTargets/);
  assert.match(js, /if \(recipient && !findRecipient\(recipient\.key\)\)/);
});

test("main chat offers explicit @ recipient selection and preserves normal chat by default", () => {
  assert.match(js, /"Mention a team or assistant"/);
  assert.match(js, /"mention-recipient-menu"/);
  assert.match(js, /composeInput\.addEventListener\("input"/);
  assert.match(js, /composeInput\.addEventListener\("keydown",event=>/);
  assert.match(js, /composer\.addEventListener\("submit",event=>/);
  assert.match(js, /"Choose a recipient from the @ menu before sending\."/);
  assert.match(js, /if\(!target\) return;/);
  assert.match(js, /\[Demo to /);
  assert.match(js, /data\.threads\[target\.key\]=thread/);
  assert.match(css, /\.draft-recipient-chip\[hidden\]/);
  assert.match(css, /\.mention-recipient-menu\[hidden\]/);
});

test("the public preview never claims a live team dispatch", () => {
  assert.match(js, /No real messages are being sent\./);
  assert.match(js, /Live team and agent routing are not connected yet\./);
  assert.match(js, /No real agent messages are sent\./);
  assert.doesNotMatch(js, /\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|\bnavigator\.sendBeacon\b/);
});


test("@ picker begins with collapsed teams instead of a flat list of all agents", () => {
  assert.match(js, /let mentionTeamId = null/);
  assert.match(js, /if \(!keepTeam\) mentionTeamId = null/);
  assert.match(js, /if \(!selectedTeam\) \{/);
  assert.match(js, /"Choose a team"/);
  assert.match(js, /const teams = data\.teams\.filter\(t => t\.name\.toLocaleLowerCase\(\)\.includes\(query\)\)/);
  assert.match(js, /"Open " \+ team\.name \+ " team"/);
  assert.match(js, /team\.members\.length \+ " assistant"/);
  assert.doesNotMatch(js, /const recipients=\[\]/);
});

test("one selected team reveals explicit entire-team and individual mention actions", () => {
  assert.match(js, /mentionTeamId = team\.id/);
  assert.match(js, /showMentionPicker\(true, "", true\)/);
  assert.match(js, /"Back to all teams"/);
  assert.match(js, /"Entire team"/);
  assert.match(js, /chooseMentionRecipient\("team:" \+ selectedTeam\.id\)/);
  assert.match(js, /for \(const agent of selectedTeam\.members\)/);
  assert.match(js, /chooseMentionRecipient\("agent:" \+ selectedTeam\.id \+ ":" \+ agent\.id\)/);
  assert.match(js, /if \(!on\) \{ mentionTeamId = null; return; \}/);
  assert.match(css, /\.mention-team-heading/);
  assert.match(css, /\.mention-back/);
});

test("@ picker still removes the typed mention token and shows the recipient chip", () => {
  assert.match(js, /function chooseMentionRecipient\(key\)/);
  assert.match(js, /previous\.slice\(0, mentionToken\.start\) \+ previous\.slice\(mentionToken\.end\)/);
  assert.match(js, /renderDraftTarget\(\)/);
  assert.match(js, /mentionMenu\.querySelector\("\.mention-option"\)\?\.click\(\)/);
  assert.match(js, /showMentionPicker\(true,match\[1\]\)/);
});
