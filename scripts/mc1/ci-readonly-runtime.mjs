#!/usr/bin/env node
// Test-only local subprocess implementing Gateway's *supported* runtime/1.0
// transport. No model service, network, canonical writes or external secrets.
import { createHash } from "node:crypto";
let raw = "";
for await (const chunk of process.stdin) {
  raw += chunk.toString();
  if (raw.length > 2_097_152) process.exit(2);
}
const envelope = JSON.parse(raw);
if (
  envelope.protocol !== "ai-verse-gateway-runtime/1.0" ||
  envelope.operation !== "invoke" ||
  typeof envelope.request_id !== "string" ||
  !Array.isArray(envelope.payload?.messages)
) {
  process.exit(3);
}
if (process.env.AIVERSE_GATEWAY_TOKEN || process.env.LOCAL_LLM_API_KEY) {
  process.stderr.write("Runtime subprocess unexpectedly inherited bearer credentials\n");
  process.exit(4);
}
const userMessages = envelope.payload.messages.filter((m) => m?.role === "user");
const text = String(userMessages.at(-1)?.content || "");
const digest = createHash("sha256").update(text).digest("hex").slice(0, 12);
const result = {
  content: "AI-Verse read-only subprocess runtime confirmation [" + digest + "]: " + text,
  tool_calls: [],
  finish_reason: "stop",
  usage: { input_tokens: 0, output_tokens: 0, cost: 0 }
};
process.stdout.write(JSON.stringify({
  protocol: "ai-verse-gateway-runtime/1.0",
  request_id: envelope.request_id,
  ok: true,
  result
}) + "\n");
