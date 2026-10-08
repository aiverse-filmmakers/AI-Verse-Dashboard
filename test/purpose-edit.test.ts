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

describe("Purpose Slice 10.2 Task 1: owner-routed UI proposals", () => {
  it("passes exact workspace scope and user intent to the canonical Gateway bridge", () => {
    const { router, systemId } = makeRouter();
    let captured: unknown;
    const bridge: PurposeMutationBridge = {
      proposeOwnerRoutedChange(input) {
        captured = structuredClone(input);
        return {
          api_version: "gateway.purpose-strategic-routing.v1",
          state: "routed",
          scope: input.scope,
          proposal: {
            state: "proposed",
            change_kind: "mission_purpose",
            operation_kind: "update",
            requested_change: input.text,
            target_owner: "brain",
            routing_state: "routed_by_current_direction_owner",
            requires_explicit_confirmation: true,
            confirmation_state: "required_not_confirmed",
            apply_allowed: false,
            mutation_executed: false,
          },
          direction_owner: { schema_version: 1, scope: input.scope, owner: "brain", record: null },
        };
      },
    };
    router.attachPurposeMutationBridge(bridge);

    const out = router.handle({
      type: "req", v: "1.0", id: "p1", method: "purpose.change.propose",
      systemId, workspaceId: "film-project",
      params: { text: "Update our mission to focus on creator outcomes" },
    });
    assert.equal(out.ok, true);
    assert.deepEqual(captured, {
      systemId,
      workspaceId: "film-project",
      scope: "workspace:film-project",
      text: "Update our mission to focus on creator outcomes",
    });
    const result = out.result as Record<string, unknown>;
    assert.equal(result.state, "routed");
    assert.equal((result.proposal as Record<string, unknown>).target_owner, "brain");
  });

  it("fails closed when the canonical mutation Gateway is not attached", () => {
    const { router, systemId } = makeRouter();
    const out = router.handle({
      type: "req", v: "1.0", id: "p2", method: "purpose.change.propose",
      systemId, workspaceId: "film-project", params: { text: "Update our mission" },
    });
    assert.equal(out.ok, false);
    assert.equal(out.error?.code, "PURPOSE_MUTATION_GATEWAY_UNAVAILABLE");
  });

  it("does not admit unrelated Dashboard commands through the Purpose control exception", () => {
    const { router, systemId } = makeRouter();
    const out = router.handle({
      type: "req", v: "1.0", id: "p3", method: "task.start",
      systemId, workspaceId: "film-project", params: {},
    });
    assert.equal(out.ok, false);
    assert.equal(out.error?.code, "COMMAND_BLOCKED_READ_ONLY");
  });
});
