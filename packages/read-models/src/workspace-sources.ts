import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { SystemRegistry } from "../../registry/src/index.js";
import { getWorkspace } from "../../os-read-adapter/src/index.js";
import {
  buildHealthReport,
  normalizeInboxItem,
  normalizeWorkItem,
  sortInbox,
  summarizeWork,
  type HealthReport,
  type InboxItem,
  type WorkSummary,
} from "../../read-models/src/index.js";

/**
 * Workspace-sourced projections (Task 6).
 * Reads canonical workspace files through the read adapters and
 * normalizes them into Health/Work/Inbox models. Everything stays
 * read-only; unparseable or absent sources yield unavailable/empty
 * projections for THIS system only — never another system's data.
 * Resolution path fails with the adapter's own error codes.
 */

export const SOURCES = {
  CURRENT: "context/CURRENT.md",
  INBOX_DIR: "inbox",
  MEMORY: "memory/MEMORY.md",
  DECISIONS: "decisions/log.md",
  WORKSPACE_MANIFEST: "WORKSPACE.yaml",
} as const;

export interface WorkspaceProjections {
  systemId: string;
  workspaceId: string;
  health: HealthReport;
  work: WorkSummary;
  inbox: InboxItem[];
  observedAt: string;
}

interface Section {
  heading: string;
  lines: string[];
}

function sectionsOf(body: string): Section[] {
  const out: Section[] = [];
  let current: Section | null = null;
  for (const line of body.split(/\r?\n/)) {
    const m = /^#{1,3}\s+(.*)\s*$/.exec(line);
    if (m) {
      current = { heading: m[1].trim(), lines: [] };
      out.push(current);
    } else if (current) {
      current.lines.push(line);
    }
  }
  return out;
}

function bullets(lines: string[], max = 10): string[] {
  const out: string[] = [];
  for (const line of lines) {
    const m = /^\s*[-*]\s+(.*)\s*$/.exec(line);
    if (m && m[1] && !/^\[/.test(m[1])) out.push(m[1].slice(0, 200));
    if (out.length >= max) break;
  }
  return out;
}

function listFiles(dirReal: string, max = 50): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dirReal);
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const name of entries) {
    if (name.startsWith(".")) continue;
    if (/^readme\.md$/i.test(name)) continue;
    const full = join(dirReal, name);
    try {
      if (!statSync(full).isFile()) continue;
    } catch {
      continue;
    }
    out.push(name);
    if (out.length >= max) break;
  }
  return out.sort();
}

/**
 * Build Health + Work + Inbox from one workspace's canonical files.
 * - CURRENT.md sections -> health dimensions (manifest/context/decisions
 *   presence + objective/next-actions/constraints signals).
 * - inbox/*.md filenames -> inbox items (kind review, severity info).
 * - No canonical task store exists in the OS yet, so work starts empty
 *   (unavailable-as-empty, explicitly) until Task 7+/Phase 2 sources land.
 */
export function buildWorkspaceProjections(
  registry: SystemRegistry,
  systemId: string,
  workspaceId: string,
  adapters: {
    readText(rootReal: string, rel: string): { body: string; mtimeMs: number } | null;
    fileExists(rootReal: string, rel: string): boolean;
    dirPath(rootReal: string, rel: string): string | null;
  },
): WorkspaceProjections {
  const { rootReal, summary } = getWorkspace(registry, systemId, workspaceId);
  const observedAt = new Date().toISOString();

  // --- Health: manifest + expected layers + CURRENT.md signals.
  const current = adapters.readText(rootReal, SOURCES.CURRENT);
  const hasManifest = adapters.fileExists(rootReal, SOURCES.WORKSPACE_MANIFEST);
  const hasMemory = adapters.fileExists(rootReal, SOURCES.MEMORY);
  const hasDecisions = adapters.fileExists(rootReal, SOURCES.DECISIONS);
  const sections = current ? sectionsOf(current.body) : [];
  const objective = sections.find((s) => /objective/i.test(s.heading));
  const next = sections.find((s) => /next|action/i.test(s.heading));
  const constraints = sections.find((s) => /constraint|approval|decision/i.test(s.heading));
  const sourceModifiedAt = current ? new Date(current.mtimeMs).toISOString() : undefined;

  const health = buildHealthReport(systemId, workspaceId, [
    {
      id: "manifest",
      label: "Workspace manifest",
      status: hasManifest && summary.id === workspaceId ? "healthy" : "critical",
      summary: hasManifest ? `manifest ok (${summary.status ?? "active"})` : "WORKSPACE.yaml missing",
      evidence: [{ label: "WORKSPACE.yaml", source: `workspace://${workspaceId}/WORKSPACE.yaml` }],
      checks: [
        {
          id: "manifest-present",
          label: "manifest present with matching id",
          status: hasManifest ? "healthy" : "critical",
        },
      ],
      ...(sourceModifiedAt ? { sourceModifiedAt } : {}),
    },
    {
      id: "context",
      label: "Current context",
      status: current ? (objective && next ? "healthy" : "warning") : "unknown",
      summary: current
        ? `objective ${objective ? "declared" : "missing"}, next actions ${next ? "listed" : "missing"}`
        : "context/CURRENT.md missing",
      evidence: current
        ? [{ label: "CURRENT.md", source: `workspace://${workspaceId}/${SOURCES.CURRENT}` }]
        : [],
      checks: [
        { id: "objective", label: "objective declared", status: objective ? "healthy" : "warning" },
        { id: "next", label: "next actions listed", status: next ? "healthy" : "warning" },
        {
          id: "constraints",
          label: "constraints/approvals noted",
          status: constraints ? "healthy" : "warning",
        },
      ],
      ...(sourceModifiedAt ? { sourceModifiedAt } : {}),
    },
    {
      id: "layers",
      label: "Workspace layers",
      status: hasMemory && hasDecisions ? "healthy" : "warning",
      summary: `memory ${hasMemory ? "present" : "missing"}, decisions ${hasDecisions ? "present" : "missing"}`,
      evidence: [],
      checks: [
        { id: "memory", label: "memory layer", status: hasMemory ? "healthy" : "warning" },
        { id: "decisions", label: "decisions log", status: hasDecisions ? "healthy" : "warning" },
      ],
      ...(sourceModifiedAt ? { sourceModifiedAt } : {}),
    },
  ]);

  // --- Work: no canonical task store in the OS yet -> explicit empty.
  const work = summarizeWork(systemId, workspaceId, []);
  void normalizeWorkItem;

  // --- Inbox: workspace inbox/*.md files as review items.
  const inboxDir = adapters.dirPath(rootReal, SOURCES.INBOX_DIR);
  const inboxFiles = inboxDir && existsSync(inboxDir) ? listFiles(inboxDir) : [];
  const inbox: InboxItem[] = [];
  for (const name of inboxFiles.slice(0, 50)) {
    try {
      inbox.push(
        normalizeInboxItem(systemId, workspaceId, {
          id: name.replace(/[^A-Za-z0-9-_]/g, "-").slice(0, 64) || "item",
          kind: "review",
          severity: "info",
          title: name,
          createdAt: observedAt,
          source: { kind: "workspace-file", path: `inbox/${name}` },
          availableActions: [],
        }),
      );
    } catch {
      // Skip un-normalizable filenames; never fail the whole projection.
    }
  }
  void bullets;
  void sortInbox;

  return { systemId, workspaceId, health, work, inbox, observedAt };
}
