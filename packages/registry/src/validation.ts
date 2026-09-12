import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Compatible-OS folder validation (Task 2, Blueprint Rule 2).
 * Read-only checks against a candidate OS root. Never writes.
 */

export const REQUIRED_OS_MAJOR = 2;
export const REQUIRED_ARCHITECTURE = "unified-workspace";
export const OS_TYPE = "ai-verse-os-v2";
export const MAX_MANIFEST_BYTES = 32 * 1024;

export const REGISTRY_ERRORS = {
  OS_NOT_FOUND: "OS_NOT_FOUND",
  OS_NOT_DIRECTORY: "OS_NOT_DIRECTORY",
  OS_INCOMPATIBLE: "OS_INCOMPATIBLE",
  SYSTEM_DUPLICATE: "SYSTEM_DUPLICATE",
  SYSTEM_OVERLAP: "SYSTEM_OVERLAP",
  SYSTEM_NOT_REGISTERED: "SYSTEM_NOT_REGISTERED",
  SYSTEM_UNAUTHORIZED: "SYSTEM_UNAUTHORIZED",
  INVALID_ID: "INVALID_ID",
  WINDOW_REQUIRED: "WINDOW_REQUIRED",
} as const;

export type RegistryErrorCode =
  (typeof REGISTRY_ERRORS)[keyof typeof REGISTRY_ERRORS];

export function registryError(code: RegistryErrorCode, message: string): Error & { code: RegistryErrorCode } {
  const err = new Error(message) as Error & { code: RegistryErrorCode };
  err.code = code;
  return err;
}

export interface OsCompatibility {
  compatible: boolean;
  osType: string | null;
  osVersion: string | null;
  architecture: string | null;
  /** Canonical realpath of the probed root (null when root unusable). */
  root: string | null;
  /** Non-empty when incompatible; empty when compatible. */
  reasons: string[];
}

/**
 * Resolve a candidate root to its canonical realpath.
 * Throws OS_NOT_FOUND / OS_NOT_DIRECTORY. Symlinks resolve to target.
 */
export function canonicalizeRoot(root: string): string {
  let st;
  try {
    st = statSync(root);
  } catch {
    throw registryError(REGISTRY_ERRORS.OS_NOT_FOUND, `OS root not found: ${root}`);
  }
  if (!st.isDirectory()) {
    throw registryError(REGISTRY_ERRORS.OS_NOT_DIRECTORY, `OS root is not a directory: ${root}`);
  }
  return realpathSync(root);
}

/** Extract a top-level `key: value` scalar from a small YAML manifest. */
function topLevelScalar(text: string, key: string): string | null {
  const re = new RegExp(`^${key}\\s*:\\s*["']?([^"'\\s#][^#\\n]*?)?["']?\\s*(?:#.*)?$`, "m");
  const m = re.exec(text);
  if (!m || m[1] === undefined) return null;
  return m[1].trim();
}

function majorOf(version: string): number | null {
  const m = /^(\d+)\./.exec(version.trim());
  return m ? Number(m[1]) : null;
}

/**
 * Read-only compatibility probe. Checks, in order:
 * AI-VERSE.yaml present + parseable, schema_version major 2,
 * architecture unified-workspace, AGENTS.md file, operator/,
 * workspaces/, system/ directories.
 */
export function validateCompatibleOs(candidateRoot: string): OsCompatibility {
  const fail = (
    reasons: string[],
    extra?: Partial<Pick<OsCompatibility, "osVersion" | "architecture" | "root">>,
  ): OsCompatibility => ({
    compatible: false,
    osType: null,
    osVersion: extra?.osVersion ?? null,
    architecture: extra?.architecture ?? null,
    root: extra?.root ?? null,
    reasons,
  });

  let root: string;
  try {
    root = canonicalizeRoot(candidateRoot);
  } catch (err) {
    const code = (err as { code?: string }).code;
    return fail([code === REGISTRY_ERRORS.OS_NOT_DIRECTORY ? "root is not a directory" : "root not found"]);
  }

  const manifestPath = join(root, "AI-VERSE.yaml");
  if (!existsSync(manifestPath)) {
    return fail(["missing AI-VERSE.yaml"], { root });
  }
  let text: string;
  try {
    const st = statSync(manifestPath);
    if (!st.isFile() || st.size > MAX_MANIFEST_BYTES) {
      return fail(["AI-VERSE.yaml unreadable or oversized"], { root });
    }
    text = readFileSync(manifestPath, "utf8");
  } catch {
    return fail(["AI-VERSE.yaml unreadable"], { root });
  }

  const version = topLevelScalar(text, "schema_version");
  const architecture = topLevelScalar(text, "architecture");
  if (!version) {
    return fail(["AI-VERSE.yaml has no schema_version"], { root, architecture });
  }
  const major = majorOf(version);
  if (major !== REQUIRED_OS_MAJOR) {
    return fail([`unsupported schema_version ${version} (need major ${REQUIRED_OS_MAJOR})`], {
      root,
      osVersion: version,
      architecture,
    });
  }
  if (architecture !== REQUIRED_ARCHITECTURE) {
    return fail([`unsupported architecture ${architecture ?? "missing"} (need ${REQUIRED_ARCHITECTURE})`], {
      root,
      osVersion: version,
      architecture,
    });
  }

  const reasons: string[] = [];
  if (!existsSync(join(root, "AGENTS.md"))) reasons.push("missing AGENTS.md");
  for (const dir of ["operator", "workspaces", "system"]) {
    try {
      if (!statSync(join(root, dir)).isDirectory()) reasons.push(`missing ${dir}/ directory`);
    } catch {
      reasons.push(`missing ${dir}/ directory`);
    }
  }
  if (reasons.length > 0) {
    return fail(reasons, { root, osVersion: version, architecture });
  }
  return {
    compatible: true,
    osType: OS_TYPE,
    osVersion: version,
    architecture,
    root,
    reasons: [],
  };
}
