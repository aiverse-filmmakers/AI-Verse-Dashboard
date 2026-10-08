import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { SystemRegistry } from "../packages/registry/src/index.js";
import { DisposableCache } from "../packages/os-read-adapter/src/index.js";
import { QueryRouter } from "../apps/gateway/src/index.js";
import { phase2Panels } from "../apps/web/src/index.js";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function makeOs(): { root: string; registry: SystemRegistry; systemId: string } {
  const root = mkdtempSync(join(tmpdir(), "dash-purpose-"));
  roots.push(root);
  writeFileSync(join(root, "AI-VERSE.yaml"), 'schema_version: "2.0"\narchitecture: unified-workspace\n');
  writeFileSync(join(root, "AGENTS.md"), "# agents\n");
  for (const dir of ["operator", "workspaces", "system", "scripts"]) mkdirSync(join(root, dir));
  const ws = join(root, "workspaces", "film-project");
  mkdirSync(ws, { recursive: true });
  writeFileSync(join(ws, "WORKSPACE.yaml"), 'schema_version: "2.0"\nid: "film-project"\nname: "Film Project"\nstatus: "active"\n');
  writeFileSync(join(root, "mission.txt"), "Ship a useful film system");
  writeFileSync(join(root, "scripts", "purpose-context.mjs"), `
import fs from "node:fs";
const args = process.argv.slice(2);
const at = (flag) => args[args.indexOf(flag) + 1];
if (args[0] !== "read" || at("--scope") !== "workspace:film-project" || at("--profile") !== "basic" || at("--max-bytes") !== "16384") process.exit(7);
const root = at("--root");
const mission = fs.readFileSync(root + "/mission.txt", "utf8");
const ref = (id) => ({ owner: "ai-verse-brain", scope: "workspace:film-project", kind: "intent", id });
process.stdout.write(JSON.stringify({
  schema_version: "1.0",
  scope: "workspace:film-project",
  scope_kind: "workspace",
  purpose: { missions: [{ id: "mission-1", status: "CONFIRMED", statement: mission, canonical_ref: ref("mission-1") }] },
  goals: [
    { id: "goal-active", status: "ACTIVE", payload: { statement: "Launch" }, canonical_ref: ref("goal-active") },
    { id: "goal-paused", status: "PAUSED", payload: { statement: "Expansion" }, canonical_ref: ref("goal-paused") }
  ],
  strategies: [{ id: "strategy-hidden", status: "ACTIVE" }],
  provenance: { projection_owner: "ai-verse-os", generated_at: new Date().toISOString(), owner_reads: [{ owner: "ai-verse-brain", operation: "purpose_snapshot", status: "ok" }] }
}));
`);
  const registry = new SystemRegistry();
  const systemId = registry.register(root).systemId;
  return { root, registry, systemId };
}

describe("Purpose Slice 10.1: bounded read-only Purpose surface", () => {
  it("returns mission and current owner goals, preserving owner status/refs", () => {
    const { root, registry, systemId } = makeOs();
    const router = new QueryRouter(registry, new DisposableCache());
    const frame = () => router.handle({
      type: "req", v: "1.0", id: "purpose-1", method: "purpose.get",
      systemId, workspaceId: "film-project",
    });

    const first = frame();
    assert.equal(first.ok, true);
    const result = first.result as Record<string, unknown>;
    assert.equal(result.readOnly, true);
    assert.equal(result.workspaceId, "film-project");
    assert.equal("goals" in result, false);
    assert.equal("strategies" in result, false);

    const mission = result.mission as { available: boolean; missions: Array<Record<string, unknown>> };
    assert.equal(mission.available, true);
    assert.equal(mission.missions[0].statement, "Ship a useful film system");

    const activeGoals = result.activeGoals as { available: boolean; goals: Array<Record<string, unknown>> };
    assert.equal(activeGoals.available, true);
    assert.deepEqual(activeGoals.goals.map((goal) => goal.status), ["ACTIVE", "PAUSED"]);
    for (const goal of activeGoals.goals) {
      assert.equal((goal.canonical_ref as Record<string, unknown>).owner, "ai-verse-brain");
      assert.equal((goal.canonical_ref as Record<string, unknown>).scope, "workspace:film-project");
    }

    const provenance = result.provenance as Record<string, unknown>;
    assert.equal(provenance.projectionOwner, "ai-verse-os");
    assert.equal(provenance.scope, "workspace:film-project");

    writeFileSync(join(root, "mission.txt"), "Ship the refreshed mission");
    const second = frame();
    const secondMission = (second.result as { mission: { missions: Array<Record<string, unknown>> } }).mission;
    assert.equal(secondMission.missions[0].statement, "Ship the refreshed mission");
  });

  it("Purpose remains a workspace-scoped presentation panel, not a truth owner", () => {
    const purpose = phase2Panels().find((panel) => panel.id === "purpose");
    assert.ok(purpose);
    assert.equal(purpose.systemScoped, true);
    assert.equal(purpose.workspaceScoped, true);
    assert.deepEqual(purpose.supportedPresentations, ["full", "compact"]);
  });
});
