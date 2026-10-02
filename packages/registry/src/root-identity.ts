import { realpathSync, statSync } from "node:fs";
import { REGISTRY_ERRORS, registryError } from "./validation.js";

export interface RootIdentity {
  realpath: string;
  device: string;
  inode: string;
  birthtimeNs: string;
}

export function captureRootIdentity(root: string): RootIdentity {
  let realpath: string;
  try {
    realpath = realpathSync(root);
  } catch {
    throw registryError(REGISTRY_ERRORS.OS_NOT_FOUND, `OS root not found: ${root}`);
  }

  let stat;
  try {
    stat = statSync(realpath, { bigint: true });
  } catch {
    throw registryError(REGISTRY_ERRORS.OS_NOT_FOUND, `OS root not found: ${root}`);
  }
  if (!stat.isDirectory()) {
    throw registryError(REGISTRY_ERRORS.OS_NOT_DIRECTORY, `OS root is not a directory: ${root}`);
  }

  return {
    realpath,
    device: stat.dev.toString(),
    inode: stat.ino.toString(),
    birthtimeNs: stat.birthtimeNs.toString(),
  };
}

export function sameRootIdentity(left: RootIdentity, right: RootIdentity): boolean {
  return left.realpath === right.realpath
    && left.device === right.device
    && left.inode === right.inode
    && left.birthtimeNs === right.birthtimeNs;
}
