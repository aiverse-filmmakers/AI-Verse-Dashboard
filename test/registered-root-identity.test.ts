import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  REGISTRY_ERRORS,
  SystemRegistry,
  toPublic,
} from "../packages/registry/src/index.js";
import {
  ADAPTER_ERRORS,
  resolveWorkspaceRoot,
} from "../packages/os-read-adapter/src/index.js";

const MANIFEST = `schema_version: "2.0"
architecture: unified-workspace
`;

function populateOs(root: string, marker: string): void {
  mkdirSync(root, { recursive: true });
  writeFileSync(join(root, "AI-VERSE.yaml"), MANIFEST);
  writeFileSync(join(root, "AGENTS.md"), `# agents ${marker}\n`);
  for (const dir of ["operator", "workspaces", "system"]) {
    mkdirSync(join(root, dir), { recursive: true });
  }
  const workspace = join(root, "workspaces", "shared");
  mkdirSync(workspace, { recursive: true });
  writeFileSync(
    join(workspace, "WORKSPACE.yaml"),
    `schema_version: "2.0"\nid: "shared"\nname: "${marker}"\nstatus: "active"\n`,
  );
  writeFileSync(join(workspace, "STATE.md"), `# ${marker}\n`);
}

function fixture(label: string): { parent: string; root: string } {
  const parent = mkdtempSync(join(tmpdir(), `dash-root-id-${label}-`));
  const root = join(parent, "registered");
  populateOs(root, `${label}-approved`);
  return { parent, root };
}

describe("WSA-2026-039 registered-root identity binding", () => {
  const parents: string[] = [];

  afterEach(() => {
    for (const parent of parents.splice(0)) {
      try {
        rmSync(parent, { recursive: true, force: true });
      } catch {
        // best-effort cleanup
      }
    }
  });

  it("binds systemId to filesystem identity and keeps privileged identity out of public views", () => {
    const { parent, root } = fixture("identity");
    parents.push(parent);
    const registry = new SystemRegistry();
    const record = registry.register(root, { label: "Approved" });

    assert.equal(record.authorized, true);
    assert.equal(record.identityDrifted, false);
    assert.equal(record.rootIdentity.realpath, record.root);
    assert.ok(record.rootIdentity.device.length > 0);
    assert.ok(record.rootIdentity.inode.length > 0);

    const publicRecord = toPublic(record) as unknown as Record<string, unknown>;
    assert.equal("root" in publicRecord, false);
    assert.equal("rootIdentity" in publicRecord, false);
    assert.equal("identityDrifted" in publicRecord, false);
  });

  it("detects same-path replacement, marks the system unauthorized, and requires explicit rebind", () => {
    const { parent, root } = fixture("replace");
    parents.push(parent);
    const moved = join(parent, "approved-moved");

    const registry = new SystemRegistry();
    const record = registry.register(root);
    const originalIdentity = record.rootIdentity;

    renameSync(root, moved);
    populateOs(root, "replacement");

    assert.throws(
      () => registry.resolveRoot(record.systemId),
      (err: Error & { code?: string }) => err.code === REGISTRY_ERRORS.SYSTEM_IDENTITY_DRIFT,
    );

    const drifted = registry.get(record.systemId);
    assert.equal(drifted?.authorized, false);
    assert.equal(drifted?.identityDrifted, true);

    const revalidated = registry.revalidate(record.systemId);
    assert.equal(revalidated.compatible, false);
    assert.match(revalidated.reasons.join(" "), /explicit rebind required/);
    assert.equal(registry.get(record.systemId)?.authorized, false);

    assert.throws(
      () => registry.resolveRoot(record.systemId),
      (err: Error & { code?: string }) => err.code === REGISTRY_ERRORS.SYSTEM_UNAUTHORIZED,
    );

    const rebound = registry.rebind(record.systemId, root);
    assert.equal(rebound.systemId, record.systemId);
    assert.equal(rebound.authorized, true);
    assert.equal(rebound.identityDrifted, false);
    assert.notDeepEqual(rebound.rootIdentity, originalIdentity);
    assert.equal(registry.resolveRoot(record.systemId), rebound.root);
  });

  it("detects a renamed approved root before any workspace read", () => {
    const { parent, root } = fixture("rename");
    parents.push(parent);
    const moved = join(parent, "renamed-approved");

    const registry = new SystemRegistry();
    const record = registry.register(root);
    renameSync(root, moved);

    assert.throws(
      () => resolveWorkspaceRoot(registry, record.systemId, "shared"),
      (err: Error & { code?: string }) => err.code === ADAPTER_ERRORS.UNKNOWN_SYSTEM,
    );

    const drifted = registry.get(record.systemId);
    assert.equal(drifted?.authorized, false);
    assert.equal(drifted?.identityDrifted, true);
  });

  it("detects symlink or junction redirection instead of following a new compatible tree", () => {
    const { parent, root } = fixture("symlink");
    parents.push(parent);
    const moved = join(parent, "approved-moved");
    const replacement = join(parent, "replacement");
    populateOs(replacement, "replacement");

    const registry = new SystemRegistry();
    const record = registry.register(root);

    renameSync(root, moved);
    symlinkSync(
      replacement,
      root,
      process.platform === "win32" ? "junction" : "dir",
    );

    assert.throws(
      () => registry.resolveRoot(record.systemId),
      (err: Error & { code?: string }) => err.code === REGISTRY_ERRORS.SYSTEM_IDENTITY_DRIFT,
    );

    const drifted = registry.get(record.systemId);
    assert.equal(drifted?.authorized, false);
    assert.equal(drifted?.identityDrifted, true);
    assert.notEqual(drifted?.rootIdentity.realpath, replacement);
  });

  it("never serves replacement workspace content until that replacement is explicitly rebound", () => {
    const { parent, root } = fixture("read-fence");
    parents.push(parent);
    const moved = join(parent, "approved-moved");

    const registry = new SystemRegistry();
    const record = registry.register(root);

    renameSync(root, moved);
    populateOs(root, "replacement-secret");

    assert.throws(
      () => resolveWorkspaceRoot(registry, record.systemId, "shared"),
      (err: Error & { code?: string }) => err.code === ADAPTER_ERRORS.UNKNOWN_SYSTEM,
    );
    assert.equal(registry.get(record.systemId)?.authorized, false);

    registry.rebind(record.systemId, root);
    const replacementWorkspace = resolveWorkspaceRoot(registry, record.systemId, "shared");
    assert.equal(replacementWorkspace, join(root, "workspaces", "shared"));
  });
});
