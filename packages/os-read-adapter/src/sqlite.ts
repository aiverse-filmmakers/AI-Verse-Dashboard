import { statSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { extname } from "node:path";
import {
  ADAPTER_ERRORS,
  adapterError,
  resolveWithinWorkspace,
} from "./path-resolve.js";

/**
 * Read-only SQLite projector (Task 3, Blueprint Rule 5).
 * mode=ro + query_only. SELECT/WITH/EXPLAIN only, identifier allowlist,
 * bounded params and limits. Never attaches another system's database.
 */

export const MAX_SQLITE_BYTES = 32 * 1024 * 1024;
export const MAX_ROWS = 500;
export const MAX_PARAMS = 32;
export const MAX_PARAM_STRING = 4096;

const IDENT_RE = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/;
const SELECT_RE = /^\s*(SELECT|WITH|EXPLAIN)\b/i;

export interface SqliteHandle {
  /** Workspace-relative posix path of the database. */
  path: string;
  close(): void;
  tables(): string[];
  queryTable(table: string, opts?: { columns?: string[]; limit?: number; offset?: number }): Record<string, unknown>[];
  queryAll(sql: string, params?: (string | number | boolean | null)[]): Record<string, unknown>[];
}

export function openReadOnly(
  workspaceRootReal: string,
  relativePath: string,
): SqliteHandle {
  const real = resolveWithinWorkspace(workspaceRootReal, relativePath);
  let st;
  try {
    st = statSync(real);
  } catch {
    throw adapterError(ADAPTER_ERRORS.NOT_FOUND, `database not found: ${relativePath}`);
  }
  if (!st.isFile()) {
    throw adapterError(ADAPTER_ERRORS.NOT_FILE, `not a file: ${relativePath}`);
  }
  if (st.size > MAX_SQLITE_BYTES) {
    throw adapterError(
      ADAPTER_ERRORS.TOO_LARGE,
      `database exceeds ${MAX_SQLITE_BYTES} bytes: ${relativePath}`,
    );
  }
  if (![".sqlite", ".sqlite3", ".db"].includes(extname(real).toLowerCase())) {
    throw adapterError(ADAPTER_ERRORS.UNSUPPORTED_TYPE, `not a sqlite file: ${relativePath}`);
  }
  const db = new DatabaseSync(real, { readOnly: true });
  db.exec("PRAGMA query_only=ON;");
  db.exec("PRAGMA busy_timeout=2000;");
  const rel = relativePath.split("\\").join("/");

  const knownTables = (): string[] => {
    const rows = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
      .all() as { name: string }[];
    return rows.map((r) => r.name);
  };

  const checkParams = (params: (string | number | boolean | null)[] | undefined): void => {
    if (!params) return;
    if (params.length > MAX_PARAMS) {
      throw adapterError(ADAPTER_ERRORS.QUERY_REJECTED, `too many params (${params.length})`);
    }
    for (const p of params) {
      if (typeof p === "string" && p.length > MAX_PARAM_STRING) {
        throw adapterError(ADAPTER_ERRORS.QUERY_REJECTED, "param string too long");
      }
      if (p !== null && !["string", "number", "boolean"].includes(typeof p)) {
        throw adapterError(ADAPTER_ERRORS.QUERY_REJECTED, "param must be string/number/boolean/null");
      }
    }
  };

  return {
    path: rel,
    close() {
      db.close();
    },
    tables() {
      return knownTables();
    },
    queryTable(table, opts) {
      if (!IDENT_RE.test(table)) {
        throw adapterError(ADAPTER_ERRORS.QUERY_REJECTED, `bad table name: ${table}`);
      }
      if (!knownTables().includes(table)) {
        throw adapterError(ADAPTER_ERRORS.TABLE_UNKNOWN, `unknown table: ${table}`);
      }
      const cols = opts?.columns ?? ["*"];
      if (cols.length === 0 || cols.length > 64) {
        throw adapterError(ADAPTER_ERRORS.QUERY_REJECTED, "bad column list");
      }
      for (const c of cols) {
        if (c !== "*" && !IDENT_RE.test(c)) {
          throw adapterError(ADAPTER_ERRORS.QUERY_REJECTED, `bad column name: ${c}`);
        }
      }
      const limit = opts?.limit ?? 100;
      const offset = opts?.offset ?? 0;
      if (!Number.isInteger(limit) || limit < 1 || limit > MAX_ROWS) {
        throw adapterError(ADAPTER_ERRORS.QUERY_REJECTED, `limit must be 1-${MAX_ROWS}`);
      }
      if (!Number.isInteger(offset) || offset < 0 || offset > 1_000_000) {
        throw adapterError(ADAPTER_ERRORS.QUERY_REJECTED, "bad offset");
      }
      const colSql = cols.map((c) => (c === "*" ? "*" : `"${c}"`)).join(", ");
      return db
        .prepare(`SELECT ${colSql} FROM "${table}" LIMIT ? OFFSET ?`)
        .all(limit, offset) as Record<string, unknown>[];
    },
    queryAll(sql, params) {
      if (typeof sql !== "string" || sql.length === 0 || sql.length > 8192) {
        throw adapterError(ADAPTER_ERRORS.QUERY_REJECTED, "bad sql length");
      }
      if (!SELECT_RE.test(sql)) {
        throw adapterError(ADAPTER_ERRORS.QUERY_REJECTED, "only SELECT/WITH/EXPLAIN queries allowed");
      }
      const trimmed = sql.trim().replace(/;\s*$/, "");
      if (trimmed.includes(";")) {
        throw adapterError(ADAPTER_ERRORS.QUERY_REJECTED, "multi-statement queries rejected");
      }
      checkParams(params);
      const bound = (params ?? []).map((p) => (typeof p === "boolean" ? (p ? 1 : 0) : p));
      try {
        return db.prepare(trimmed).all(...bound) as Record<string, unknown>[];
      } catch (err) {
        throw adapterError(
          ADAPTER_ERRORS.QUERY_REJECTED,
          `query failed: ${(err as Error).message.slice(0, 200)}`,
        );
      }
    },
  };
}
