import type { ComponentState, PanelStatus } from "./tokens.js";
import { STATUS_COLOR, STATUS_LABEL } from "./tokens.js";

/**
 * Shell render model (Task 5).
 * Framework-free view model: switchers, panel cards, provenance line,
 * and state surfaces. The browser shell (React/Vite, Task 5+) renders
 * this model; tests assert the model without a DOM.
 */

export interface SwitcherOption {
  id: string;
  label: string;
  selected: boolean;
}

export interface PanelCard {
  instanceId: string;
  panelId: string;
  title: string;
  presentation: string;
  state: string;
  status: PanelStatus;
  statusLabel: string;
  color: string;
  body: string;
  provenance: string;
  freshness: "fresh" | "stale" | "unavailable";
}

export interface ShellModel {
  systems: SwitcherOption[];
  workspaces: SwitcherOption[];
  panels: PanelCard[];
  activeSystemId: string;
  activeWorkspaceId?: string;
  narrow: boolean;
}

export interface PanelDatum {
  instanceId: string;
  panelId: string;
  title: string;
  presentation: string;
  state: string;
  systemId: string;
  workspaceId?: string;
  status: PanelStatus;
  body: string;
  freshness: "fresh" | "stale" | "unavailable";
  observedAt: string;
}

function provenanceLine(d: PanelDatum, narrow: boolean): string {
  const where = d.workspaceId !== undefined ? `${d.systemId}/${d.workspaceId}` : d.systemId;
  if (narrow) return `${where} · ${d.freshness} · ${d.observedAt}`;
  return `system ${where} · ${d.freshness} · observed ${d.observedAt}`;
}

export function renderShellModel(input: {
  systems: { id: string; label: string }[];
  workspaces: { id: string; label: string }[];
  activeSystemId: string;
  activeWorkspaceId?: string;
  panels: PanelDatum[];
  viewportWidth: number;
}): ShellModel {
  const narrow = input.viewportWidth < 640;
  return {
    systems: input.systems.map((s) => ({
      id: s.id,
      label: s.label,
      selected: s.id === input.activeSystemId,
    })),
    workspaces: input.workspaces.map((w) => ({
      id: w.id,
      label: w.label,
      selected: w.id === input.activeWorkspaceId,
    })),
    activeSystemId: input.activeSystemId,
    ...(input.activeWorkspaceId !== undefined ? { activeWorkspaceId: input.activeWorkspaceId } : {}),
    narrow,
    panels: input.panels.map((p) => ({
      instanceId: p.instanceId,
      panelId: p.panelId,
      title: p.title,
      presentation: p.presentation,
      state: p.state,
      status: p.status,
      statusLabel: STATUS_LABEL[p.status],
      color: STATUS_COLOR[p.status],
      body: p.body,
      provenance: provenanceLine(p, narrow),
      freshness: p.freshness,
    })),
  };
}

/** Empty/loading/error/stale surfaces (§11 component states). */
export function stateSurface(
  state: Extract<ComponentState, "loading" | "empty" | "error" | "stale" | "unknown">,
  detail?: string,
): string {
  switch (state) {
    case "loading":
      return "Loading…";
    case "empty":
      return detail ?? "Nothing here yet.";
    case "error":
      return `Something failed. ${detail ?? "Retry."}`;
    case "stale":
      return `Showing last known state. ${detail ?? ""}`.trim();
    case "unknown":
      return "Status unknown.";
  }
}
