export type HealthStatus = "healthy" | "warning" | "critical" | "unknown";
export type Freshness = "fresh" | "aging" | "stale" | "unknown";
export interface HealthEvidence { label: string; source: string }
export interface HealthCheck { id: string; label: string; status: HealthStatus; detail?: string }
export interface HealthDimension {
  id: string; label: string; status: HealthStatus; summary: string;
  evidence: HealthEvidence[]; checks: HealthCheck[];
  observedAt: string; sourceModifiedAt?: string; freshness: Freshness;
}
export interface HealthReport {
  systemId: string; workspaceId: string; dimensions: HealthDimension[];
  overall: HealthStatus; observedAt: string;
}
export const HEALTH_STALE_MS = 15 * 60 * 1000;
export function assessFreshness(sourceModifiedAt: string | undefined, nowMs: number): Freshness {
  if (!sourceModifiedAt) return "unknown";
  const t = Date.parse(sourceModifiedAt);
  if (Number.isNaN(t)) return "unknown";
  const age = nowMs - t;
  if (age < 0 || age < 5 * 60 * 1000) return "fresh";
  if (age < HEALTH_STALE_MS) return "aging";
  return "stale";
}
const RANK: Record<HealthStatus, number> = { healthy: 0, warning: 1, unknown: 2, critical: 3 };
export function buildHealthReport(systemId: string, workspaceId: string, dimensions: Omit<HealthDimension, "freshness" | "observedAt">[] & { observedAt?: string }[]): HealthReport {
  const now = new Date().toISOString();
  const nowMs = Date.parse(now);
  const dims: HealthDimension[] = dimensions.map((d) => ({
    ...d,
    observedAt: (d as { observedAt?: string }).observedAt ?? now,
    freshness: assessFreshness(d.sourceModifiedAt, nowMs),
  }));
  let overall: HealthStatus = "healthy";
  for (const d of dims) if (RANK[d.status] > RANK[overall]) overall = d.status;
  if (dims.length === 0) overall = "unknown";
  return { systemId, workspaceId, dimensions: dims, overall, observedAt: now };
}
