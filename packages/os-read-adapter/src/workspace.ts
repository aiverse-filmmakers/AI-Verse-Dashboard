import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { SystemRegistry } from "../../registry/src/registry.js";
import {
  ADAPTER_ERRORS,
  adapterError,
  resolveWorkspaceRoot,
} from "./path-resolve.js";

/**
 * Workspace listing over the selected OS (Task 3).
 * Reads <osRoot>/workspaces/<id>/WORKSPACE.yaml id fields.
 * Returns manifest identity only — never absolute roots.
 */

export interface WorkspaceSummary {
  id: string;
  name: string | null;
  status: string | null;
}

function scalar(text: string, key: string): string | null {
  const re = new RegExp(`^${key}\\s*:\\s*["']?([^"'\\s#][^#\\n]*?)?["']?\\s*(?:#.*)?$`, "m");
  const m = re.exec(text);
  return m?.[1]?.trim() ?? null;
}

function readSummary(dir: string, fallbackId: string): WorkspaceSummary | null {
  const manifest = join(dir, "WORKSPACE.yaml");
  if (!existsSync(manifest)) return null;
  let text: string;
  try {
    const st = statSync(manifest);
    if (!st.isFile() || st.size > 32 * 1024) return null;
    text = readFileSync(manifest, "utf8");
  } catch {
    return null;
  }
  const id = scalar(text, "id") ?? fallbackId;
  return { id, name: scalar(text, "name"), status: scalar(text, "status") };
}

export function listWorkspaces(registry: SystemRegistry, systemId: string): WorkspaceSummary[] {
  let osRoot: string;
  try {
    osRoot = registry.resolveRoot(systemId);
  } catch {
    throw adapterError(ADAPTER_ERRORS.UNKNOWN_SYSTEM, `unknown or unauthorized systemId ${systemId}`);
  }
  const base = join(osRoot, "workspaces");
  let entries: string[];
  try {
    entries = readdirSync(base);
  } catch {
    return [];
  }
  const out: WorkspaceSummary[] = [];
  for (const name of entries) {
    if (name.startsWith(".") || name.startsWith("_")) continue;
    const dir = join(base, name);
    try {
      if (!statSync(dir).isDirectory()) continue;
    } catch {
      continue;
    }
    const summary = readSummary(dir, name);
    if (summary) out.push(summary);
  }
  out.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return out;
}

/** Resolve + verify the manifest id matches the requested workspaceId. */
export function getWorkspace(
  registry: SystemRegistry,
  systemId: string,
  workspaceId: string,
): { rootReal: string; summary: WorkspaceSummary } {
  const rootReal = resolveWorkspaceRoot(registry, systemId, workspaceId);
  const summary = readSummary(rootReal, workspaceId);
  if (!summary) {
    throw adapterError(ADAPTER_ERRORS.UNKNOWN_WORKSPACE, `workspace manifest missing: ${workspaceId}`);
  }
  if (summary.id !== workspaceId) {
    throw adapterError(
      ADAPTER_ERRORS.MANIFEST_MISMATCH,
      `manifest id ${summary.id} does not match ${workspaceId}`,
    );
  }
  return { rootReal, summary };
}
