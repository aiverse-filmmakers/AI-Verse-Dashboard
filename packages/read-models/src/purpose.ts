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

export function buildPurposeMissionModel(projection: PurposeProjection): PurposeMissionModel {
  const missions = objects(projection.purpose?.missions);
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

/**
 * Purpose goals are already current-owner projections. Brain's public Purpose
 * snapshot bounds goal intents to current statuses (CONFIRMED/ACTIVE/PAUSED),
 * while OS-owned workspace objectives are current by definition. Dashboard
 * therefore preserves the owner objects/statuses as-is instead of inventing a
 * second active/inactive classification.
 */
export function buildPurposeMissionGoalsModel(projection: PurposeProjection): PurposeMissionGoalsModel {
  const base = buildPurposeMissionModel(projection);
  const goals = objects(projection.goals);
  return {
    ...base,
    activeGoals: {
      available: goals.length > 0,
      goals: goals.map((item) => structuredClone(item)),
    },
  };
}
