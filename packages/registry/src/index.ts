/**
 * @ai-verse/dashboard-registry — Dashboard-local OS connection registry (Task 2).
 *
 * Laws: compatible-OS validation before registration; systemId -> one
 * approved realpath root; per-window selection; unknown/unauthorized
 * systems fail closed with no fallback to another system.
 */
export {
  REQUIRED_OS_MAJOR,
  REQUIRED_ARCHITECTURE,
  OS_TYPE,
  MAX_MANIFEST_BYTES,
  REGISTRY_ERRORS,
  registryError,
  canonicalizeRoot,
  validateCompatibleOs,
} from "./validation.js";
export type { OsCompatibility, RegistryErrorCode } from "./validation.js";

export { SystemRegistry, toPublic } from "./registry.js";
export type { ConnectionRecord, PublicConnection } from "./registry.js";

export { SelectionStore } from "./selection.js";
export type { WindowSelection } from "./selection.js";
