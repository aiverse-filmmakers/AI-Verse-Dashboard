import { systemIdSchema, workspaceIdSchema } from "../../protocol/src/index.js";
import { REGISTRY_ERRORS, registryError } from "./validation.js";
import type { SystemRegistry } from "./registry.js";

/**
 * Per-window selection store (Task 2).
 * Each Dashboard window/tab keeps its own selected systemId (+ optional
 * workspaceId). Switching one window never re-scopes another, and a
 * detached panel stays bound to its original systemId until the user
 * explicitly retargets it (shell doc §2.2).
 */

export interface WindowSelection {
  systemId: string;
  workspaceId?: string;
}

export class SelectionStore {
  private readonly selections = new Map<string, WindowSelection>();

  constructor(private readonly registry: SystemRegistry) {}

  set(windowId: string, selection: WindowSelection): WindowSelection {
    if (!windowId || windowId.length > 128) {
      throw registryError(REGISTRY_ERRORS.WINDOW_REQUIRED, "windowId required (1-128 chars)");
    }
    if (!systemIdSchema.safeParse(selection.systemId).success) {
      throw registryError(REGISTRY_ERRORS.INVALID_ID, `invalid systemId ${selection.systemId}`);
    }
    if (!this.registry.has(selection.systemId)) {
      throw registryError(
        REGISTRY_ERRORS.SYSTEM_NOT_REGISTERED,
        `cannot select unregistered systemId ${selection.systemId}`,
      );
    }
    if (selection.workspaceId !== undefined) {
      if (!workspaceIdSchema.safeParse(selection.workspaceId).success) {
        throw registryError(REGISTRY_ERRORS.INVALID_ID, `invalid workspaceId ${selection.workspaceId}`);
      }
    }
    const stored: WindowSelection = { systemId: selection.systemId };
    if (selection.workspaceId !== undefined) stored.workspaceId = selection.workspaceId;
    this.selections.set(windowId, stored);
    return { ...stored };
  }

  get(windowId: string): WindowSelection | undefined {
    const sel = this.selections.get(windowId);
    return sel ? { ...sel } : undefined;
  }

  clear(windowId: string): boolean {
    return this.selections.delete(windowId);
  }
}
