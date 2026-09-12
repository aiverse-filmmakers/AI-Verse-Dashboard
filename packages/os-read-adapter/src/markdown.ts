import { readFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { extname, relative } from "node:path";
import {
  ADAPTER_ERRORS,
  adapterError,
  resolveWithinWorkspace,
} from "./path-resolve.js";

/**
 * Read-only Markdown projector (Task 3, Blueprint Rule 4).
 * Frontmatter + body projection with provenance. Never writes.
 */

export const MAX_MARKDOWN_BYTES = 256 * 1024;
const ALLOWED_EXTS = new Set([".md", ".markdown"]);

export interface MarkdownProjection {
  /** Workspace-relative posix-style path (never absolute). */
  path: string;
  size: number;
  mtimeMs: number;
  sha256: string;
  frontmatter: Record<string, string>;
  body: string;
  canonical: true;
}

function parseFrontmatter(text: string): { frontmatter: Record<string, string>; body: string } {
  const frontmatter: Record<string, string> = {};
  if (!text.startsWith("---\n") && !text.startsWith("---\r\n")) {
    return { frontmatter, body: text };
  }
  const end = text.indexOf("\n---", 3);
  if (end === -1) return { frontmatter, body: text };
  const block = text.slice(3, end).replace(/^\r?\n/, "");
  for (const line of block.split(/\r?\n/)) {
    const m = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line.trim());
    if (m) frontmatter[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return { frontmatter, body: text.slice(end + 4).replace(/^\r?\n/, "") };
}

export function readMarkdownFile(
  workspaceRootReal: string,
  relativePath: string,
): MarkdownProjection {
  const real = resolveWithinWorkspace(workspaceRootReal, relativePath);
  let st;
  try {
    st = statSync(real);
  } catch {
    throw adapterError(ADAPTER_ERRORS.NOT_FOUND, `source not found: ${relativePath}`);
  }
  if (!st.isFile()) {
    throw adapterError(ADAPTER_ERRORS.NOT_FILE, `not a file: ${relativePath}`);
  }
  if (st.size > MAX_MARKDOWN_BYTES) {
    throw adapterError(
      ADAPTER_ERRORS.TOO_LARGE,
      `markdown exceeds ${MAX_MARKDOWN_BYTES} bytes: ${relativePath}`,
    );
  }
  if (!ALLOWED_EXTS.has(extname(real).toLowerCase())) {
    throw adapterError(ADAPTER_ERRORS.UNSUPPORTED_TYPE, `not a markdown file: ${relativePath}`);
  }
  let text: string;
  try {
    text = readFileSync(real, "utf8");
  } catch {
    throw adapterError(ADAPTER_ERRORS.UNREADABLE, `unreadable: ${relativePath}`);
  }
  const { frontmatter, body } = parseFrontmatter(text);
  return {
    path: relative(workspaceRootReal, real).split("\\").join("/"),
    size: st.size,
    mtimeMs: st.mtimeMs,
    sha256: createHash("sha256").update(text, "utf8").digest("hex"),
    frontmatter,
    body,
    canonical: true,
  };
}
