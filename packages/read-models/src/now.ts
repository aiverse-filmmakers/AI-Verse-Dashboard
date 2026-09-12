import type { HealthReport } from "./health.js";
import type { WorkSummary } from "./work.js";
import type { InboxItem } from "./inbox.js";

/**
 * Now model (Task 6, Blueprint Horizon 1).
 * Only: selected system/workspace identity, current focus, 3-5 running,
 * 3-5 attention, compact health strip, next automation placeholder.
 * Missing sources surface as unavailable — never zero-filled, never
 * borrowed from another system (Rule 8).
 */

export const NOW_RUNNING_MAX = 5;
export const NOW_ATTENTION_MAX = 5;

export interface NowModel {
  systemId: string;
  workspaceId: string;
  focus: { title: string; detail?: string } | null;
  focusUnavailable: boolean;
  running: { id: string; title: string; status: string }[];
  attention: { id: string; title: string; severity: string }[];
  healthStrip: { overall: HealthReport["overall"]; dimensions: { id: string; label: string; status: string }[] };
  healthUnavailable: boolean;
  provenance: { systemId: string; workspaceId: string; observedAt: string };
}

export function buildNowModel(input: {
  systemId: string;
  workspaceId: string;
  focus?: { title: string; detail?: string } | null;
  work?: WorkSummary | null;
  inbox?: InboxItem[] | null;
  health?: HealthReport | null;
}): NowModel {
  const running =
    input.work?.active.slice(0, NOW_RUNNING_MAX).map((w) => ({
      id: w.id,
      title: w.title,
      status: w.status,
    })) ?? [];
  const attention: NowModel["attention"] = [];
  if (input.work) {
    for (const w of input.work.attention.slice(0, NOW_ATTENTION_MAX)) {
      attention.push({ id: w.id, title: w.title, severity: "warning" });
    }
  }
  if (input.inbox) {
    for (const item of input.inbox.slice(0, Math.max(0, NOW_ATTENTION_MAX - attention.length))) {
      attention.push({ id: item.id, title: item.title, severity: item.severity });
    }
  }
  return {
    systemId: input.systemId,
    workspaceId: input.workspaceId,
    focus: input.focus ?? null,
    focusUnavailable: input.focus == null,
    running,
    attention: attention.slice(0, NOW_ATTENTION_MAX),
    healthStrip: {
      overall: input.health?.overall ?? "unknown",
      dimensions: (input.health?.dimensions ?? []).map((d) => ({
        id: d.id,
        label: d.label,
        status: d.status,
      })),
    },
    healthUnavailable: input.health == null,
    provenance: {
      systemId: input.systemId,
      workspaceId: input.workspaceId,
      observedAt: new Date().toISOString(),
    },
  };
}
