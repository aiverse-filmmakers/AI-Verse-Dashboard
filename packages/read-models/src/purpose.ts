import type { PurposeProjection } from "../../os-read-adapter/src/purpose.js";

export interface PurposeMissionView {
  available: boolean;
  missions: Record<string, unknown>[];
}

export interface PurposeGoalsView {
  available: boolean;
  goals: Record<string, unknown>[];
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

export interface PurposeMissionGoalsModel extends PurposeMissionModel {
  activeGoals: PurposeGoalsView;
}

function objects(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
}

/**
 * The existing Purpose view grows in place. Goal objects are already bounded
 * to current owner state by the canonical Purpose projection, so Dashboard
 * preserves owner status and refs rather than reclassifying them.
 */
export function buildPurposeMissionModel(projection: PurposeProjection): PurposeMissionGoalsModel {
  const missions = objects(projection.purpose?.missions);
  const goals = objects(projection.goals);
  return {
    readOnly: true,
    mission: {
      available: missions.length > 0,
      missions: missions.map((item) => structuredClone(item)),
    },
    activeGoals: {
      available: goals.length > 0,
      goals: goals.map((item) => structuredClone(item)),
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

export function buildPurposeMissionGoalsModel(projection: PurposeProjection): PurposeMissionGoalsModel {
  return buildPurposeMissionModel(projection);
}
