import type {
  VillageAIDecisionRecord,
  VillageAgentMemory,
  VillageAIState,
  VillageMemory,
  VillageSaveEnvelope,
  VillageSimulationState,
  VillageWorldEvent,
  VillageWorldEventRecord,
} from '../../types';
import { getVillageAIState, getVillageSimulationState } from './state';

export interface VillageAIReplayAudit {
  matches: boolean;
  leftFingerprint: string;
  rightFingerprint: string;
  differences: string[];
}

export interface VillageAIBehaviorDiversity {
  decisionCount: number;
  distinctDecisionKinds: number;
  distinctAgentGoals: number;
  distinctEventChoices: number;
  distinctEventTypes: number;
  diversityScore: number;
}

type ReplayProjection = {
  seed: number;
  world: VillageAIState['world'];
  hero: unknown;
  pendingEvents: unknown[];
  resolvedEventIds: string[];
  agentBrains: unknown;
  simulation: unknown;
};

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
      .map(([key, nested]) => [key, canonicalize(nested)]),
  );
}

function hashCanonical(value: unknown): string {
  const serialized = JSON.stringify(canonicalize(value));
  let hash = 2_166_136_261;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return `v1-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function replayMemory(memory: VillageMemory | VillageAgentMemory): Omit<typeof memory, 'createdAt'> {
  const { createdAt: _createdAt, ...stableMemory } = memory;
  return stableMemory;
}

function replayEvent(event: VillageWorldEvent): Omit<VillageWorldEvent, 'createdAt' | 'expiresAt'> {
  const { createdAt: _createdAt, expiresAt: _expiresAt, ...stableEvent } = event;
  return stableEvent;
}

function replayEventRecord(record: VillageWorldEventRecord): Omit<VillageWorldEventRecord, 'resolvedAt'> {
  const { resolvedAt: _resolvedAt, ...stableRecord } = record;
  return stableRecord;
}

function replayDecision(record: VillageAIDecisionRecord): Omit<VillageAIDecisionRecord, 'decidedAt'> {
  const { decidedAt: _decidedAt, ...stableRecord } = record;
  return stableRecord;
}

function replaySimulation(simulation: VillageSimulationState): unknown {
  return {
    seed: simulation.seed,
    tick: simulation.tick,
    eventHistory: simulation.eventHistory.map(replayEventRecord),
    decisionHistory: (simulation.decisionHistory ?? []).map(replayDecision),
  };
}

function replayHero(ai: VillageAIState): unknown {
  return {
    personality: ai.hero.personality,
    needs: ai.hero.needs,
    currentGoal: ai.hero.currentGoal,
    memories: ai.hero.memories.map(replayMemory),
    lastDecision: ai.hero.lastDecision
      ? (({ decidedAt: _decidedAt, ...stableDecision }) => stableDecision)(ai.hero.lastDecision)
      : null,
  };
}

function replayAgentBrains(ai: VillageAIState): unknown {
  return Object.fromEntries(
    Object.entries(ai.agentBrains ?? {}).map(([agentId, brain]) => [agentId, {
      ...brain,
      schedule: brain.schedule,
      cognition: brain.cognition
        ? {
          ...brain.cognition,
          memories: brain.cognition.memories.map(replayMemory),
        }
        : undefined,
    }]),
  );
}

function createReplayProjection(source: VillageSaveEnvelope): ReplayProjection {
  const ai = getVillageAIState(source);
  const simulation = getVillageSimulationState(source);
  return {
    seed: ai.seed,
    world: ai.world,
    hero: replayHero(ai),
    pendingEvents: ai.pendingEvents.map(replayEvent),
    resolvedEventIds: ai.resolvedEventIds,
    agentBrains: replayAgentBrains(ai),
    simulation: replaySimulation(simulation),
  };
}

export function getVillageAIReplayFingerprint(source: VillageSaveEnvelope): string {
  return hashCanonical(createReplayProjection(source));
}

export function compareVillageAIReplay(
  left: VillageSaveEnvelope,
  right: VillageSaveEnvelope,
): VillageAIReplayAudit {
  const leftProjection = createReplayProjection(left);
  const rightProjection = createReplayProjection(right);
  const differences = (Object.keys(leftProjection) as Array<keyof ReplayProjection>)
    .filter((key) => JSON.stringify(canonicalize(leftProjection[key]))
      !== JSON.stringify(canonicalize(rightProjection[key])))
    .map(String);
  return {
    matches: differences.length === 0,
    leftFingerprint: hashCanonical(leftProjection),
    rightFingerprint: hashCanonical(rightProjection),
    differences,
  };
}

function diversityCoverage(distinct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(1, distinct / Math.min(6, total));
}

export function getVillageAIBehaviorDiversity(source: VillageSaveEnvelope): VillageAIBehaviorDiversity {
  const simulation = getVillageSimulationState(source);
  const decisions = simulation.decisionHistory ?? [];
  const agentDecisions = decisions.filter((record) => record.actor !== 'hero');
  const chosenEvents = simulation.eventHistory.filter((record) => record.outcome === 'chosen');
  const distinctDecisionKinds = new Set(decisions.map((record) => `${record.kind}:${record.value}`)).size;
  const distinctAgentGoals = new Set(agentDecisions.map((record) => `${record.actor}:${record.value}`)).size;
  const distinctEventChoices = new Set(chosenEvents.map((record) => `${record.type}:${record.choiceId}`)).size;
  const distinctEventTypes = new Set(simulation.eventHistory.map((record) => record.type)).size;
  const diversityScore = Number((
    (
      diversityCoverage(distinctDecisionKinds, decisions.length)
      + diversityCoverage(distinctAgentGoals, agentDecisions.length)
      + diversityCoverage(distinctEventChoices, chosenEvents.length)
      + diversityCoverage(distinctEventTypes, simulation.eventHistory.length)
    ) / 4
  ).toFixed(3));
  return {
    decisionCount: decisions.length,
    distinctDecisionKinds,
    distinctAgentGoals,
    distinctEventChoices,
    distinctEventTypes,
    diversityScore,
  };
}
