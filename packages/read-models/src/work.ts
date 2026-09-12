export type WorkStatus =
  | "queued"
  | "running"
  | "waiting"
  | "blocked"
  | "succeeded"
  | "failed"
  | "cancelled";

export type WorkKind = "initiative" | "task" | "subagent" | "automation-run";

export interface WorkItem {
  id: string;
  systemId: string;
  workspaceId: string;
  parentId?: string;
  kind: WorkKind;
  title: string;
  status: WorkStatus;
  agentId?: string;
  runtime?: string;
  startedAt?: string;
  completedAt?: string;
  lastMeaningfulEvent?: string;
  attentionRequired: boolean;
}

export interface WorkSummary {
  systemId: string;
  workspaceId: string;
  active: WorkItem[];
  waiting: WorkItem[];
  blocked: WorkItem[];
  done: WorkItem[];
  attention: WorkItem[];
  observedAt: string;
}

const ID_RE = /^[A-Za-z0-9][A-Za-z0-9-_]{0,63}$/;
const STATUSES: WorkStatus[] = [
  "queued",
  "running",
  "waiting",
  "blocked",
  "succeeded",
  "failed",
  "cancelled",
];
const KINDS: WorkKind[] = ["initiative", "task", "subagent", "automation-run"];

/** Normalize an untrusted work record; fail closed on bad shape. */
export function normalizeWorkItem(
  systemId: string,
  workspaceId: string,
  raw: Record<string, unknown>,
): WorkItem {
  const id = raw.id;
  const title = raw.title;
  const status = raw.status;
  const kind = raw.kind ?? "task";
  if (typeof id !== "string" || !ID_RE.test(id)) throw new Error(`bad work id ${String(id)}`);
  if (typeof title !== "string" || title.length === 0 || title.length > 256) {
    throw new Error("bad work title");
  }
  if (typeof status !== "string" || !(STATUSES as string[]).includes(status)) {
    throw new Error(`bad work status ${String(status)}`);
  }
  if (typeof kind !== "string" || !(KINDS as string[]).includes(kind)) {
    throw new Error(`bad work kind ${String(kind)}`);
  }
  const item: WorkItem = {
    id,
    systemId,
    workspaceId,
    kind: kind as WorkKind,
    title,
    status: status as WorkStatus,
    attentionRequired: raw.attentionRequired === true,
  };
  if (raw.parentId !== undefined) {
    if (typeof raw.parentId !== "string" || !ID_RE.test(raw.parentId)) {
      throw new Error("bad parentId");
    }
    item.parentId = raw.parentId;
  }
  for (const k of ["agentId", "runtime", "lastMeaningfulEvent"] as const) {
    if (raw[k] !== undefined) {
      if (typeof raw[k] !== "string" || (raw[k] as string).length > 256) {
        throw new Error(`bad work field ${k}`);
      }
      (item as unknown as Record<string, unknown>)[k] = raw[k];
    }
  }
  for (const k of ["startedAt", "completedAt"] as const) {
    if (raw[k] !== undefined) {
      if (typeof raw[k] !== "string" || Number.isNaN(Date.parse(raw[k] as string))) {
        throw new Error(`bad work timestamp ${k}`);
      }
      (item as unknown as Record<string, unknown>)[k] = raw[k];
    }
  }
  return item;
}

/** Split items into Active / Waiting / Blocked / Done + attention queue. */
export function summarizeWork(
  systemId: string,
  workspaceId: string,
  items: WorkItem[],
): WorkSummary {
  for (const it of items) {
    if (it.systemId !== systemId || it.workspaceId !== workspaceId) {
      throw new Error("work item crossed system/workspace boundary");
    }
  }
  const active = items.filter((i) => i.status === "running" || i.status === "queued");
  const waiting = items.filter((i) => i.status === "waiting");
  const blocked = items.filter((i) => i.status === "blocked" || i.status === "failed");
  const done = items.filter((i) => i.status === "succeeded" || i.status === "cancelled");
  // Attention: blocked/failed/waiting flagged, plus explicit attentionRequired.
  const attention = items.filter(
    (i) => i.attentionRequired || i.status === "blocked" || i.status === "failed",
  );
  return {
    systemId,
    workspaceId,
    active,
    waiting,
    blocked,
    done,
    attention,
    observedAt: new Date().toISOString(),
  };
}
