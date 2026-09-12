import {
  presentationSchema,
  systemIdSchema,
  workspaceIdSchema,
  type Presentation,
} from "../../../packages/protocol/src/index.js";
import type { PanelRegistry } from "./panels.js";
import type { PanelPlacement, PanelState } from "./panels.js";

/**
 * Layout manager (Task 5, shell §4 + §6).
 * Owns presentation placement only: visibility, dock zone, presentation,
 * floating/detached state, saved presets. Presets reference panel ids and
 * layout settings only — never canonical domain data (§6: exit criterion 3).
 * Every instance is explicitly bound to (systemId, workspaceId?); a switch
 * of the main shell requires explicit retarget, never silent re-scope.
 */

export interface PanelInstance {
  instanceId: string;
  panelId: string;
  systemId: string;
  workspaceId?: string;
  state: PanelState;
  placement: PanelPlacement;
  presentation: Presentation;
}

export interface LayoutPreset {
  name: string;
  instances: PanelInstance[];
}

const INSTANCE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9-_]{0,63}$/;
const PRESET_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9 _-]{0,63}$/;

export class LayoutManager {
  private instances = new Map<string, PanelInstance>();
  private counter = 0;

  constructor(private readonly registry: PanelRegistry) {}

  mount(
    panelId: string,
    scope: { systemId: string; workspaceId?: string },
    opts?: { placement?: PanelPlacement; presentation?: Presentation },
  ): PanelInstance {
    const def = this.registry.get(panelId);
    if (!def) throw new Error(`unknown panel: ${panelId}`);
    if (!systemIdSchema.safeParse(scope.systemId).success) {
      throw new Error(`invalid systemId ${scope.systemId}`);
    }
    if (def.systemScoped !== true) {
      throw new Error(`panel ${panelId} is not system-scoped and cannot mount with a system`);
    }
    if (scope.workspaceId !== undefined) {
      if (def.workspaceScoped !== true) {
        throw new Error(`panel ${panelId} is not workspace-scoped`);
      }
      if (!workspaceIdSchema.safeParse(scope.workspaceId).success) {
        throw new Error(`invalid workspaceId ${scope.workspaceId}`);
      }
    } else if (def.workspaceScoped === true) {
      throw new Error(`panel ${panelId} requires a workspaceId`);
    }
    const presentation = opts?.presentation ?? def.supportedPresentations[0];
    if (!presentationSchema.safeParse(presentation).success) {
      throw new Error(`invalid presentation ${String(presentation)}`);
    }
    if (!def.supportedPresentations.includes(presentation)) {
      throw new Error(`panel ${panelId} does not support ${presentation}`);
    }
    this.counter += 1;
    const inst: PanelInstance = {
      instanceId: `inst-${this.counter}`,
      panelId,
      systemId: scope.systemId,
      ...(scope.workspaceId !== undefined ? { workspaceId: scope.workspaceId } : {}),
      state: "docked",
      placement: opts?.placement ?? def.preferredPlacement ?? "center",
      presentation,
    };
    this.instances.set(inst.instanceId, { ...inst });
    return { ...inst };
  }

  get(instanceId: string): PanelInstance | undefined {
    const inst = this.instances.get(instanceId);
    return inst ? { ...inst } : undefined;
  }

  list(): PanelInstance[] {
    return [...this.instances.values()].map((i) => ({ ...i }));
  }

  setState(instanceId: string, state: PanelState): PanelInstance {
    const inst = this.instances.get(instanceId);
    if (!inst) throw new Error(`unknown instance: ${instanceId}`);
    if (!["docked", "floating", "detached", "hud", "hidden"].includes(state)) {
      throw new Error(`invalid state ${state}`);
    }
    const def = this.registry.get(inst.panelId);
    if (state === "floating" && def?.canFloat !== true) {
      throw new Error(`panel ${inst.panelId} cannot float`);
    }
    if ((state === "detached" || state === "hud") && def?.canDetach !== true) {
      throw new Error(`panel ${inst.panelId} cannot detach`);
    }
    if (state === "hud" && !def?.supportedPresentations.includes("hud")) {
      throw new Error(`panel ${inst.panelId} has no hud presentation`);
    }
    inst.state = state;
    if (state === "hud") inst.presentation = "hud";
    return { ...inst };
  }

  setPresentation(instanceId: string, presentation: Presentation): PanelInstance {
    const inst = this.instances.get(instanceId);
    if (!inst) throw new Error(`unknown instance: ${instanceId}`);
    const def = this.registry.get(inst.panelId);
    if (!def?.supportedPresentations.includes(presentation)) {
      throw new Error(`panel ${inst.panelId} does not support ${presentation}`);
    }
    inst.presentation = presentation;
    return { ...inst };
  }

  /**
   * Retarget a detached instance to another system. Explicit only — the
   * shell never calls this silently on main-system switch (§2.2).
   */
  retarget(instanceId: string, scope: { systemId: string; workspaceId?: string }): PanelInstance {
    const inst = this.instances.get(instanceId);
    if (!inst) throw new Error(`unknown instance: ${instanceId}`);
    if (!systemIdSchema.safeParse(scope.systemId).success) {
      throw new Error(`invalid systemId ${scope.systemId}`);
    }
    inst.systemId = scope.systemId;
    if (scope.workspaceId !== undefined) inst.workspaceId = scope.workspaceId;
    else delete inst.workspaceId;
    return { ...inst };
  }

  unmount(instanceId: string): boolean {
    return this.instances.delete(instanceId);
  }

  /** Save a preset: ids + presentation/layout only, no domain data. */
  savePreset(name: string): LayoutPreset {
    if (!PRESET_NAME_RE.test(name)) throw new Error(`invalid preset name ${name}`);
    return { name, instances: this.list() };
  }

  /** Restore a preset; every instance id must look like an id, not data. */
  loadPreset(preset: LayoutPreset): void {
    if (!PRESET_NAME_RE.test(preset.name)) throw new Error(`invalid preset name ${preset.name}`);
    const next = new Map<string, PanelInstance>();
    for (const inst of preset.instances) {
      if (!INSTANCE_ID_RE.test(inst.instanceId)) throw new Error(`bad instance id in preset`);
      if (!this.registry.has(inst.panelId)) throw new Error(`unknown panel in preset: ${inst.panelId}`);
      next.set(inst.instanceId, { ...inst });
    }
    this.instances = next;
  }

  reset(): void {
    this.instances.clear();
  }
}
