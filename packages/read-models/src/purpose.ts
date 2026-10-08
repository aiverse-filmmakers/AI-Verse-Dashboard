import type { PurposeProjection } from "../../os-read-adapter/src/purpose.js";

export interface PurposeMissionView {
  available: boolean;
  missions: Record<string, unknown>[];
}

export interface PurposeGoalsView {
  available: boolean;
  goals: Record<string, unknown>[];
}

export interface PurposeStrategiesView {
  available: boolean;
  strategies: Record<string, unknown>[];
}

export interface PurposeInitiativesView {
  available: boolean;
  initiatives: Record<string, unknown>[];
}

export interface PurposeChallengesView {
  available: boolean;
  challenges: Record<string, unknown>[];
}

export interface PurposeRisksView {
  available: boolean;
  risks: Record<string, unknown>[];
}

export interface PurposeKpisView {
  available: boolean;
  kpis: Record<string, unknown>[];
}

export interface PurposeCurrentWorkView {
  available: boolean;
  work: Record<string, unknown>[];
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

export interface PurposeMissionGoalsStrategiesModel extends PurposeMissionGoalsModel {
  currentStrategies: PurposeStrategiesView;
  currentInitiatives: PurposeInitiativesView;
  keyChallenges: PurposeChallengesView;
  keyRisks: PurposeRisksView;
  kpis: PurposeKpisView;
  currentWork: PurposeCurrentWorkView;
}

function objects(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
}

/**
 * The existing Purpose view grows in place. Dashboard preserves owner objects,
 * statuses, payloads, refs, and ordering rather than creating strategic truth.
 */
export function buildPurposeMissionModel(projection: PurposeProjection): PurposeMissionGoalsStrategiesModel {
  const missions = objects(projection.purpose?.missions);
  const goals = objects(projection.goals);
  const strategies = objects(projection.strategies);
  const initiatives = objects(projection.initiatives);
  const challenges = objects(projection.challenges);
  const risks = objects(projection.risks);
  const kpis = objects(projection.kpis);
  const currentWork = objects(projection.current_work);
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
    currentStrategies: {
      available: strategies.length > 0,
      strategies: strategies.map((item) => structuredClone(item)),
    },
    currentInitiatives: {
      available: initiatives.length > 0,
      initiatives: initiatives.map((item) => structuredClone(item)),
    },
    keyChallenges: {
      available: challenges.length > 0,
      challenges: challenges.map((item) => structuredClone(item)),
    },
    keyRisks: {
      available: risks.length > 0,
      risks: risks.map((item) => structuredClone(item)),
    },
    kpis: {
      available: kpis.length > 0,
      kpis: kpis.map((item) => structuredClone(item)),
    },
    currentWork: {
      available: currentWork.length > 0,
      work: currentWork.map((item) => structuredClone(item)),
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

export function buildPurposeMissionGoalsModel(projection: PurposeProjection): PurposeMissionGoalsStrategiesModel {
  return buildPurposeMissionModel(projection);
}

export function buildPurposeMissionGoalsStrategiesModel(projection: PurposeProjection): PurposeMissionGoalsStrategiesModel {
  return buildPurposeMissionModel(projection);
}
