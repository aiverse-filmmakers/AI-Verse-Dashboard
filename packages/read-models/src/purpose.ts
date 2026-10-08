import type { PurposeProjection } from "../../os-read-adapter/src/purpose.js";

export interface PurposeMissionView {
  available: boolean;
  missions: Record<string, unknown>[];
}

export interface PurposeViewProvenance {
  projectionOwner: "ai-verse-os";
  scope: string;
  generatedAt: string;
  ownerReads: unknown[];
}

export interface PurposeMissionModel {
  readOnly: true;
  mission: PurposeMissionView;
  provenance: PurposeViewProvenance;
}

/**
 * Narrow the OS-owned Purpose projection to the first read-only UI slice.
 * No Dashboard truth is synthesized and no unrelated Purpose sections cross
 * the Gateway response boundary.
 */
export function buildPurposeMissionModel(projection: PurposeProjection): PurposeMissionModel {
  const raw = projection.purpose?.missions;
  const missions = Array.isArray(raw)
    ? raw.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
  return {
    readOnly: true,
    mission: {
      available: missions.length > 0,
      missions: missions.map((item) => structuredClone(item)),
    },
    provenance: {
      projectionOwner: "ai-verse-os",
      scope: projection.scope,
      generatedAt: projection.provenance.generated_at,
      ownerReads: Array.isArray(projection.provenance.owner_reads)
        ? structuredClone(projection.provenance.owner_reads)
        : [],
    },
  };
}
