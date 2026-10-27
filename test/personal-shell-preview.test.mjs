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
