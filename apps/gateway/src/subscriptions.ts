import { createHash } from "node:crypto";
import { workspaceScopeKey } from "../../../packages/protocol/src/index.js";
import type { DisposableCache } from "../../../packages/os-read-adapter/src/index.js";

/**
 * Subscription hub (Task 4, Blueprint §5 + Rule 6).
 * Subscriptions, dedupe, and seq are partitioned by systemId: an event for
 * system A is delivered only to A's subscribers, and identical workspace or
 * object ids in system B are unrelated streams. Dedupe suppresses identical
 * payloads within a short window; seq is monotonic per system.
 */

export interface HubEvent {
  event: string;
  systemId: string;
  workspaceId?: string;
  payload?: unknown;
}

export interface DeliveredEvent extends HubEvent {
  seq: number;
  observedAt: string;
}

type Listener = (event: DeliveredEvent) => void;

interface Sub {
  id: string;
  systemId: string;
  workspaceId?: string;
  listener: Listener;
}

const DEDUPE_WINDOW_MS = 1000;

export class SubscriptionHub {
  private subs = new Map<string, Sub>();
  private seqBySystem = new Map<string, number>();
  private seen = new Map<string, number>();
  private counter = 0;

  subscribe(systemId: string, listener: Listener, workspaceId?: string): string {
    this.counter += 1;
    const id = `sub-${this.counter}`;
    this.subs.set(id, { id, systemId, workspaceId, listener });
    return id;
  }

  unsubscribe(id: string): boolean {
    return this.subs.delete(id);
  }

  subscriberCount(systemId?: string): number {
    if (systemId === undefined) return this.subs.size;
    let n = 0;
    for (const s of this.subs.values()) if (s.systemId === systemId) n += 1;
    return n;
  }

  publish(event: HubEvent): DeliveredEvent | null {
    const key = workspaceScopeKey(
      event.systemId,
      event.workspaceId ?? "-",
      event.event,
      createHash("sha256").update(JSON.stringify(event.payload ?? null)).digest("hex").slice(0, 16),
    );
    const now = Date.now();
    const last = this.seen.get(key);
    if (last !== undefined && now - last < DEDUPE_WINDOW_MS) return null;
    this.seen.set(key, now);
    const seq = (this.seqBySystem.get(event.systemId) ?? 0) + 1;
    this.seqBySystem.set(event.systemId, seq);
    const delivered: DeliveredEvent = {
      ...event,
      seq,
      observedAt: new Date(now).toISOString(),
    };
    for (const sub of this.subs.values()) {
      if (sub.systemId !== event.systemId) continue;
      if (sub.workspaceId !== undefined && sub.workspaceId !== event.workspaceId) continue;
      sub.listener(delivered);
    }
    return delivered;
  }
}

/**
 * Filesystem watcher: publishes source.changed for exactly one
 * (systemId, workspaceId) and invalidates only that workspace's cache
 * entries. Non-recursive (node:fs watch); deeper trees revalidate on
 * next preview via mtime binding. Never touches another system.
 */
export async function watchWorkspace(
  workspaceRootReal: string,
  systemId: string,
  workspaceId: string,
  hub: SubscriptionHub,
  cache: DisposableCache,
): Promise<{ close(): void }> {
  const { watch } = await import("node:fs");
  const watcher = watch(workspaceRootReal, (eventType, filename) => {
    cache.invalidateWorkspace(systemId, workspaceId);
    hub.publish({
      event: "source.changed",
      systemId,
      workspaceId,
      payload: { change: String(eventType), file: String(filename ?? "") },
    });
  });
  return {
    close() {
      watcher.close();
    },
  };
}
