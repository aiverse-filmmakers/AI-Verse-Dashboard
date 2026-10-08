import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { PURPOSE_CONTROL_METHODS } from "../packages/protocol/src/index.js";
import { buildPurposeMissionModel } from "../packages/read-models/src/index.js";
import type { PurposeProjection } from "../packages/os-read-adapter/src/index.js";

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function allSourceFiles(root: string): string[] {
  const out: string[] = [];
  const visit = (dir: string) => {
    for (const item of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, item.name);
      if (item.isDirectory()) visit(path);
      else if (/\.(?:ts|js|mjs)$/.test(item.name)) out.push(path);
    }
  };
  visit(join(process.cwd(), root));
  return out;
}

describe("Purpose Slice 10.2 Task 4: Dashboard never owns or directly writes Purpose", () => {
  it("has no generic direct Purpose write RPC", () => {
    assert.deepEqual([...PURPOSE_CONTROL_METHODS], [
      "purpose.change.propose",
      "purpose.change.confirm",
      "purpose.change.apply",
    ]);
    const forbidden = ["purpose.write", "purpose.set", "purpose.update", "purpose.delete", "purpose.put"];
    for (const method of forbidden) assert.equal((PURPOSE_CONTROL_METHODS as readonly string[]).includes(method), false, method);
  });

  it("Purpose projection/read-model/gateway path contains no local persistence primitive", () => {
    const paths = [
      "packages/read-models/src/purpose.ts",
      "packages/os-read-adapter/src/purpose.ts",
      "apps/gateway/src/query-router.ts",
      "apps/gateway/src/purpose-mutation-bridge.ts",
    ];
    const forbidden = [
      /\bwriteFile(?:Sync)?\b/,
      /\bappendFile(?:Sync)?\b/,
      /\bcreateWriteStream\b/,
      /\bDatabaseSync\b/,
      /\bINSERT\s+INTO\b/i,
      /\bUPDATE\s+purpose\b/i,
      /\bDELETE\s+FROM\s+purpose\b/i,
    ];
    for (const path of paths) {
      const body = source(path);
      for (const pattern of forbidden) assert.equal(pattern.test(body), false, `${path}: ${String(pattern)}`);
    }
  });

  it("has no Purpose store/repository/database implementation in product source", () => {
    const names = [...allSourceFiles("apps"), ...allSourceFiles("packages")]
      .map((path) => path.toLowerCase());
    const bad = names.filter((path) => /purpose[-_.]?(?:store|repository|database|db)\./.test(path));
    assert.deepEqual(bad, []);
  });

  it("read-model output is a detached copy and cannot mutate owner projection", () => {
    const projection: PurposeProjection = {
      schema_version: "1.0",
      scope: "workspace:film-project",
      scope_kind: "workspace",
      purpose: { missions: [{ id: "mission-1", statement: "Canonical owner mission" }] },
      goals: [{ id: "goal-1", status: "ACTIVE" }],
      provenance: { projection_owner: "ai-verse-os", generated_at: new Date().toISOString() },
    };
    const view = buildPurposeMissionModel(projection);
    view.mission.missions[0].statement = "Dashboard-local mutation attempt";
    view.activeGoals.goals[0].status = "PAUSED";
    assert.equal(projection.purpose?.missions?.[0].statement, "Canonical owner mission");
    assert.equal(projection.goals?.[0].status, "ACTIVE");
  });

  it("control source names the bridge outcome as mutation evidence and fresh OS read as display", () => {
    const router = source("apps/gateway/src/query-router.ts");
    assert.match(router, /canonicalMutationEvidence:\s*"ownerOutcome"/);
    assert.match(router, /purposeSource:\s*"fresh_os_owner_read"/);
    assert.match(router, /applyConfirmedOwnerChange/);
    assert.match(router, /readPurposeProjection\(this\.registry, systemId, workspaceId\)/);
  });
});
