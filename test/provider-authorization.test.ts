import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { ProviderAuthorization, type AuthStart } from "../apps/gateway/src/provider-authorization.js";
const binding = { systemId: "system-a", browserSessionId: "trusted-session" };
const start: AuthStart = { provider: "chatgpt", binding,
  redirectUri: "http://127.0.0.1:54321/auth/callback",
  chatgpt: { appName: "AI-Verse", hostId: "urn:uuid:synthetic-test" } };
function callback(authUrl: string, extras: Record<string,string> = {}): string {
  const auth = new URL(authUrl), result = new URL(start.redirectUri);
  result.search = new URLSearchParams({ state: auth.searchParams.get("state")!,
    code: "synthetic-code", client_id: "oaiapp_synthetic", ...extras }).toString();
  return result.href;
}
test("ChatGPT first registration preserves PKCE and exact callback, without browser verifier", () => {
  const auth = new ProviderAuthorization();
  const attempt = auth.start(start), url = new URL(attempt.authorizationUrl);
  assert.equal(url.searchParams.get("client_id"), "dynamic_agent_client");
  assert.equal(url.searchParams.get("agent_name_hint"), "AI-Verse");
  assert.equal(url.searchParams.get("code_verifier"), null);
  const request = auth.consume(attempt.attemptId, binding, callback(url.href));
  assert.equal(request.clientId, "oaiapp_synthetic");
  assert.equal(request.redirectUri, start.redirectUri);
  assert.equal(createHash("sha256").update(request.codeVerifier).digest("base64url"), url.searchParams.get("code_challenge"));
  assert.equal(request.nonce, url.searchParams.get("nonce"));
  assert.throws(() => auth.consume(attempt.attemptId, binding, callback(url.href)));
});
test("scope mismatch cannot redeem or cancel another session's attempt", () => {
  const auth = new ProviderAuthorization(), a = auth.start(start);
  for (const wrong of [{ ...binding, systemId: "system-b" }, { ...binding, browserSessionId: "other" }]) {
    assert.throws(() => auth.consume(a.attemptId, wrong, callback(a.authorizationUrl)));
    assert.throws(() => auth.cancel(a.attemptId, wrong));
  }
  assert.equal(auth.consume(a.attemptId, binding, callback(a.authorizationUrl)).provider, "chatgpt");
});
test("invalid callback attempts are rejected and consumed", () => {
  const mutations = [
    (s:string) => s.replace("127.0.0.1", "localhost"),
    (s:string) => s.replace("54321", "54322"),
    (s:string) => s.replace("/auth/callback", "/wrong"),
    (s:string) => s + "#fragment",
    (s:string) => s + "&state=duplicate",
    (s:string) => s + "&unexpected=1",
    (_s:string) => callback(_s, {state: "wrong"}),
  ];
  for (const mutation of mutations) {
    const auth = new ProviderAuthorization(), a = auth.start(start);
    const bad = mutation(callback(a.authorizationUrl));
    assert.throws(() => auth.consume(a.attemptId, binding, bad));
    assert.throws(() => auth.consume(a.attemptId, binding, callback(a.authorizationUrl)));
  }
});
test("missing code, missing issued ID, denial and substituted returning ID fail", () => {
  for (const extra of [{code:""}, {client_id:""}, {error:"access_denied"}] as Record<string,string>[]) {
    const auth = new ProviderAuthorization(), a = auth.start(start);
    assert.throws(() => auth.consume(a.attemptId, binding, callback(a.authorizationUrl, extra)));
  }
  const auth = new ProviderAuthorization(), a = auth.start({...start, chatgpt:{...start.chatgpt!,issuedClientId:"oaiapp_original"}});
  assert.equal(new URL(a.authorizationUrl).searchParams.has("agent_name_hint"),false);
  assert.throws(() => auth.consume(a.attemptId,binding,callback(a.authorizationUrl)));
});
test("expiry, cancellation and bounded pending storage", () => {
  let now = 0;
  const auth = new ProviderAuthorization(() => now), a = auth.start(start);
  now = 600_000;
  assert.throws(() => auth.consume(a.attemptId,binding,callback(a.authorizationUrl)));
  const b = auth.start(start); auth.cancel(b.attemptId,binding);
  assert.throws(() => auth.consume(b.attemptId,binding,callback(b.authorizationUrl)));
  for (let i=0;i<32;i++) auth.start(start);
  assert.throws(() => auth.start(start));
  now += 600_000; assert.doesNotThrow(() => auth.start(start));
});
test("OpenRouter uses its own PKCE endpoint and does not request OpenAI scopes", () => {
  const auth = new ProviderAuthorization(), a = auth.start({...start,provider:"openrouter",chatgpt:undefined});
  const url = new URL(a.authorizationUrl);
  assert.equal(url.origin,"https://openrouter.ai");
  assert.equal(url.searchParams.get("callback_url"),start.redirectUri);
  assert.equal(url.searchParams.has("scope"),false);
  const result = new URL(callback(a.authorizationUrl));result.searchParams.delete("client_id");
  assert.equal(auth.consume(a.attemptId,binding,result.href).provider,"openrouter");
});
test("unsafe callback configurations rejected and random state differs per attempt", () => {
  const auth = new ProviderAuthorization();
  for (const redirectUri of ["https://example.com/auth/callback", "http://localhost:1234/auth/callback",start.redirectUri+"?x=1",start.redirectUri+"#hash"]) {
    assert.throws(() => auth.start({...start,redirectUri}));
  }
  const a = new URL(auth.start(start).authorizationUrl),b = new URL(auth.start(start).authorizationUrl);
  assert.notEqual(a.searchParams.get("state"),b.searchParams.get("state"));
  assert.notEqual(a.searchParams.get("nonce"),b.searchParams.get("nonce"));
});
