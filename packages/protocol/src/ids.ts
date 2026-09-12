import { z } from "zod";

/**
 * Dashboard protocol version (Task 1, Phase 1).
 * Major is negotiated during handshake; minor changes stay compatible.
 */
export const PROTOCOL_VERSION = "1.0";
export const PROTOCOL_MAJOR = 1;
export const SUPPORTED_MAJORS = [1] as const;

/** Bounded params/result payload: 64 KiB of JSON. */
export const MAX_PARAMS_BYTES = 64 * 1024;

/**
 * systemId: stable Dashboard-local connection id, never a filesystem path.
 * Lowercase slug so traversal, slashes, drive letters, and UNC cannot parse.
 */
export const SYSTEM_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

/**
 * workspaceId: canonical workspace id inside the selected OS, never a path.
 * Same shape family as Data-side workspace ids; no slashes or dots segments.
 */
export const WORKSPACE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-_]{0,63}$/;

/**
 * panelId: Dashboard-owned panel identity (shell amendment §3).
 * Lowercase slug so traversal and paths cannot parse. Panels are
 * presentation-only; the id never grants OS authority.
 */
export const PANEL_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

/** Panel presentation modes: full | compact | hud (shell amendment §3). */
export const PRESENTATIONS = ["full", "compact", "hud"] as const;
export type Presentation = (typeof PRESENTATIONS)[number];

export const systemIdSchema = z
  .string()
  .regex(SYSTEM_ID_PATTERN, "systemId must be a lowercase slug (a-z, 0-9, dash), 1-64 chars");

export const workspaceIdSchema = z
  .string()
  .regex(
    WORKSPACE_ID_PATTERN,
    "workspaceId must be alphanumeric with dash/underscore, 1-64 chars",
  );

export const panelIdSchema = z
  .string()
  .regex(
    PANEL_ID_PATTERN,
    "panelId must be a lowercase slug (a-z, 0-9, dash), 1-64 chars",
  );

export const presentationSchema = z.enum(PRESENTATIONS);

export type SystemId = z.infer<typeof systemIdSchema>;
export type WorkspaceId = z.infer<typeof workspaceIdSchema>;
export type PanelId = z.infer<typeof panelIdSchema>;

/**
 * Param keys that would smuggle a raw filesystem root through the protocol.
 * Clients send IDs only; the Gateway resolves systemId via its approved
 * registry and workspaceId via the selected OS registry (Task 2+).
 * Compared case-insensitively at any depth of params.
 */
const FORBIDDEN_ROOT_KEYS = new Set([
  "root",
  "fsroot",
  "osroot",
  "approot",
  "systemroot",
  "rootpath",
  "basepath",
  "filepath",
  "absolutepath",
  "absoluteroot",
  "dir",
  "directory",
  "databasedirectory",
  "databasepath",
]);

export interface NoRootsCheck {
  ok: boolean;
  /** Dot path of the first offending key, when rejected. */
  at?: string;
}

/** Recursively reject forbidden root-like keys inside params. Depth-capped. */
export function checkNoRawRoots(params: unknown): NoRootsCheck {
  const seen = new Set<unknown>();
  const visit = (value: unknown, path: string, depth: number): string | null => {
    if (depth > 8) return null;
    if (value === null || typeof value !== "object") return null;
    if (seen.has(value)) return null;
    seen.add(value);
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const hit = visit(value[i], `${path}[${i}]`, depth + 1);
        if (hit) return hit;
      }
      return null;
    }
    for (const key of Object.keys(value)) {
      if (FORBIDDEN_ROOT_KEYS.has(key.toLowerCase())) {
        return path ? `${path}.${key}` : key;
      }
      const hit = visit((value as Record<string, unknown>)[key], path ? `${path}.${key}` : key, depth + 1);
      if (hit) return hit;
    }
    return null;
  };
  const at = visit(params, "", 0);
  return at ? { ok: false, at } : { ok: true };
}

/** Byte size of a JSON-encodable value, for payload bounds. */
export function jsonBytes(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value ?? null), "utf8");
}
