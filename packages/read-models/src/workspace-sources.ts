import type { SystemRegistry } from "../../registry/src/index.js";
import { getWorkspace } from "../../os-read-adapter/src/index.js";
import {
  buildHealthReport,
  unavailableWorkSummary,
  type HealthReport,
  type InboxItem,
  type WorkSummary,
} from "../../read-models/src/index.js";

/**
 * Workspace projection boundary.
 *
 * The Dashboard has no owner-declared Health, Inbox, or Task projection
 * contract yet. Filesystem observations are therefore not converted into
 * domain semantics. These projections stay explicitly unavailable until
 * their canonical owners provide typed records.
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

export function buildWorkspaceProjections(
  registry: SystemRegistry,
  systemId: string,
  workspaceId: string,
): WorkspaceProjections {
  getWorkspace(registry, systemId, workspaceId);
  const observedAt = new Date().toISOString();

  return {
    systemId,
    workspaceId,
    health: buildHealthReport(systemId, workspaceId, []),
    work: unavailableWorkSummary(systemId, workspaceId),
    inbox: [],
    observedAt,
  };
}
