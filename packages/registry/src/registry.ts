import { isAbsolute, relative } from "node:path";
import { systemIdSchema } from "../../protocol/src/index.js";
import {
  OS_TYPE,
  REGISTRY_ERRORS,
  registryError,
  validateCompatibleOs,
  type OsCompatibility,
} from "./validation.js";

/**
 * Dashboard-local registered OS connection registry (Task 2).
 *
 * Owns zero domain truth: each record maps a stable systemId to one
 * approved compatible OS root (canonical realpath, server-side only).
 * The browser never supplies roots; it sends systemId which resolves here.
 * In-memory and disposable; persistence is a Gateway concern (Task 4).
 */

export interface ConnectionRecord {
  systemId: string;
  label: string;
  osType: string;
  osVersion: string;
  architecture: string;
  /** Canonical realpath. Server-side only — never sent to clients. */
  root: string;
  authorized: boolean;
  registeredAt: string;
  lastValidatedAt: string;
}

/** Client-safe view: everything except the privileged root. */
export interface PublicConnection {
  systemId: string;
  label: string;
  osType: string;
  osVersion: string;
  authorized: boolean;
  registeredAt: string;
  lastValidatedAt: string;
}

export function toPublic(record: ConnectionRecord): PublicConnection {
  const { root: _root, architecture: _arch, ...pub } = record;
  void _root;
  void _arch;
  return pub;
}

const isWithin = (child: string, parent: string): boolean => {
  const rel = relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
};

export class SystemRegistry {
  private readonly byId = new Map<string, ConnectionRecord>();
  private readonly byRoot = new Map<string, string>();
  private counter = 0;

  register(candidateRoot: string, opts?: { systemId?: string; label?: string }): ConnectionRecord {
    const compat: OsCompatibility = validateCompatibleOs(candidateRoot);
    if (!compat.compatible || compat.root === null) {
      throw registryError(
        REGISTRY_ERRORS.OS_INCOMPATIBLE,
        `incompatible OS at ${candidateRoot}: ${compat.reasons.join("; ")}`,
      );
    }
    const root = compat.root;

    const existingId = this.byRoot.get(root);
    if (existingId !== undefined) {
      throw registryError(
        REGISTRY_ERRORS.SYSTEM_DUPLICATE,
        `OS root already registered as ${existingId}`,
      );
    }
    for (const [otherRoot, otherId] of this.byRoot) {
      if (isWithin(root, otherRoot) || isWithin(otherRoot, root)) {
        throw registryError(
          REGISTRY_ERRORS.SYSTEM_OVERLAP,
          `OS root overlaps registered system ${otherId}`,
        );
      }
    }

    let systemId = opts?.systemId;
    if (systemId === undefined) {
      this.counter += 1;
      systemId = `aiverse-${String(this.counter).padStart(2, "0")}`;
    } else {
      const parsed = systemIdSchema.safeParse(systemId);
      if (!parsed.success) {
        throw registryError(REGISTRY_ERRORS.INVALID_ID, `invalid systemId ${systemId}`);
      }
    }
    if (this.byId.has(systemId)) {
      throw registryError(
        REGISTRY_ERRORS.SYSTEM_DUPLICATE,
        `systemId ${systemId} already registered to another root`,
      );
    }

    const now = new Date().toISOString();
    const record: ConnectionRecord = {
      systemId,
      label: opts?.label ?? systemId,
      osType: OS_TYPE,
      osVersion: compat.osVersion ?? "unknown",
      architecture: compat.architecture ?? "unknown",
      root,
      authorized: true,
      registeredAt: now,
      lastValidatedAt: now,
    };
    this.byId.set(systemId, record);
    this.byRoot.set(root, systemId);
    return { ...record };
  }

  unregister(systemId: string): boolean {
    const record = this.byId.get(systemId);
    if (!record) return false;
    this.byId.delete(systemId);
    this.byRoot.delete(record.root);
    return true;
  }

  get(systemId: string): ConnectionRecord | undefined {
    const record = this.byId.get(systemId);
    return record ? { ...record } : undefined;
  }

  list(): ConnectionRecord[] {
    return [...this.byId.values()].map((r) => ({ ...r }));
  }

  listPublic(): PublicConnection[] {
    return this.list().map(toPublic);
  }

  has(systemId: string): boolean {
    return this.byId.has(systemId);
  }

  /**
   * Resolve systemId to its approved canonical root.
   * Unknown or unauthorized systems fail closed — never falls back
   * to another registered system (Blueprint Rule 8).
   */
  resolveRoot(systemId: string): string {
    const record = this.byId.get(systemId);
    if (!record) {
      throw registryError(
        REGISTRY_ERRORS.SYSTEM_NOT_REGISTERED,
        `unknown systemId ${systemId}`,
      );
    }
    if (!record.authorized) {
      throw registryError(
        REGISTRY_ERRORS.SYSTEM_UNAUTHORIZED,
        `systemId ${systemId} is not currently authorized`,
      );
    }
    return record.root;
  }

  /** Re-run the compatibility probe; marks unauthorized on failure. */
  revalidate(systemId: string): OsCompatibility {
    const record = this.byId.get(systemId);
    if (!record) {
      throw registryError(
        REGISTRY_ERRORS.SYSTEM_NOT_REGISTERED,
        `unknown systemId ${systemId}`,
      );
    }
    const compat = validateCompatibleOs(record.root);
    record.authorized = compat.compatible;
    record.lastValidatedAt = new Date().toISOString();
    return compat;
  }
}
