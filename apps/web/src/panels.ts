import {
  panelIdSchema,
  presentationSchema,
  type Presentation,
} from "../../../packages/protocol/src/index.js";

/**
 * Panel registry (Task 5, shell §3).
 * Host-independent panel definitions: id, title, presentations,
 * placement hints, detach/float/pin capability, and scope flags.
 * The registry owns presentation contracts only — never canonical data.
 */

export type PanelPlacement = "left" | "right" | "bottom" | "center";
export type PanelState = "docked" | "floating" | "detached" | "hud" | "hidden";

export interface PanelMount {
  hideOnPoppedOut?: boolean;
}

export interface PanelDefinition {
  id: string;
  title: string;
  icon?: string;
  supportedPresentations: Presentation[];
  minWidth?: number;
  minHeight?: number;
  preferredPlacement?: PanelPlacement;
  canFloat?: boolean;
  canDetach?: boolean;
  canPin?: boolean;
  systemScoped: boolean;
  workspaceScoped?: boolean;
}

const VALID_PANEL_ERROR = "invalid panel definition";

function checkDefinition(def: PanelDefinition): void {
  if (!panelIdSchema.safeParse(def.id).success) {
    throw new Error(`${VALID_PANEL_ERROR}: bad id ${def.id}`);
  }
  if (!def.title || def.title.length > 64) {
    throw new Error(`${VALID_PANEL_ERROR}: bad title`);
  }
  if (def.supportedPresentations.length === 0) {
    throw new Error(`${VALID_PANEL_ERROR}: needs at least one presentation`);
  }
  for (const p of def.supportedPresentations) {
    if (!presentationSchema.safeParse(p).success) {
      throw new Error(`${VALID_PANEL_ERROR}: bad presentation ${String(p)}`);
    }
  }
  if (def.workspaceScoped === true && def.systemScoped !== true) {
    throw new Error(`${VALID_PANEL_ERROR}: workspace-scoped panels must be system-scoped`);
  }
  if (def.preferredPlacement !== undefined) {
    const allowed: PanelPlacement[] = ["left", "right", "bottom", "center"];
    if (!allowed.includes(def.preferredPlacement)) {
      throw new Error(`${VALID_PANEL_ERROR}: bad placement`);
    }
  }
}

export class PanelRegistry {
  private readonly defs = new Map<string, PanelDefinition>();

  register(def: PanelDefinition): void {
    checkDefinition(def);
    if (this.defs.has(def.id)) {
      throw new Error(`panel already registered: ${def.id}`);
    }
    this.defs.set(def.id, { ...def, supportedPresentations: [...def.supportedPresentations] });
  }

  get(id: string): PanelDefinition | undefined {
    const def = this.defs.get(id);
    return def ? { ...def, supportedPresentations: [...def.supportedPresentations] } : undefined;
  }

  list(): PanelDefinition[] {
    return [...this.defs.values()].map((d) => ({ ...d, supportedPresentations: [...d.supportedPresentations] }));
  }

  has(id: string): boolean {
    return this.defs.has(id);
  }
}

/** Phase 1 default read-only panels (shell §14: Now/Health/Work/Inbox). */
export function defaultPhase1Panels(): PanelDefinition[] {
  return [
    {
      id: "now",
      title: "Now",
      supportedPresentations: ["full", "compact"],
      preferredPlacement: "center",
      canFloat: true,
      canDetach: true,
      systemScoped: true,
      workspaceScoped: true,
    },
    {
      id: "health",
      title: "Health",
      supportedPresentations: ["full", "compact", "hud"],
      preferredPlacement: "bottom",
      canFloat: true,
      canDetach: true,
      canPin: true,
      systemScoped: true,
      workspaceScoped: true,
    },
    {
      id: "work",
      title: "Work",
      supportedPresentations: ["full", "compact"],
      preferredPlacement: "left",
      canFloat: true,
      canDetach: true,
      systemScoped: true,
      workspaceScoped: true,
    },
    {
      id: "inbox",
      title: "Inbox",
      supportedPresentations: ["full", "compact", "hud"],
      preferredPlacement: "right",
      canFloat: true,
      canDetach: true,
      canPin: true,
      systemScoped: true,
      workspaceScoped: true,
    },
    {
      id: "usage",
      title: "Usage",
      supportedPresentations: ["full", "compact", "hud"],
      preferredPlacement: "bottom",
      canFloat: true,
      canDetach: true,
      canPin: true,
      systemScoped: true,
      workspaceScoped: false,
    },
  ];
}
