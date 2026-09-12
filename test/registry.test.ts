import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  REGISTRY_ERRORS,
  SystemRegistry,
  SelectionStore,
  toPublic,
  validateCompatibleOs,
} from "../packages/registry/src/index.js";

const VALID_MANIFEST = `schema_version: "2.0"
architecture: unified-workspace
`;

function makeOsRoot(overrides?: { manifest?: string; skip?: string[] }): string {
  const root = mkdtempSync(join(tmpdir(), "dash-reg-"));
  const skip = new Set(overrides?.skip ?? []);
  if (!skip.has("manifest")) {
    writeFileSync(join(root, "AI-VERSE.yaml"), overrides?.manifest ?? VALID_MANIFEST);
  }
  if (!skip.has("AGENTS.md")) writeFileSync(join(root, "AGENTS.md"), "# agents\n");
  for (const dir of ["operator", "workspaces", "system"]) {
    if (!skip.has(dir)) mkdirSync(join(root, dir));
  }
  return root;
}

describe("registry Task 2: compatible-OS validation + systemId map + selection", () => {
  let roots: string[] = [];
  const track = (r: string): string => {
    roots.push(r);
    return r;
  };

  afterEach(() => {
    for (const r of roots) {
      try {
        rmSync(r, { recursive: true, force: true });
      } catch { /* ignore */ }
    }
    roots = [];
  });

  it("accepts a compatible OS root, rejects incompatible shapes", () => {
    const ok = validateCompatibleOs(track(makeOsRoot()));
    assert.equal(ok.compatible, true);
    assert.equal(ok.osType, "ai-verse-os-v2");
    assert.equal(ok.osVersion, "2.0");
    assert.deepEqual(ok.reasons, []);

    const missing = validateCompatibleOs(track(makeOsRoot({ skip: ["manifest"] })));
    assert.equal(missing.compatible, false);

    const badVer = validateCompatibleOs(
      track(makeOsRoot({ manifest: 'schema_version: "1.5"\narchitecture: unified-workspace\n' })),
    );
    assert.equal(badVer.compatible, false);

    const badArch = validateCompatibleOs(
      track(makeOsRoot({ manifest: 'schema_version: "2.0"\narchitecture: legacy\n' })),
    );
    assert.equal(badArch.compatible, false);

    const noAgents = validateCompatibleOs(track(makeOsRoot({ skip: ["AGENTS.md"] })));
    assert.equal(noAgents.compatible, false);

    const absent = validateCompatibleOs(join(tmpdir(), "dash-reg-does-not-exist-xyz"));
    assert.equal(absent.compatible, false);
  });

  it("register maps stable systemId to canonical root; duplicates/overlaps fail", () => {
    const reg = new SystemRegistry();
    const root = track(makeOsRoot());
    const rec = reg.register(root, { label: "House A" });
    assert.equal(rec.systemId, "aiverse-01");
    assert.equal(rec.label, "House A");
    assert.equal(rec.authorized, true);

    assert.throws(() => reg.register(root), (e: Error & { code: string }) => {
      assert.equal(e.code, REGISTRY_ERRORS.SYSTEM_DUPLICATE);
      return true;
    });

    const nested = join(root, "nested-os");
    mkdirSync(nested);
    writeFileSync(join(nested, "AI-VERSE.yaml"), VALID_MANIFEST);
    writeFileSync(join(nested, "AGENTS.md"), "# agents\n");
    for (const dir of ["operator", "workspaces", "system"]) {
      mkdirSync(join(nested, dir));
    }
    roots.push(nested);
    assert.throws(() => reg.register(nested), (e: Error & { code: string }) => {
      assert.equal(e.code, REGISTRY_ERRORS.SYSTEM_OVERLAP);
      return true;
    });

    const custom = reg.register(track(makeOsRoot()), { systemId: "cabin-7", label: "Cabin" });
    assert.equal(custom.systemId, "cabin-7");
    assert.throws(
      () => reg.register(track(makeOsRoot()), { systemId: "BAD ID" }),
      (e: Error & { code: string }) => e.code === REGISTRY_ERRORS.INVALID_ID,
    );
  });

  it("resolveRoot fails closed with no fallback; public view hides root", () => {
    const reg = new SystemRegistry();
    const rec = reg.register(track(makeOsRoot()));
    assert.equal(reg.resolveRoot(rec.systemId), rec.root);
    assert.throws(
      () => reg.resolveRoot("aiverse-99"),
      (e: Error & { code: string }) => e.code === REGISTRY_ERRORS.SYSTEM_NOT_REGISTERED,
    );
    const pub = toPublic(rec);
    assert.ok(!("root" in pub));
    assert.equal(pub.systemId, rec.systemId);
  });

  it("per-window selection is independent; unknown systems rejected", () => {
    const reg = new SystemRegistry();
    const a = reg.register(track(makeOsRoot()));
    const b = reg.register(track(makeOsRoot()));
    const sel = new SelectionStore(reg);

    sel.set("win-1", { systemId: a.systemId, workspaceId: "ws-1" });
    sel.set("win-2", { systemId: b.systemId });
    assert.deepEqual(sel.get("win-1"), { systemId: a.systemId, workspaceId: "ws-1" });
    assert.deepEqual(sel.get("win-2"), { systemId: b.systemId });

    // Retargeting win-1 does not move win-2 (detached panels keep scope).
    sel.set("win-1", { systemId: b.systemId });
    assert.deepEqual(sel.get("win-2"), { systemId: b.systemId });

    assert.throws(
      () => sel.set("win-3", { systemId: "aiverse-99" }),
      (e: Error & { code: string }) => e.code === REGISTRY_ERRORS.SYSTEM_NOT_REGISTERED,
    );
    assert.throws(
      () => sel.set("win-3", { systemId: a.systemId, workspaceId: "bad/ws" }),
      (e: Error & { code: string }) => e.code === REGISTRY_ERRORS.INVALID_ID,
    );
  });

  it("live OS root passes validation (read-only probe)", () => {
    const live = "/home/hermes/ai-verse-dev/AI-Verse-OS";
    const compat = validateCompatibleOs(live);
    assert.equal(compat.compatible, true);
    assert.equal(compat.osType, "ai-verse-os-v2");
  });
});
