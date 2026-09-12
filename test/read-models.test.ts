import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SystemRegistry } from "../packages/registry/src/index.js";
import { DisposableCache } from "../packages/os-read-adapter/src/index.js";
import {
  assessFreshness,
  buildHealthReport,
  buildNowModel,
  buildWorkspaceProjections,
  normalizeInboxItem,
  normalizeWorkItem,
  sortInbox,
  summarizeWork,
} from "../packages/read-models/src/index.js";
import { QueryRouter } from "../apps/gateway/src/index.js";

const OS_MANIFEST = `schema_version: "2.0"
architecture: unified-workspace
`;

const CURRENT = `# Current Workspace Context

## Objective

Ship the release.

## Current state

Facts only.

## Next useful actions

- land the fix
- verify green

## Constraints / approvals

- confirm external actions
`;

function makeOs(label: string): { root: string; reg: SystemRegistry; systemId: string } {
  const root = mkdtempSync(join(tmpdir(), `dash-rm-${label}-`));
  writeFileSync(join(root, "AI-VERSE.yaml"), OS_MANIFEST);
  writeFileSync(join(root, "AGENTS.md"), "# agents\n");
  for (const d of ["operator", "workspaces", "system"]) mkdirSync(join(root, d));
  const reg = new SystemRegistry();
  const rec = reg.register(root, { label });
  return { root, reg, systemId: rec.systemId };
}

function makeWorkspace(osRoot: string, id: string): string {
  const dir = join(osRoot, "workspaces", id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "WORKSPACE.yaml"),
    `schema_version: "2.0"\nid: "${id}"\nname: "${id} name"\nstatus: "active"\n`,
  );
  mkdirSync(join(dir, "context"), { recursive: true });
  writeFileSync(join(dir, "context", "CURRENT.md"), CURRENT);
  mkdirSync(join(dir, "memory"), { recursive: true });
  writeFileSync(join(dir, "memory", "MEMORY.md"), "# memory\n");
  mkdirSync(join(dir, "decisions"), { recursive: true });
  writeFileSync(join(dir, "decisions", "log.md"), "# log\n");
  mkdirSync(join(dir, "inbox"), { recursive: true });
  writeFileSync(join(dir, "inbox", "triage-note.md"), "# triage\n");
  return dir;
}

describe("read models Task 6: health + work + inbox + now", () => {
  const roots: string[] = [];
  afterEach(() => {
    for (const r of roots.splice(0)) {
      try {
        rmSync(r, { recursive: true, force: true });
      } catch { /* ignore */ }
    }
  });

  it("health is generic with evidence and freshness; missing is unknown", () => {
    const report = buildHealthReport("aiverse-01", "ws-1", [
      {
        id: "manifest",
        label: "Manifest",
        status: "healthy",
        summary: "ok",
        evidence: [],
        checks: [],
        sourceModifiedAt: new Date().toISOString(),
      },
      {
        id: "context",
        label: "Context",
        status: "warning",
        summary: "aging",
        evidence: [],
        checks: [],
      },
    ]);
    assert.equal(report.overall, "warning");
    assert.equal(report.dimensions[0].freshness, "fresh");
    assert.equal(report.dimensions[1].freshness, "unknown");
    assert.equal(assessFreshness(new Date(Date.now() - 20 * 60 * 1000).toISOString(), Date.now()), "stale");
    const empty = buildHealthReport("aiverse-01", "ws-1", []);
    assert.equal(empty.overall, "unknown");
  });

  it("work normalizes fail-closed and summarizes attention", () => {
    const a = normalizeWorkItem("aiverse-01", "ws-1", {
      id: "t-1",
      title: "Ship",
      status: "running",
      kind: "task",
    });
    const b = normalizeWorkItem("aiverse-01", "ws-1", {
      id: "t-2",
      title: "Blocked dep",
      status: "blocked",
      kind: "task",
      attentionRequired: true,
    });
    assert.throws(() => normalizeWorkItem("aiverse-01", "ws-1", { id: "x", title: "T", status: "nope" }), /bad work status/);
    const summary = summarizeWork("aiverse-01", "ws-1", [a, b]);
    assert.equal(summary.active.length, 1);
    assert.equal(summary.blocked.length, 1);
    assert.equal(summary.attention.length, 1);
    assert.throws(
      () => summarizeWork("aiverse-02", "ws-1", [a]),
      /crossed system\/workspace boundary/,
    );
  });

  it("inbox normalizes and sorts severity-first", () => {
    const info = normalizeInboxItem("aiverse-01", "ws-1", {
      id: "i-1",
      kind: "review",
      severity: "info",
      title: "Note",
      createdAt: "2026-09-12T00:00:00Z",
      source: { kind: "workspace-file", path: "inbox/note.md" },
    });
    const crit = normalizeInboxItem("aiverse-01", "ws-1", {
      id: "i-2",
      kind: "approval",
      severity: "critical",
      title: "Approve",
      createdAt: "2026-09-12T01:00:00Z",
      source: { kind: "workspace-file", path: "inbox/a.md" },
    });
    assert.deepEqual(sortInbox([info, crit]).map((i) => i.id), ["i-2", "i-1"]);
    assert.throws(
      () => normalizeInboxItem("aiverse-01", "ws-1", { ...info, kind: "nope" }),
      /bad inbox kind/,
    );
  });

  it("workspace projections read canonical files; inbox lists files; A never reads B", () => {
    const a = makeOs("a");
    const b = makeOs("b");
    roots.push(a.root, b.root);
    makeWorkspace(a.root, "ws-1");
    makeWorkspace(b.root, "only-b");

    const router = new QueryRouter(a.reg, new DisposableCache());
    const health = router.handle({
      type: "req", v: "1.0", id: "h", method: "workspace.health",
      systemId: a.systemId, workspaceId: "ws-1",
    });
    assert.equal(health.ok, true);
    const dims = (
      health.result as { health: { overall: string; dimensions: { id: string }[] } }
    ).health;
    assert.ok(dims.dimensions.some((d) => d.id === "manifest"));
    assert.ok(dims.dimensions.some((d) => d.id === "context"));

    const inbox = router.handle({
      type: "req", v: "1.0", id: "i", method: "workspace.inbox.list",
      systemId: a.systemId, workspaceId: "ws-1",
    });
    assert.equal(inbox.ok, true);
    const items = (inbox.result as { items: { title: string }[] }).items;
    assert.ok(items.some((x) => x.title === "triage-note.md"));

    const tasks = router.handle({
      type: "req", v: "1.0", id: "t", method: "task.list",
      systemId: a.systemId, workspaceId: "ws-1",
    });
    assert.equal(tasks.ok, true);
    const now = (tasks.result as { now: { systemId: string; healthUnavailable: boolean } }).now;
    assert.equal(now.systemId, a.systemId);
    assert.equal(now.healthUnavailable, false);

    // B's workspace id is unknown to A's registry: fail, not fallback.
    const miss = router.handle({
      type: "req", v: "1.0", id: "m", method: "workspace.health",
      systemId: a.systemId, workspaceId: "only-b",
    });
    assert.equal(miss.ok, false);
  });

  it("now model caps to 5 running / 5 attention with provenance", () => {
    const items = Array.from({ length: 8 }, (_, i) =>
      normalizeWorkItem("aiverse-01", "ws-1", {
        id: `t-${i}`,
        title: `Task ${i}`,
        status: "running",
        kind: "task",
      }),
    );
    const summary = summarizeWork("aiverse-01", "ws-1", items);
    const now = buildNowModel({
      systemId: "aiverse-01",
      workspaceId: "ws-1",
      focus: null,
      work: summary,
      inbox: null,
      health: null,
    });
    assert.equal(now.running.length, 5);
    assert.equal(now.focusUnavailable, true);
    assert.equal(now.healthUnavailable, true);
    assert.equal(now.provenance.systemId, "aiverse-01");
    void buildWorkspaceProjections;
  });
});
