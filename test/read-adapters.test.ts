import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { SystemRegistry } from "../packages/registry/src/index.js";
import {
  ADAPTER_ERRORS,
  DisposableCache,
  getWorkspace,
  listWorkspaces,
  openReadOnly,
  readMarkdownFile,
  resolveWorkspaceRoot,
} from "../packages/os-read-adapter/src/index.js";

const OS_MANIFEST = `schema_version: "2.0"
architecture: unified-workspace
`;

function makeOs(label: string): { root: string; reg: SystemRegistry; systemId: string } {
  const root = mkdtempSync(join(tmpdir(), `dash-ad-${label}-`));
  writeFileSync(join(root, "AI-VERSE.yaml"), OS_MANIFEST);
  writeFileSync(join(root, "AGENTS.md"), "# agents\n");
  for (const d of ["operator", "workspaces", "system"]) mkdirSync(join(root, d));
  const reg = new SystemRegistry();
  const rec = reg.register(root, { label });
  return { root, reg, systemId: rec.systemId };
}

function makeWorkspace(osRoot: string, id: string, files?: Record<string, string>): string {
  const dir = join(osRoot, "workspaces", id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "WORKSPACE.yaml"),
    `schema_version: "2.0"\nid: "${id}"\nname: "${id} name"\nstatus: "active"\n`,
  );
  if (files) {
    for (const [rel, content] of Object.entries(files)) {
      writeFileSync(join(dir, rel), content);
    }
  }
  return dir;
}

describe("read adapters Task 3: Markdown + SQLite + workspace + cache", () => {
  const roots: string[] = [];
  afterEach(() => {
    for (const r of roots) {
      try {
        rmSync(r, { recursive: true, force: true });
      } catch { /* ignore */ }
    }
    roots.length = 0;
  });

  it("markdown projection carries provenance and never absolute paths", () => {
    const { root, reg, systemId } = makeOs("a");
    roots.push(root);
    makeWorkspace(root, "ws-1", {
      "STATE.md": "---\ntitle: State\n---\n\n# hello\n",
    });
    const wsRoot = resolveWorkspaceRoot(reg, systemId, "ws-1");
    const proj = readMarkdownFile(wsRoot, "STATE.md");
    assert.equal(proj.path, "STATE.md");
    assert.equal(proj.frontmatter.title, "State");
    assert.match(proj.body, /hello/);
    assert.equal(proj.canonical, true);
    assert.ok(proj.sha256.length === 64);
    assert.ok(!proj.path.startsWith("/"));
  });

  it("traversal, absolute, and symlink escapes fail closed", () => {
    const { root, reg, systemId } = makeOs("b");
    roots.push(root);
    const outside = mkdtempSync(join(tmpdir(), "dash-outside-"));
    roots.push(outside);
    writeFileSync(join(outside, "secret.md"), "secret");
    makeWorkspace(root, "ws-1", { "ok.md": "fine" });
    const wsRoot = resolveWorkspaceRoot(reg, systemId, "ws-1");
    symlinkSync(join(outside, "secret.md"), join(root, "workspaces", "ws-1", "evil.md"));

    for (const bad of ["../x.md", "..\\x.md", "/etc/passwd", "C:\\win\\x.md", "\\\\srv\\s", "a/../../b.md"]) {
      assert.throws(() => readMarkdownFile(wsRoot, bad), /./, bad);
    }
    assert.throws(
      () => readMarkdownFile(wsRoot, "evil.md"),
      (e: Error & { code: string }) => e.code === ADAPTER_ERRORS.ESCAPE_REJECTED,
    );
    assert.throws(
      () => resolveWorkspaceRoot(reg, systemId, "../ws-1"),
      (e: Error & { code: string }) => e.code === ADAPTER_ERRORS.UNKNOWN_WORKSPACE,
    );
  });

  it("workspace list + get verify manifest identity, no roots leak", () => {
    const { root, reg, systemId } = makeOs("c");
    roots.push(root);
    makeWorkspace(root, "alpha");
    makeWorkspace(root, "beta");
    const list = listWorkspaces(reg, systemId);
    assert.deepEqual(list.map((w) => w.id), ["alpha", "beta"]);
    for (const w of list) assert.ok(!("root" in w));
    const got = getWorkspace(reg, systemId, "alpha");
    assert.equal(got.summary.id, "alpha");
    assert.throws(
      () => getWorkspace(reg, systemId, "missing"),
      (e: Error & { code: string }) => e.code === ADAPTER_ERRORS.UNKNOWN_WORKSPACE,
    );
  });

  it("sqlite opens read-only: table reads work, writes and DDL rejected", () => {
    const { root, reg, systemId } = makeOs("d");
    roots.push(root);
    const dir = makeWorkspace(root, "ws-1");
    const dbPath = join(dir, "index.sqlite");
    const seed = new DatabaseSync(dbPath);
    seed.exec("CREATE TABLE tasks(id TEXT PRIMARY KEY, title TEXT)");
    seed.prepare("INSERT INTO tasks VALUES (?, ?)").run("t-1", "First");
    seed.close();

    const wsRoot = resolveWorkspaceRoot(reg, systemId, "ws-1");
    const h = openReadOnly(wsRoot, "index.sqlite");
    try {
      assert.deepEqual(h.tables(), ["tasks"]);
      const rows = h.queryTable("tasks");
      assert.equal(rows.length, 1);
      assert.equal((rows[0] as { id: string }).id, "t-1");
      assert.throws(
        () => h.queryAll("DROP TABLE tasks"),
        (e: Error & { code: string }) => e.code === ADAPTER_ERRORS.QUERY_REJECTED,
      );
      assert.throws(
        () => h.queryAll("INSERT INTO tasks VALUES ('x','y')"),
        (e: Error & { code: string }) => e.code === ADAPTER_ERRORS.QUERY_REJECTED,
      );
      assert.throws(
        () => h.queryTable("nope"),
        (e: Error & { code: string }) => e.code === ADAPTER_ERRORS.TABLE_UNKNOWN,
      );
      assert.throws(
        () => h.queryTable("tasks", { limit: 99999 }),
        (e: Error & { code: string }) => e.code === ADAPTER_ERRORS.QUERY_REJECTED,
      );
    } finally {
      h.close();
    }
  });

  it("missing in A never falls back to B", () => {
    const a = makeOs("e1");
    const b = makeOs("e2");
    roots.push(a.root, b.root);
    makeWorkspace(b.root, "shared", { "STATE.md": "from B" });
    // A has no such workspace: must fail, not serve B's copy.
    assert.throws(
      () => getWorkspace(a.reg, a.systemId, "shared"),
      (e: Error & { code: string }) => e.code === ADAPTER_ERRORS.UNKNOWN_WORKSPACE,
    );
    const bWs = getWorkspace(b.reg, b.systemId, "shared");
    assert.equal(bWs.summary.id, "shared");
  });

  it("cache is partitioned by systemId and invalidates cleanly", () => {
    const cache = new DisposableCache();
    cache.putProjection("aiverse-01", "ws-1", "STATE.md", 100, 10, { body: "A" });
    cache.putProjection("aiverse-02", "ws-1", "STATE.md", 100, 10, { body: "B" });
    assert.deepEqual(cache.getProjection("aiverse-01", "ws-1", "STATE.md", 100, 10), { body: "A" });
    assert.deepEqual(cache.getProjection("aiverse-02", "ws-1", "STATE.md", 100, 10), { body: "B" });
    // Stale mtime misses instead of serving old state.
    assert.equal(cache.getProjection("aiverse-01", "ws-1", "STATE.md", 200, 10), undefined);
    const dropped = cache.invalidateSystem("aiverse-01");
    assert.ok(dropped >= 1);
    assert.equal(cache.getProjection("aiverse-01", "ws-1", "STATE.md", 100, 10), undefined);
    assert.deepEqual(cache.getProjection("aiverse-02", "ws-1", "STATE.md", 100, 10), { body: "B" });
  });
});
