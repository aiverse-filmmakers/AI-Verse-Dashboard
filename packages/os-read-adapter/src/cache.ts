import { scopeKey } from "../../protocol/src/index.js";

/**
 * Disposable projection cache (Task 3, Blueprint Rule 6).
 * Every key is namespaced by systemId first; switching systems can never
 * reuse another system's projection. File projections additionally bind
 * mtime+size so stale entries miss instead of serving old state.
 * Deleting the cache never touches any registered OS.
 */

interface Entry {
  value: unknown;
  atMs: number;
  ttlMs: number;
}

export class DisposableCache {
  private readonly entries = new Map<string, Entry>();
  private hits = 0;
  private misses = 0;

  set(systemId: string, parts: string[], value: unknown, ttlMs = 60_000): string {
    const key = scopeKey(systemId, ...parts);
    this.entries.set(key, { value, atMs: Date.now(), ttlMs });
    return key;
  }

  get(systemId: string, parts: string[]): unknown | undefined {
    const key = scopeKey(systemId, ...parts);
    const entry = this.entries.get(key);
    if (!entry) {
      this.misses += 1;
      return undefined;
    }
    if (Date.now() - entry.atMs > entry.ttlMs) {
      this.entries.delete(key);
      this.misses += 1;
      return undefined;
    }
    this.hits += 1;
    return entry.value;
  }

  putProjection(
    systemId: string,
    workspaceId: string,
    relativePath: string,
    mtimeMs: number,
    size: number,
    projection: unknown,
    ttlMs = 60_000,
  ): void {
    this.set(
      systemId,
      ["proj", workspaceId, relativePath, String(mtimeMs), String(size)],
      projection,
      ttlMs,
    );
  }

  getProjection(
    systemId: string,
    workspaceId: string,
    relativePath: string,
    mtimeMs: number,
    size: number,
  ): unknown | undefined {
    return this.get(systemId, ["proj", workspaceId, relativePath, String(mtimeMs), String(size)]);
  }

  /** Drop everything belonging to one system (e.g. on switch/unregister). */
  invalidateSystem(systemId: string): number {
    const prefix = `${systemId}:`;
    let dropped = 0;
    for (const key of [...this.entries.keys()]) {
      if (key === systemId || key.startsWith(prefix)) {
        this.entries.delete(key);
        dropped += 1;
      }
    }
    return dropped;
  }

  invalidateWorkspace(systemId: string, workspaceId: string): number {
    const prefix = `${systemId}:${workspaceId}:`;
    let dropped = 0;
    for (const key of [...this.entries.keys()]) {
      if (key.startsWith(prefix)) {
        this.entries.delete(key);
        dropped += 1;
      }
    }
    return dropped;
  }

  clear(): void {
    this.entries.clear();
  }

  stats(): { entries: number; hits: number; misses: number } {
    return { entries: this.entries.size, hits: this.hits, misses: this.misses };
  }
}
