/**
 * Static, credential-free runtime configuration assessment.
 *
 * None of these outputs prove that a model is reachable, executable, safe
 * or approved to receive any data. Never return commands, paths, model names,
 * endpoint URLs, env var names or credential values to the caller.
 */
export function inspectRuntimeDescriptor(runtime) {
  const unverified = { configuration: "incomplete", provider: "unverified" };
  if (!runtime || typeof runtime !== "object") return unverified;
  if (runtime.kind === "deterministic") {
    return { configuration: "test_only", provider: "none" };
  }
  if (runtime.kind === "json-subprocess") {
    const cmd = runtime.command;
    const envNames = runtime.env_names || [];
    const valid = Array.isArray(cmd) && cmd.length > 0 && cmd.length <= 32 &&
      cmd.every((part) => typeof part === "string" && part.length > 0 && part.length <= 2048) &&
      Array.isArray(envNames) && envNames.length <= 32 &&
      envNames.every((name) => typeof name === "string" &&
        /^[A-Za-z_][A-Za-z0-9_]*$/.test(name));
    if (!valid) return unverified;
    const testFixture = cmd.some((part) =>
      /(?:^|[\\/])(?:ci-readonly-runtime|fake-runtime|fake-host)\.mjs$/i.test(part));
    return {
      configuration: testFixture ? "test_only" : "configured_unverified",
      provider: "local_subprocess"
    };
  }
  if (runtime.kind === "openai-compatible") {
    if (typeof runtime.base_url !== "string" ||
        typeof runtime.model !== "string" || !runtime.model.trim() ||
        runtime.model.trim() === "default" ||
        (runtime.api_key_env != null && (
          typeof runtime.api_key_env !== "string" ||
          !/^[A-Za-z_][A-Za-z0-9_]*$/.test(runtime.api_key_env)
        ))) return unverified;
    try {
      const url = new URL(runtime.base_url);
      if (!["http:", "https:"].includes(url.protocol) ||
          url.username || url.password || url.search || url.hash) return unverified;
      const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
      // Never infer that an https URL authorizes use of a provider credential.
      if (!local && url.protocol !== "https:") return unverified;
      return {
        configuration: "configured_unverified",
        provider: local ? "local_endpoint" : "external_scope_required"
      };
    } catch {
      return unverified;
    }
  }
  return unverified;
}
