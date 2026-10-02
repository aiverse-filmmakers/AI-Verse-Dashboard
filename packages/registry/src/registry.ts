import { isAbsolute, relative } from "node:path";
import { systemIdSchema } from "../../protocol/src/index.js";
import {
  captureRootIdentity,
  sameRootIdentity,
  type RootIdentity,
} from "./root-identity.js";
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
  /** Canonical realpath. Server-side only, never sent to clients. */
  root: string;
  /** Durable filesystem identity captured at explicit approval time. */
  rootIdentity: RootIdentity;
  /** Sticky once identity drift is observed; only explicit rebind clears it. */
  identityDrifted: boolean;
  authorized: boolean;
  registeredAt: string;
  lastValidatedAt: string;
}

/** Client-safe view: privileged root identity stays server-side. */
export interface PublicConnection {
  systemId: string;
  label: string;
  osType: string;
  osVersion: string;
  authorized: boolean;
  registeredAt: string;
  lastValidatedAt: string;
}

function cloneRecord(record: ConnectionRecord): ConnectionRecord {
  return { ...record, rootIdentity: { ...record.rootIdentity } };
}

export function toPublic(record: ConnectionRecord): PublicConnection {
  const {
    root: _root,
    rootIdentity: _rootIdentity,
    identityDrifted: _identityDrifted,
    architecture: _arch,
    ...pub
  } = record;
  void _root;
  void _rootIdentity;
  void _identityDrifted;
  void _arch;
  return pub;
}

const isWithin = (child: string, parent: string): boolean => {
  const rel = relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
};

interface ApprovedBinding {
  compat: OsCompatibility & { root: string };
  identity: RootIdentity;
}

function validateBindingCandidate(candidateRoot: string): ApprovedBinding {
  const first = validateCompatibleOs(candidateRoot);
  if (!first.compatible || first.root === null) {
    throw registryError(
      REGISTRY_ERRORS.OS_INCOMPATIBLE,
      `incompatible OS at ${candidateRoot}: ${first.reasons.join("; ")}`,
    );
  }

  const firstIdentity = captureRootIdentity(first.root);
  const second = validateCompatibleOs(firstIdentity.realpath);
  if (!second.compatible || second.root === null) {
    throw registryError(
      REGISTRY_ERRORS.OS_INCOMPATIBLE,
      `OS root changed during approval: ${candidateRoot}`,
    );
  }
  const secondIdentity = captureRootIdentity(second.root);
  if (!sameRootIdentity(firstIdentity, secondIdentity)) {
    throw registryError(
      REGISTRY_ERRORS.OS_INCOMPATIBLE,
      `OS root identity changed during approval: ${candidateRoot}`,
    );
  }

  return {
    compat: { ...second, root: second.root },
    identity: secondIdentity,
  };
}

export class SystemRegistry {
  private readonly byId = new Map<string, ConnectionRecord>();
  private readonly byRoot = new Map<string, string>();
  private counter = 0;

  private assertNoOverlap(root: string, ownSystemId?: string): void {
    const existingId = this.byRoot.get(root);
    if (existingId !== undefined && existingId !== ownSystemId) {
      throw registryError(
        REGISTRY_ERRORS.SYSTEM_DUPLICATE,
        `OS root already registered as ${existingId}`,
      );
    }
    for (const [otherRoot, otherId] of this.byRoot) {
      if (otherId === ownSystemId) continue;
      if (isWithin(root, otherRoot) || isWithin(otherRoot, root)) {
        throw registryError(
          REGISTRY_ERRORS.SYSTEM_OVERLAP,
          `OS root overlaps registered system ${otherId}`,
        );
      }
    }
  }

  private markIdentityDrift(record: ConnectionRecord, reason: string): never {
    record.authorized = false;
    record.identityDrifted = true;
    record.lastValidatedAt = new Date().toISOString();
    throw registryError(
      REGISTRY_ERRORS.SYSTEM_IDENTITY_DRIFT,
      `systemId ${record.systemId} registered-root identity changed: ${reason}; explicit rebind required`,
    );
  }

  private assertRootBinding(record: ConnectionRecord): void {
    let current: RootIdentity;
    try {
      current = captureRootIdentity(record.root);
    } catch {
      this.markIdentityDrift(record, "approved root is missing or unusable");
    }
    if (!sameRootIdentity(record.rootIdentity, current)) {
      this.markIdentityDrift(record, "approved filesystem object no longer matches registration");
    }
  }

  register(candidateRoot: string, opts?: { systemId?: string; label?: string }): ConnectionRecord {
    const approved = validateBindingCandidate(candidateRoot);
    const root = approved.compat.root;
    this.assertNoOverlap(root);

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
      osVersion: approved.compat.osVersion ?? "unknown",
      architecture: approved.compat.architecture ?? "unknown",
      root,
      rootIdentity: { ...approved.identity },
      identityDrifted: false,
      authorized: true,
      registeredAt: now,
      lastValidatedAt: now,
    };
    this.byId.set(systemId, record);
    this.byRoot.set(root, systemId);
    return cloneRecord(record);
  }

  /**
   * Explicitly approve a root for an existing systemId.
   * This is the only operation that clears sticky identity drift.
   */
  rebind(systemId: string, candidateRoot: string): ConnectionRecord {
    const record = this.byId.get(systemId);
    if (!record) {
      throw registryError(
        REGISTRY_ERRORS.SYSTEM_NOT_REGISTERED,
        `unknown systemId ${systemId}`,
      );
    }

    const approved = validateBindingCandidate(candidateRoot);
    const root = approved.compat.root;
    this.assertNoOverlap(root, systemId);

    if (this.byRoot.get(record.root) === systemId) this.byRoot.delete(record.root);

    record.root = root;
    record.rootIdentity = { ...approved.identity };
    record.identityDrifted = false;
    record.authorized = true;
    record.osType = OS_TYPE;
    record.osVersion = approved.compat.osVersion ?? "unknown";
    record.architecture = approved.compat.architecture ?? "unknown";
    record.lastValidatedAt = new Date().toISOString();

    this.byRoot.set(root, systemId);
    return cloneRecord(record);
  }

  unregister(systemId: string): boolean {
    const record = this.byId.get(systemId);
    if (!record) return false;
    this.byId.delete(systemId);
    if (this.byRoot.get(record.root) === systemId) this.byRoot.delete(record.root);
    return true;
  }

  get(systemId: string): ConnectionRecord | undefined {
    const record = this.byId.get(systemId);
    return record ? cloneRecord(record) : undefined;
  }

  list(): ConnectionRecord[] {
    return [...this.byId.values()].map(cloneRecord);
  }

  listPublic(): PublicConnection[] {
    return this.list().map(toPublic);
  }

  has(systemId: string): boolean {
    return this.byId.has(systemId);
  }

  /**
   * Resolve systemId to its approved canonical root.
   * Unknown, unauthorized or identity-drifted systems fail closed.
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

    this.assertRootBinding(record);
    return record.root;
  }

  /**
   * Re-run compatibility without changing the approved filesystem identity.
   * Identity drift is sticky and can only be cleared by explicit rebind().
   */
  revalidate(systemId: string): OsCompatibility {
    const record = this.byId.get(systemId);
    if (!record) {
      throw registryError(
        REGISTRY_ERRORS.SYSTEM_NOT_REGISTERED,
        `unknown systemId ${systemId}`,
      );
    }

    if (record.identityDrifted) {
      return {
        compatible: false,
        osType: null,
        osVersion: record.osVersion,
        architecture: record.architecture,
        root: record.root,
        reasons: ["registered root identity changed; explicit rebind required"],
      };
    }

    try {
      this.assertRootBinding(record);
    } catch (err) {
      if ((err as { code?: string }).code !== REGISTRY_ERRORS.SYSTEM_IDENTITY_DRIFT) throw err;
      return {
        compatible: false,
        osType: null,
        osVersion: record.osVersion,
        architecture: record.architecture,
        root: record.root,
        reasons: ["registered root identity changed; explicit rebind required"],
      };
    }

    const compat = validateCompatibleOs(record.root);
    record.authorized = compat.compatible;
    record.lastValidatedAt = new Date().toISOString();
    return compat;
  }
}
