import { realpathSync, statSync } from "node:fs";
import { join, normalize, sep } from "node:path";
import { workspaceIdSchema } from "../../protocol/src/index.js";
import type { SystemRegistry } from "../../registry/src/registry.js";

/**
 * Server-side path resolution (Task 3, Blueprint Rules 2-3).
 * systemId resolves via the approved registry; workspaceId resolves to
 * <osRoot>/workspaces/<workspaceId>; relative sources resolve inside that
 * workspace boundary. Anything else fails closed.
 */

export const ADAPTER_ERRORS = {
  UNKNOWN_SYSTEM: "UNKNOWN_SYSTEM",
  UNKNOWN_WORKSPACE: "UNKNOWN_WORKSPACE",
  MANIFEST_MISMATCH: "MANIFEST_MISMATCH",
  TRAVERSAL_REJECTED: "TRAVERSAL_REJECTED",
  ABSOLUTE_REJECTED: "ABSOLUTE_REJECTED",
  ESCAPE_REJECTED: "ESCAPE_REJECTED",
  NOT_FOUND: "NOT_FOUND",
  NOT_FILE: "NOT_FILE",
  TOO_LARGE: "TOO_LARGE",
  UNSUPPORTED_TYPE: "UNSUPPORTED_TYPE",
  UNREADABLE: "UNREADABLE",
  QUERY_REJECTED: "QUERY_REJECTED",
  TABLE_UNKNOWN: "TABLE_UNKNOWN",
} as const;

export type AdapterErrorCode =
  (typeof ADAPTER_ERRORS)[keyof typeof ADAPTER_ERRORS];

export function adapterError(code: AdapterErrorCode, message: string): Error & { code: AdapterErrorCode } {
  const err = new Error(message) as Error & { code: AdapterErrorCode };
  err.code = code;
  return err;
}

const WINDOWS_DRIVE_RE = /^[A-Za-z]:[\\/]/;
const NUL_RE = /\0/;

/** Reject absolute / drive / UNC / NUL logical paths before joining. */
export function assertRelativeLogical(relative: string): void {
  if (typeof relative !== "string" || relative.length === 0 || relative.length > 512) {
    throw adapterError(ADAPTER_ERRORS.TRAVERSAL_REJECTED, `bad relative path: ${relative}`);
  }
  if (NUL_RE.test(relative)) {
    throw adapterError(ADAPTER_ERRORS.TRAVERSAL_REJECTED, "NUL byte in path");
  }
  if (
    relative.startsWith("/") ||
    relative.startsWith("\\") ||
    WINDOWS_DRIVE_RE.test(relative) ||
    relative.startsWith("\\\\")
  ) {
    throw adapterError(ADAPTER_ERRORS.ABSOLUTE_REJECTED, `absolute path rejected: ${relative}`);
  }
  const parts = relative.split(/[\\/]/);
  for (const p of parts) {
    if (p === ".." || p === "" ) {
      throw adapterError(ADAPTER_ERRORS.TRAVERSAL_REJECTED, `traversal segment in: ${relative}`);
    }
  }
}

export function isWithin(child: string, parent: string): boolean {
  return child === parent || child.startsWith(parent + sep);
}

/**
 * Resolve the canonical workspace root for (systemId, workspaceId).
 * Returns the realpath. Workspace dir must exist; WORKSPACE.yaml id is
 * verified by getWorkspace(), not here (listing tolerates template dirs).
 */
export function resolveWorkspaceRoot(
  registry: SystemRegistry,
  systemId: string,
  workspaceId: string,
): string {
  if (!workspaceIdSchema.safeParse(workspaceId).success) {
    throw adapterError(ADAPTER_ERRORS.UNKNOWN_WORKSPACE, `invalid workspaceId ${workspaceId}`);
  }
  let osRoot: string;
  try {
    osRoot = registry.resolveRoot(systemId);
  } catch {
    throw adapterError(ADAPTER_ERRORS.UNKNOWN_SYSTEM, `unknown or unauthorized systemId ${systemId}`);
  }
  const joined = normalize(join(osRoot, "workspaces", workspaceId));
  let real: string;
  try {
    const st = statSync(joined);
    if (!st.isDirectory()) {
      throw adapterError(ADAPTER_ERRORS.UNKNOWN_WORKSPACE, `workspace is not a directory: ${workspaceId}`);
    }
    real = realpathSync(joined);
  } catch (err) {
    if ((err as { code?: string }).code?.startsWith("ADAPTER_")) throw err;
    throw adapterError(ADAPTER_ERRORS.UNKNOWN_WORKSPACE, `workspace not found: ${workspaceId}`);
  }
  const osReal = realpathSync(osRoot);
  if (!isWithin(real, osReal)) {
    throw adapterError(ADAPTER_ERRORS.ESCAPE_REJECTED, `workspace escapes OS root: ${workspaceId}`);
  }
  return real;
}

/**
 * Resolve a logical relative source inside an already-resolved workspace
 * root realpath. Returns the target realpath; symlinks escaping the
 * workspace boundary are rejected.
 */
export function resolveWithinWorkspace(workspaceRootReal: string, relative: string): string {
  assertRelativeLogical(relative);
  const joined = normalize(join(workspaceRootReal, relative));
  if (!isWithin(joined, workspaceRootReal)) {
    throw adapterError(ADAPTER_ERRORS.TRAVERSAL_REJECTED, `joined path escapes workspace: ${relative}`);
  }
  let real: string;
  try {
    real = realpathSync(joined);
  } catch {
    throw adapterError(ADAPTER_ERRORS.NOT_FOUND, `source not found: ${relative}`);
  }
  if (!isWithin(real, workspaceRootReal)) {
    throw adapterError(ADAPTER_ERRORS.ESCAPE_REJECTED, `symlink escapes workspace: ${relative}`);
  }
  return real;
}
