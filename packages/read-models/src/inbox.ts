export type InboxKind =
  | "approval"
  | "question"
  | "failure"
  | "blocked"
  | "stale"
  | "pairing"
  | "security"
  | "review";

export type InboxSeverity = "info" | "warning" | "critical";

export interface SourceRef {
  kind: string;
  path?: string;
  recordId?: string;
}

export interface CommandDescriptor {
  command: string;
  label: string;
}

export interface InboxItem {
  id: string;
  systemId: string;
  workspaceId: string;
  kind: InboxKind;
  severity: InboxSeverity;
  title: string;
  summary?: string;
  createdAt: string;
  expiresAt?: string;
  source: SourceRef;
  availableActions: CommandDescriptor[];
}

export const INBOX_KINDS: InboxKind[] = [
  "approval",
  "question",
  "failure",
  "blocked",
  "stale",
  "pairing",
  "security",
  "review",
];

export const INBOX_SEVERITIES: InboxSeverity[] = ["info", "warning", "critical"];

const ID_RE = /^[A-Za-z0-9][A-Za-z0-9-_]{0,63}$/;

/** Normalize an untrusted inbox record; fail closed on bad shape. */
export function normalizeInboxItem(
  systemId: string,
  workspaceId: string,
  raw: Record<string, unknown>,
): InboxItem {
  const id = raw.id;
  const kind = raw.kind;
  const severity = raw.severity ?? "info";
  const title = raw.title;
  const createdAt = raw.createdAt;
  if (typeof id !== "string" || !ID_RE.test(id)) throw new Error(`bad inbox id ${String(id)}`);
  if (typeof kind !== "string" || !(INBOX_KINDS as string[]).includes(kind)) {
    throw new Error(`bad inbox kind ${String(kind)}`);
  }
  if (typeof severity !== "string" || !(INBOX_SEVERITIES as string[]).includes(severity)) {
    throw new Error(`bad inbox severity ${String(severity)}`);
  }
  if (typeof title !== "string" || title.length === 0 || title.length > 256) {
    throw new Error("bad inbox title");
  }
  if (typeof createdAt !== "string" || Number.isNaN(Date.parse(createdAt))) {
    throw new Error("bad inbox createdAt");
  }
  const source = raw.source;
  if (typeof source !== "object" || source === null || typeof (source as { kind?: unknown }).kind !== "string") {
    throw new Error("bad inbox source");
  }
  const item: InboxItem = {
    id,
    systemId,
    workspaceId,
    kind: kind as InboxKind,
    severity: severity as InboxSeverity,
    title,
    createdAt,
    source: source as SourceRef,
    availableActions: [],
  };
  if (raw.summary !== undefined) {
    if (typeof raw.summary !== "string" || raw.summary.length > 1024) {
      throw new Error("bad inbox summary");
    }
    item.summary = raw.summary;
  }
  if (raw.expiresAt !== undefined) {
    if (typeof raw.expiresAt !== "string" || Number.isNaN(Date.parse(raw.expiresAt))) {
      throw new Error("bad inbox expiresAt");
    }
    item.expiresAt = raw.expiresAt;
  }
  item.availableActions = [];
  if (Array.isArray(raw.availableActions)) {
    for (const a of raw.availableActions) {
      const act = a as { command?: unknown; label?: unknown };
      if (typeof act.command !== "string" || typeof act.label !== "string") {
        throw new Error("bad inbox action");
      }
      item.availableActions.push({ command: act.command, label: act.label });
    }
  }
  return item;
}

const SEV_RANK: Record<InboxSeverity, number> = { critical: 0, warning: 1, info: 2 };

/** Sort: severity first, then oldest first. */
export function sortInbox(items: InboxItem[]): InboxItem[] {
  return [...items].sort((a, b) => {
    const s = SEV_RANK[a.severity] - SEV_RANK[b.severity];
    if (s !== 0) return s;
    return Date.parse(a.createdAt) - Date.parse(b.createdAt);
  });
}
