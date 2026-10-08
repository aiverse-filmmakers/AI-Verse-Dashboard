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
if (
  args[0] !== "read" ||
  at("--scope") !== "workspace:film-project" ||
  at("--profile") !== "auto" ||
  at("--relevant-domain") !== "kpis" ||
  at("--max-bytes") !== "16384"
) process.exit(7);
const root = at("--root");
const mission = fs.readFileSync(root + "/mission.txt", "utf8");
const ref = (id) => ({ owner: "ai-verse-brain", scope: "workspace:film-project", kind: "intent", id });
const dataRef = (id) => ({ owner: "ai-verse-data", scope: "workspace:film-project", kind: "metric", id });
const osRef = (id) => ({ owner: "ai-verse-os", scope: "workspace:film-project", kind: "current_context", id });
process.stdout.write(JSON.stringify({
  schema_version: "1.0",
  scope: "workspace:film-project",
  scope_kind: "workspace",
  purpose: { missions: [{ id: "mission-1", status: "CONFIRMED", statement: mission, canonical_ref: ref("mission-1") }] },
  goals: [
    { id: "goal-active", status: "ACTIVE", payload: { statement: "Launch" }, canonical_ref: ref("goal-active") },
    { id: "goal-paused", status: "PAUSED", payload: { statement: "Expansion" }, canonical_ref: ref("goal-paused") }
  ],
  strategies: [
    { id: "strategy-active", status: "ACTIVE", payload: { statement: "Prove value first" }, canonical_ref: ref("strategy-active") },
    { id: "strategy-paused", status: "PAUSED", payload: { statement: "Delay expansion" }, canonical_ref: ref("strategy-paused") }
  ],
  initiatives: [
    { id: "initiative-active", status: "ACTIVE", payload: { title: "Dashboard Purpose view" }, canonical_ref: ref("initiative-active") },
    { id: "initiative-paused", status: "PAUSED", payload: { title: "Secondary rollout" }, canonical_ref: ref("initiative-paused") }
  ],
  challenges: [
    { id: "challenge-1", status: "ACTIVE", payload: { statement: "Keep the UI owner-pure" }, canonical_ref: ref("challenge-1") },
    { id: "challenge-2", status: "CONFIRMED", payload: { statement: "Stay inside the byte budget" }, canonical_ref: ref("challenge-2") }
  ],
  risks: [
    { id: "risk-1", status: "ACTIVE", payload: { statement: "Stale owner truth" }, canonical_ref: ref("risk-1") },
    { id: "risk-2", status: "CONFIRMED", payload: { statement: "Cross-scope leakage" }, canonical_ref: ref("risk-2") }
  ],
  kpis: [{
    id: "kpi-adoption",
    definition: "Weekly active purposeful workspaces",
    target: 100,
    current_value: 42,
    trend: "up",
    definition_source_ref: ref("kpi-adoption"),
    value_source_ref: dataRef("weekly-active-workspaces"),
    value_freshness: { status: "fresh", observed_at: "2026-10-08T22:00:00Z" }
  }],
  narratives: [{ id: "narrative-not-for-this-view", canonical_ref: ref("narrative-not-for-this-view") }],
  current_state: [{ id: "state-not-for-this-view", source_refs: [dataRef("state-not-for-this-view")] }],
  current_work: [
    { kind: "current_work", statement: "Finish the Purpose Dashboard slice", source_refs: [osRef("current-context-1")] },
    { kind: "current_work", statement: "Preserve exact owner boundaries", source_refs: [osRef("current-context-1")] }
  ],
  recent_material_changes: [{ event: "not-yet", source_ref: ref("change-not-for-this-view") }],
  provenance: {
    projection_owner: "ai-verse-os",
    generated_at: new Date().toISOString(),
    profile: { requested: "auto", resolved: "workspace_rich", reasons: ["relevant_kpi_binding_present"] },
    owner_reads: [
      { owner: "ai-verse-brain", operation: "purpose_snapshot", status: "ok" },
      { owner: "ai-verse-data", operation: "purpose_current_state", status: "ok" }
    ]
  }
}));
`);
  const registry = new SystemRegistry();
  const systemId = registry.register(root).systemId;
  return { root, registry, systemId };
}

describe("Purpose Slice 10.1: bounded read-only Purpose surface", () => {
  it("adds current work while keeping recent material changes outside the response boundary", () => {
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
    assert.equal("initiatives" in result, false);
    assert.equal("challenges" in result, false);
    assert.equal("risks" in result, false);
    assert.equal("narratives" in result, false);
    assert.equal("current_state" in result, false);
    assert.equal("current_work" in result, false);
    assert.equal("recent_material_changes" in result, false);

    const kpis = result.kpis as { available: boolean; kpis: Array<Record<string, unknown>> };
    assert.equal(kpis.available, true);
    assert.equal(kpis.kpis[0].current_value, 42);

    const currentWork = result.currentWork as { available: boolean; work: Array<Record<string, unknown>> };
    assert.equal(currentWork.available, true);
    assert.deepEqual(currentWork.work.map((item) => item.statement), [
      "Finish the Purpose Dashboard slice",
      "Preserve exact owner boundaries",
    ]);
    for (const item of currentWork.work) {
      const source = (item.source_refs as Array<Record<string, unknown>>)[0];
      assert.equal(source.owner, "ai-verse-os");
      assert.equal(source.scope, "workspace:film-project");
    }

    const provenance = result.provenance as Record<string, unknown>;
    assert.equal(provenance.projectionOwner, "ai-verse-os");
    assert.equal(provenance.scope, "workspace:film-project");
    assert.equal((provenance.ownerReads as unknown[]).length, 2);

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
