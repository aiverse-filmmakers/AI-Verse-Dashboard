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
  const registry = new SystemRegistry();
  const systemId = registry.register(root).systemId;
  return { router: new QueryRouter(registry, new DisposableCache()), systemId };
}

function routed(scope: string, text = "Update our mission") {
  return {
    api_version: "gateway.purpose-strategic-routing.v1",
    state: "routed",
    scope,
    proposal: {
      scope,
      state: "proposed",
      change_kind: "mission_purpose",
      operation_kind: "update",
      requested_change: text,
      target_owner: "brain",
      routing_state: "routed_by_current_direction_owner",
      requires_explicit_confirmation: true,
      confirmation_state: "required_not_confirmed",
      apply_allowed: false,
      mutation_executed: false,
    },
    direction_owner: { schema_version: 1, scope, owner: "brain", record: null },
  };
}

describe("Purpose Slice 10.2: owner-routed UI controls", () => {
  it("passes exact workspace scope and user intent to the canonical Gateway bridge", () => {
    const { router, systemId } = makeRouter();
    let captured: unknown;
    const bridge: PurposeMutationBridge = {
      proposeOwnerRoutedChange(input) { captured = structuredClone(input); return routed(input.scope, input.text); },
      confirmOwnerRoutedChange() { throw new Error("not used"); },
    };
    router.attachPurposeMutationBridge(bridge);
    const out = router.handle({ type: "req", v: "1.0", id: "p1", method: "purpose.change.propose", systemId, workspaceId: "film-project", params: { text: "Update our mission to focus on creator outcomes" } });
    assert.equal(out.ok, true);
    assert.deepEqual(captured, { systemId, workspaceId: "film-project", scope: "workspace:film-project", text: "Update our mission to focus on creator outcomes" });
    assert.equal((out.result as Record<string, unknown>).state, "routed");
  });

  it("delegates explicit-user confirmation for the exact routed proposal", () => {
    const { router, systemId } = makeRouter();
    const envelope = routed("workspace:film-project");
    let confirmationInput: Record<string, unknown> | undefined;
    const bridge: PurposeMutationBridge = {
      proposeOwnerRoutedChange() { return envelope; },
      confirmOwnerRoutedChange(input) {
        confirmationInput = structuredClone(input) as unknown as Record<string, unknown>;
        return {
          api_version: "gateway.purpose-strategic-confirmation.v1",
          state: "confirmed",
          scope: input.scope,
          proposal: { ...envelope.proposal, confirmation_state: "explicit_user_confirmed" },
          confirmation: { authority: "explicit_user", granted_by: input.grantedBy },
          apply_allowed: false,
          mutation_executed: false,
        };
      },
    };
    router.attachPurposeMutationBridge(bridge);
    const out = router.handle({
      type: "req", v: "1.0", id: "c1", method: "purpose.change.confirm",
      systemId, workspaceId: "film-project", params: { routedEnvelope: envelope, grantedBy: "bogdan" },
    });
    assert.equal(out.ok, true);
    assert.equal((out.result as Record<string, unknown>).state, "confirmed");
    assert.equal(confirmationInput?.scope, "workspace:film-project");
    assert.deepEqual(confirmationInput?.routedEnvelope, envelope);
    assert.equal(confirmationInput?.grantedBy, "bogdan");
    assert.equal(Number.isNaN(Date.parse(String(confirmationInput?.confirmedAt))), false);
  });

  it("rejects cross-workspace confirmation before the bridge", () => {
    const { router, systemId } = makeRouter();
    let called = false;
    const bridge: PurposeMutationBridge = {
      proposeOwnerRoutedChange() { return routed("workspace:film-project"); },
      confirmOwnerRoutedChange() { called = true; return {}; },
    };
    router.attachPurposeMutationBridge(bridge);
    const out = router.handle({ type: "req", v: "1.0", id: "c2", method: "purpose.change.confirm", systemId, workspaceId: "film-project", params: { routedEnvelope: routed("workspace:other"), grantedBy: "bogdan" } });
    assert.equal(out.ok, false);
    assert.equal(out.error?.code, "PURPOSE_CONFIRMATION_SCOPE_MISMATCH");
    assert.equal(called, false);
  });

  it("fails closed without the canonical mutation Gateway and keeps unrelated commands blocked", () => {
    const { router, systemId } = makeRouter();
    const propose = router.handle({ type: "req", v: "1.0", id: "p2", method: "purpose.change.propose", systemId, workspaceId: "film-project", params: { text: "Update our mission" } });
    assert.equal(propose.ok, false);
    assert.equal(propose.error?.code, "PURPOSE_MUTATION_GATEWAY_UNAVAILABLE");
    const other = router.handle({ type: "req", v: "1.0", id: "p3", method: "task.start", systemId, workspaceId: "film-project", params: {} });
    assert.equal(other.ok, false);
    assert.equal(other.error?.code, "COMMAND_BLOCKED_READ_ONLY");
  });
});
