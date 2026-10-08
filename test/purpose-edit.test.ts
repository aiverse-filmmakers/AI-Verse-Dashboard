import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { QueryRouter, type PurposeMutationBridge } from "../apps/gateway/src/index.js";
import { DisposableCache } from "../packages/os-read-adapter/src/index.js";
import { SystemRegistry } from "../packages/registry/src/index.js";

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

function makeRouter() {
  const root = mkdtempSync(join(tmpdir(), "dash-purpose-edit-"));
  roots.push(root);
  writeFileSync(join(root, "AI-VERSE.yaml"), 'schema_version: "2.0"\narchitecture: unified-workspace\n');
  writeFileSync(join(root, "AGENTS.md"), "# agents\n");
  for (const dir of ["operator", "workspaces", "system", "scripts"]) mkdirSync(join(root, dir));
  const ws = join(root, "workspaces", "film-project");
  mkdirSync(ws, { recursive: true });
  writeFileSync(join(ws, "WORKSPACE.yaml"), 'schema_version: "2.0"\nid: "film-project"\nname: "Film Project"\nstatus: "active"\n');
  writeFileSync(join(root, "mission.txt"), "Original mission");
  writeFileSync(join(root, "scripts", "purpose-context.mjs"), `
import fs from "node:fs";
const args = process.argv.slice(2); const at = (flag) => args[args.indexOf(flag) + 1];
if (args[0] !== "read" || at("--scope") !== "workspace:film-project" || at("--profile") !== "auto" || at("--relevant-domain") !== "kpis" || at("--max-bytes") !== "16384") process.exit(7);
const statement = fs.readFileSync(at("--root") + "/mission.txt", "utf8");
process.stdout.write(JSON.stringify({ schema_version: "1.0", scope: "workspace:film-project", scope_kind: "workspace", purpose: { missions: [{ id: "mission-1", status: "CONFIRMED", statement, canonical_ref: { owner: "ai-verse-brain", scope: "workspace:film-project", kind: "intent", id: "mission-1" } }] }, provenance: { projection_owner: "ai-verse-os", generated_at: new Date().toISOString(), owner_reads: [{ owner: "ai-verse-brain", status: "ok" }] } }));
`);
  const registry = new SystemRegistry();
  const systemId = registry.register(root).systemId;
  return { router: new QueryRouter(registry, new DisposableCache()), systemId, root };
}

function routed(scope: string, text = "Update our mission") {
  return { api_version: "gateway.purpose-strategic-routing.v1", state: "routed", scope, proposal: { scope, state: "proposed", change_kind: "mission_purpose", operation_kind: "update", requested_change: text, target_owner: "brain", routing_state: "routed_by_current_direction_owner", requires_explicit_confirmation: true, confirmation_state: "required_not_confirmed", apply_allowed: false, mutation_executed: false }, direction_owner: { schema_version: 1, scope, owner: "brain", record: null } };
}
function confirmed(scope: string) {
  const r = routed(scope);
  return { api_version: "gateway.purpose-strategic-confirmation.v1", state: "confirmed", scope, proposal: { ...r.proposal, confirmation_state: "explicit_user_confirmed" }, direction_owner: r.direction_owner, confirmation: { authority: "explicit_user" }, apply_allowed: false, mutation_executed: false };
}

function unusedApply(): never { throw new Error("not used"); }

describe("Purpose Slice 10.2: owner-routed UI controls", () => {
  it("passes exact workspace scope and user intent to the canonical Gateway bridge", () => {
    const { router, systemId } = makeRouter(); let captured: unknown;
    const bridge: PurposeMutationBridge = {
      proposeOwnerRoutedChange(input) { captured = structuredClone(input); return routed(input.scope, input.text); },
      confirmOwnerRoutedChange() { throw new Error("not used"); }, applyConfirmedOwnerChange: unusedApply,
    };
    router.attachPurposeMutationBridge(bridge);
    const out = router.handle({ type: "req", v: "1.0", id: "p1", method: "purpose.change.propose", systemId, workspaceId: "film-project", params: { text: "Update our mission to focus on creator outcomes" } });
    assert.equal(out.ok, true); assert.deepEqual(captured, { systemId, workspaceId: "film-project", scope: "workspace:film-project", text: "Update our mission to focus on creator outcomes" });
  });

  it("delegates explicit-user confirmation for the exact routed proposal", () => {
    const { router, systemId } = makeRouter(); const envelope = routed("workspace:film-project"); let inputSeen: Record<string, unknown> | undefined;
    const bridge: PurposeMutationBridge = {
      proposeOwnerRoutedChange() { return envelope; },
      confirmOwnerRoutedChange(input) { inputSeen = structuredClone(input) as unknown as Record<string, unknown>; return confirmed(input.scope); },
      applyConfirmedOwnerChange: unusedApply,
    };
    router.attachPurposeMutationBridge(bridge);
    const out = router.handle({ type: "req", v: "1.0", id: "c1", method: "purpose.change.confirm", systemId, workspaceId: "film-project", params: { routedEnvelope: envelope, grantedBy: "bogdan" } });
    assert.equal(out.ok, true); assert.equal((out.result as Record<string, unknown>).state, "confirmed"); assert.equal(inputSeen?.grantedBy, "bogdan");
  });

  it("shows canonical owner outcome and then a fresh OS-owned Purpose display", () => {
    const { router, systemId, root } = makeRouter(); const envelope = confirmed("workspace:film-project"); let applied: unknown;
    const bridge: PurposeMutationBridge = {
      proposeOwnerRoutedChange() { throw new Error("not used"); }, confirmOwnerRoutedChange() { throw new Error("not used"); },
      applyConfirmedOwnerChange(input) {
        applied = structuredClone(input);
        writeFileSync(join(root, "mission.txt"), "Mission after canonical owner write");
        return { api_version: "gateway.purpose-strategic-post-write.v1", state: "purpose_rebuilt_after_owner_success", scope: input.scope, canonical_owner: "brain", owner_receipt: { receipt_id: "brain-receipt-1", status: "succeeded", effect_occurred: true }, canonical_owner_receipt_is_mutation_evidence: true };
      },
    };
    router.attachPurposeMutationBridge(bridge);
    const out = router.handle({ type: "req", v: "1.0", id: "a1", method: "purpose.change.apply", systemId, workspaceId: "film-project", params: { confirmedEnvelope: envelope } });
    assert.equal(out.ok, true);
    assert.deepEqual((applied as Record<string, unknown>).confirmedEnvelope, envelope);
    const result = out.result as Record<string, unknown>;
    assert.equal(result.canonicalMutationEvidence, "ownerOutcome"); assert.equal(result.purposeSource, "fresh_os_owner_read");
    const ownerOutcome = result.ownerOutcome as Record<string, unknown>;
    assert.equal((ownerOutcome.owner_receipt as Record<string, unknown>).receipt_id, "brain-receipt-1");
    const purpose = result.purpose as { mission: { missions: Array<Record<string, unknown>> } };
    assert.equal(purpose.mission.missions[0].statement, "Mission after canonical owner write");
  });

  it("rejects cross-workspace control envelopes and keeps unrelated commands blocked", () => {
    const { router, systemId } = makeRouter(); let called = false;
    const bridge: PurposeMutationBridge = { proposeOwnerRoutedChange() { return routed("workspace:film-project"); }, confirmOwnerRoutedChange() { called = true; return {}; }, applyConfirmedOwnerChange() { called = true; return {}; } };
    router.attachPurposeMutationBridge(bridge);
    const bad = router.handle({ type: "req", v: "1.0", id: "c2", method: "purpose.change.confirm", systemId, workspaceId: "film-project", params: { routedEnvelope: routed("workspace:other"), grantedBy: "bogdan" } });
    assert.equal(bad.ok, false); assert.equal(called, false);
    const other = router.handle({ type: "req", v: "1.0", id: "p3", method: "task.start", systemId, workspaceId: "film-project", params: {} });
    assert.equal(other.ok, false); assert.equal(other.error?.code, "COMMAND_BLOCKED_READ_ONLY");
  });
});
