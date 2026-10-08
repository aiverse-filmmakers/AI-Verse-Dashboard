import { existsSync, lstatSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import type { SystemRegistry } from "../../registry/src/registry.js";
import { getWorkspace } from "./workspace.js";

const PURPOSE_MAX_BYTES = 16 * 1024;
const PURPOSE_PROCESS_MAX_BUFFER = 128 * 1024;
const PURPOSE_TIMEOUT_MS = 5_000;

export interface PurposeProjection {
  schema_version: string;
  scope: string;
  scope_kind: string;
  purpose?: { missions?: Record<string, unknown>[]; desired_outcomes?: Record<string, unknown>[] };
  goals?: Record<string, unknown>[];
  provenance: {
    projection_owner: string;
    generated_at: string;
    owner_reads?: unknown[];
    profile?: unknown;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

function unavailable(message: string): Error & { code: string } {
  return Object.assign(new Error(message), { code: "PURPOSE_UNAVAILABLE" });
}

/**
 * Read the disposable OS-owned Purpose projection for one registered workspace.
 * The Dashboard never parses Brain/Data/Memory private stores and never caches
 * this result. Each call re-enters the selected OS's canonical read surface.
 * KPI relevance is declared to OS; OS remains responsible for profile choice.
 */
export function readPurposeProjection(
  registry: SystemRegistry,
  systemId: string,
  workspaceId: string,
): PurposeProjection {
  getWorkspace(registry, systemId, workspaceId);
  const root = registry.resolveRoot(systemId);
  const script = join(root, "scripts", "purpose-context.mjs");
  if (!existsSync(script)) throw unavailable("registered OS has no Purpose read surface");
  const st = lstatSync(script);
  if (!st.isFile() || st.isSymbolicLink()) throw unavailable("Purpose read surface is unsafe");

  const scope = `workspace:${workspaceId}`;
  const proc = spawnSync(
    process.execPath,
    [
      script,
      "read",
      "--root",
      root,
      "--scope",
      scope,
      "--profile",
      "auto",
      "--relevant-domain",
      "kpis",
      "--max-bytes",
      String(PURPOSE_MAX_BYTES),
    ],
    {
      encoding: "utf8",
      timeout: PURPOSE_TIMEOUT_MS,
      maxBuffer: PURPOSE_PROCESS_MAX_BUFFER,
      shell: false,
    },
  );

  if (proc.error) throw unavailable(`Purpose read failed: ${proc.error.message}`);
  if (proc.status !== 0) {
    const detail = String(proc.stderr || proc.stdout || `exit ${String(proc.status)}`).trim();
    throw unavailable(`Purpose read failed: ${detail.slice(0, 500)}`);
  }

  let value: unknown;
  try {
    value = JSON.parse(proc.stdout);
  } catch {
    throw unavailable("Purpose read returned invalid JSON");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw unavailable("Purpose read returned a non-object projection");
  }
  const projection = value as PurposeProjection;
  if (
    projection.scope !== scope ||
    projection.scope_kind !== "workspace" ||
    projection.provenance?.projection_owner !== "ai-verse-os" ||
    typeof projection.provenance?.generated_at !== "string"
  ) {
    throw unavailable("Purpose projection failed scope/owner validation");
  }
  return projection;
}
