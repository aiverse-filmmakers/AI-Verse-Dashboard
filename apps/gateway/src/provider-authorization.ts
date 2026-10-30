/** Host-only OAuth transactions. No token exchange, storage, or identity assertion.
 * Call only after Dashboard authentication; binding is trusted host state, not
 * browser-provided identity. Never serialize ExchangeRequest into UI responses.
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export type Provider = "chatgpt" | "openrouter";
export interface AuthBinding { systemId: string; browserSessionId: string }
export interface AuthStart {
  provider: Provider;
  binding: AuthBinding;
  redirectUri: string;
  /** Must reflect the admitted deployment type, not user input. */
  chatgpt?: { hostId: string; appName: string; issuedClientId?: string };
}
export interface ExchangeRequest {
  provider: Provider;
  code: string;
  redirectUri: string;
  codeVerifier: string;
  nonce: string;
  clientId?: string;
  hostId?: string;
}
interface Pending extends ExchangeRequest {
  binding: AuthBinding;
  state: string;
  expiresAt: number;
}
const fresh = () => randomBytes(32).toString("base64url");
const equal = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};
function callbackUri(value: string): URL {
  const uri = new URL(value);
  // Fixed loopback path keeps the future listener and callback contract narrow.
  if (uri.protocol !== "http:" || uri.hostname !== "127.0.0.1" ||
      !uri.port || uri.pathname !== "/auth/callback" || uri.search ||
      uri.hash || uri.username || uri.password || value !== uri.href) {
    throw new Error("A canonical 127.0.0.1 loopback callback is required");
  }
  return uri;
}
function bindingValid(binding: AuthBinding): boolean {
  return !!binding.systemId?.trim() && !!binding.browserSessionId?.trim();
}
function sameBinding(a: AuthBinding, b: AuthBinding): boolean {
  return a.systemId === b.systemId && a.browserSessionId === b.browserSessionId;
}
function clientId(value: string): boolean {
  return /^oaiapp_[A-Za-z0-9_-]{1,200}$/.test(value);
}
export class ProviderAuthorization {
  #pending = new Map<string, Pending>();
  constructor(private readonly now: () => number = Date.now) {}

  #prune(): void {
    for (const [id, item] of this.#pending) {
      if (item.expiresAt <= this.now()) this.#pending.delete(id);
    }
  }

  start(input: AuthStart): { attemptId: string; authorizationUrl: string } {
    this.#prune();
    if (!bindingValid(input.binding)) throw new Error("Trusted binding required");
    if (this.#pending.size >= 32) throw new Error("Too many pending sign-ins");
    if (input.provider !== "chatgpt" && input.provider !== "openrouter") {
      throw new Error("Unsupported provider");
    }
    callbackUri(input.redirectUri);
    const id = fresh(), state = fresh(), nonce = fresh(), codeVerifier = fresh();
    const challenge = createHash("sha256").update(codeVerifier).digest("base64url");
    const uri = new URL(input.provider === "chatgpt"
      ? "https://auth.openai.com/api/accounts/authorize"
      : "https://openrouter.ai/auth");
    uri.searchParams.set("state", state);
    uri.searchParams.set("code_challenge", challenge);
    uri.searchParams.set("code_challenge_method", "S256");
    let selectedClient: string | undefined;
    let hostId: string | undefined;
    if (input.provider === "chatgpt") {
      const config = input.chatgpt;
      if (!config?.hostId.trim() || !config.appName.trim() ||
          (config.issuedClientId !== undefined && !clientId(config.issuedClientId))) {
        throw new Error("Admitted ChatGPT registration configuration required");
      }
      selectedClient = config.issuedClientId;
      hostId = config.hostId;
      uri.searchParams.set("client_id", selectedClient ?? "dynamic_agent_client");
      if (!selectedClient) uri.searchParams.set("agent_name_hint", config.appName);
      uri.searchParams.set("ext_agent_host_id", hostId);
      uri.searchParams.set("redirect_uri", input.redirectUri);
      uri.searchParams.set("response_type", "code");
      uri.searchParams.set("resource", "https://api.openai.com/v1");
      uri.searchParams.set("scope", "openid profile email offline_access resource.invoke chatgpt.tokens.use.direct");
      uri.searchParams.set("nonce", nonce);
    } else {
      uri.searchParams.set("callback_url", input.redirectUri);
    }
    this.#pending.set(id, {
      provider: input.provider, binding: { ...input.binding }, state, nonce,
      code: "", redirectUri: input.redirectUri, codeVerifier,
      clientId: selectedClient, hostId, expiresAt: this.now() + 10 * 60_000,
    });
    return { attemptId: id, authorizationUrl: uri.href };
  }

  cancel(attemptId: string, binding: AuthBinding): void {
    const item = this.#pending.get(attemptId);
    if (!item || !sameBinding(item.binding, binding)) throw new Error("Unknown sign-in");
    this.#pending.delete(attemptId);
  }

  consume(attemptId: string, binding: AuthBinding, callbackUrl: string): ExchangeRequest {
    const item = this.#pending.get(attemptId);
    if (!item || !sameBinding(item.binding, binding)) throw new Error("Unknown sign-in");
    // Consume before validation: every callback for this trusted attempt is one-use.
    this.#pending.delete(attemptId);
    if (item.expiresAt <= this.now()) throw new Error("Sign-in expired");
    let uri: URL;
    try { uri = new URL(callbackUrl); } catch { throw new Error("Invalid callback"); }
    const expected = new URL(item.redirectUri);
    if (uri.origin !== expected.origin || uri.pathname !== expected.pathname ||
        uri.username || uri.password || uri.hash || callbackUrl.length > 16_384) {
      throw new Error("Invalid callback target");
    }
    for (const name of new Set(uri.searchParams.keys())) {
      if (uri.searchParams.getAll(name).length !== 1 ||
          !["state", "code", "client_id", "scope", "error", "error_description", "error_uri"].includes(name)) {
        throw new Error("Invalid callback parameters");
      }
    }
    if (!equal(uri.searchParams.get("state") ?? "", item.state)) throw new Error("Invalid sign-in state");
    if (uri.searchParams.has("error")) throw new Error("Provider sign-in declined or failed");
    const code = uri.searchParams.get("code");
    if (!code || code.length > 8192) throw new Error("Missing or invalid authorization code");
    let issued = item.clientId;
    if (item.provider === "chatgpt") {
      const returned = uri.searchParams.get("client_id");
      if (issued && returned !== null && returned !== issued) throw new Error("Registration mismatch");
      issued ??= returned ?? undefined;
      if (!issued || !clientId(issued)) throw new Error("Registration incomplete");
    } else if (uri.searchParams.has("client_id")) {
      throw new Error("Unexpected registration");
    }
    return {
      provider: item.provider, code, redirectUri: item.redirectUri,
      codeVerifier: item.codeVerifier, nonce: item.nonce,
      clientId: issued, hostId: item.hostId,
    };
  }
}
