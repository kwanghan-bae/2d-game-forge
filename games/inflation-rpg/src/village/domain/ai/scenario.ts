import type {
  SupportAgentId,
  VillageAgentGoal,
  VillageSaveEnvelope,
  VillageWorldEvent,
} from '../../types';
import {
  advanceVillageWorld,
  getPendingVillageWorldEvents,
  resolveVillageWorldEvent,
} from './events';
import {
  getVillageAIBehaviorDiversity,
  getVillageAIBehaviorQuality,
  getVillageAIReplayFingerprint,
  type VillageAIBehaviorDiversity,
  type VillageAIBehaviorQuality,
} from './evaluation';
import {
  deterministicUnit,
  ensureVillageAIState,
  getVillageAIState,
  getVillageSimulationState,
  VILLAGE_SUPPORT_AGENT_IDS,
  Village_WORLD_DAY_MS,
} from './state';
import { cloneSave } from '../shared/saveMutation';

export const Village_AI_EVALUATION_DEFAULT_DAYS = 7;
export const Village_AI_EVALUATION_MAX_DAYS = 30;

export type VillageAIScenarioChoicePolicy = 'first' | 'last' | 'balanced';

export interface VillageAIScenarioOptions {
  /** Number of calendar steps to run; values are clamped to 0..30. */
  days?: number;
  /** Deterministic policy used when resolving each queued world event. */
  choicePolicy?: VillageAIScenarioChoicePolicy;
}

export interface VillageAIScenarioResult {
  save: VillageSaveEnvelope;
  seed: number;
  daysSimulated: number;
  generatedEventCount: number;
  chosenEventCount: number;
  expiredEventCount: number;
  decisionCount: number;
  pressureDecisionCount: number;
  agentGoalSwitchCount: number;
  crisisModeDecisionCount: number;
  replayFingerprint: string;
  behaviorDiversity: VillageAIBehaviorDiversity;
  behaviorQuality: VillageAIBehaviorQuality;
  /** UTF-16 code-unit length of the JSON save snapshot. */
  serializedSize: number;
  maxPendingEventCount: number;
  maxDecisionHistoryLength: number;
  /** Deterministic workload proxy: world steps + generated events + decisions. */
  evaluationWorkUnits: number;
}

interface ScenarioCounters {
  chosenEventCount: number;
  expiredEventCount: number;
  decisionCount: number;
  pressureDecisionCount: number;
  agentGoalSwitchCount: number;
  crisisModeDecisionCount: number;
}

interface ScenarioPeaks {
  maxPendingEventCount: number;
  maxDecisionHistoryLength: number;
}

function observeScenarioPeaks(save: VillageSaveEnvelope, peaks: ScenarioPeaks): void {
  const ai = getVillageAIState(save);
  const simulation = getVillageSimulationState(save);
  peaks.maxPendingEventCount = Math.max(peaks.maxPendingEventCount, ai.pendingEvents.length);
  peaks.maxDecisionHistoryLength = Math.max(peaks.maxDecisionHistoryLength, simulation.decisionHistory?.length ?? 0);
}

function normalizeDays(days: number | undefined): number {
  if (days === undefined || !Number.isFinite(days)) return Village_AI_EVALUATION_DEFAULT_DAYS;
  return Math.min(Village_AI_EVALUATION_MAX_DAYS, Math.max(0, Math.floor(days)));
}

function nextSafeTimestamp(value: number): number | null {
  if (!Number.isSafeInteger(value) || value < 0) return null;
  if (value >= Number.MAX_SAFE_INTEGER) return value;
  return value + 1;
}

function scenarioTimestamp(save: VillageSaveEnvelope, targetDay: number): number {
  const calendarOffset = targetDay * Village_WORLD_DAY_MS;
  const calendarTime = save.createdAt + calendarOffset;
  const minimum = nextSafeTimestamp(save.updatedAt) ?? save.updatedAt;
  return Number.isSafeInteger(calendarTime)
    ? Math.max(minimum, calendarTime)
    : minimum;
}

function eventResolutionTimestamp(save: VillageSaveEnvelope, event: VillageWorldEvent): number | null {
  const minimum = nextSafeTimestamp(save.updatedAt);
  if (minimum === null) return null;
  const requested = Math.max(minimum, event.createdAt);
  return requested <= event.expiresAt ? requested : event.expiresAt;
}

function choiceOrder(
  event: VillageWorldEvent,
  seed: number,
  policy: VillageAIScenarioChoicePolicy,
): number[] {
  const choiceCount = event.choices.length;
  if (choiceCount === 0) return [];
  const primary = policy === 'first'
    ? 0
    : policy === 'last'
      ? choiceCount - 1
      : Math.min(
        choiceCount - 1,
        Math.floor(deterministicUnit(`${seed}:scenario-choice:${event.id}`) * choiceCount),
      );
  return [
    primary,
    ...Array.from({ length: choiceCount }, (_, index) => index)
      .filter((index) => index !== primary),
  ];
}

function collectNewSimulationRecords(
  save: VillageSaveEnvelope,
  knownEventIds: Set<string>,
  knownDecisionIds: Set<string>,
  counters: ScenarioCounters,
  lastAgentGoals: Map<SupportAgentId, VillageAgentGoal>,
): void {
  const simulation = getVillageSimulationState(save);
  for (const record of simulation.eventHistory) {
    if (knownEventIds.has(record.eventId)) continue;
    knownEventIds.add(record.eventId);
    if (record.outcome === 'chosen') counters.chosenEventCount += 1;
    if (record.outcome === 'expired') counters.expiredEventCount += 1;
  }
  for (const record of simulation.decisionHistory ?? []) {
    if (knownDecisionIds.has(record.id)) continue;
    knownDecisionIds.add(record.id);
    counters.decisionCount += 1;
    if (record.reason === 'world_pressure') counters.pressureDecisionCount += 1;
    if (record.actor !== 'hero' && record.kind === 'agent_goal') {
      const nextGoal = record.value as VillageAgentGoal;
      const previousGoal = lastAgentGoals.get(record.actor);
      if (previousGoal !== undefined && previousGoal !== nextGoal) counters.agentGoalSwitchCount += 1;
      if (record.reason === 'world_pressure' && nextGoal === 'bond') counters.crisisModeDecisionCount += 1;
      lastAgentGoals.set(record.actor, nextGoal);
    }
  }
}

function resolveScenarioEvents(
  source: VillageSaveEnvelope,
  seed: number,
  policy: VillageAIScenarioChoicePolicy,
): VillageSaveEnvelope {
  let save = source;
  const pendingEvents = getPendingVillageWorldEvents(save);
  for (const event of pendingEvents) {
    const currentEvent = getVillageAIState(save).pendingEvents.find((candidate) => candidate.id === event.id);
    if (!currentEvent) continue;
    const now = eventResolutionTimestamp(save, currentEvent);
    if (now === null) continue;
    for (const choiceIndex of choiceOrder(currentEvent, seed, policy)) {
      const selectedChoice = currentEvent.choices[choiceIndex];
      if (!selectedChoice) continue;
      const result = resolveVillageWorldEvent(save, currentEvent.id, selectedChoice.id, now);
      if (result.ok) {
        save = result.save;
        break;
      }
    }
  }
  return save;
}

/**
 * Runs the existing local world, event, cognition, and support-agent systems
 * for a bounded deterministic horizon. This is an evaluator, not a runtime
 * loop: it returns a cloned save plus replay and storage metrics and never
 * calls an LLM or an external service.
 */
export function runVillageAIScenario(
  source: VillageSaveEnvelope,
  options: VillageAIScenarioOptions = {},
): VillageAIScenarioResult {
  let save = cloneSave(source);
  const ai = ensureVillageAIState(save);
  const horizon = normalizeDays(options.days);
  const choicePolicy = options.choicePolicy ?? 'balanced';
  const knownEventIds = new Set(getVillageSimulationState(save).eventHistory.map((record) => record.eventId));
  const knownDecisionIds = new Set((getVillageSimulationState(save).decisionHistory ?? []).map((record) => record.id));
  const lastAgentGoals = new Map<SupportAgentId, VillageAgentGoal>();
  for (const agentId of VILLAGE_SUPPORT_AGENT_IDS) {
    const goal = getVillageAIState(save).agentBrains?.[agentId]?.goal;
    if (goal) lastAgentGoals.set(agentId, goal);
  }
  const counters: ScenarioCounters = {
    chosenEventCount: 0,
    expiredEventCount: 0,
    decisionCount: 0,
    pressureDecisionCount: 0,
    agentGoalSwitchCount: 0,
    crisisModeDecisionCount: 0,
  };
  const peaks: ScenarioPeaks = {
    maxPendingEventCount: 0,
    maxDecisionHistoryLength: 0,
  };
  observeScenarioPeaks(save, peaks);
  const startDay = ai.world.lastSimulatedDay;
  let generatedEventCount = 0;

  for (let offset = 1; offset <= horizon; offset += 1) {
    const targetDay = startDay + offset;
    const advanced = advanceVillageWorld(save, scenarioTimestamp(save, targetDay));
    save = advanced.save;
    generatedEventCount += advanced.generatedEvents.length;
    observeScenarioPeaks(save, peaks);
    collectNewSimulationRecords(save, knownEventIds, knownDecisionIds, counters, lastAgentGoals);

    save = resolveScenarioEvents(save, ai.seed, choicePolicy);
    observeScenarioPeaks(save, peaks);
    collectNewSimulationRecords(save, knownEventIds, knownDecisionIds, counters, lastAgentGoals);
  }

  const serializedSize = JSON.stringify(save).length;
  const evaluationWorkUnits = horizon + generatedEventCount + counters.decisionCount;
  return {
    save,
    seed: ai.seed,
    daysSimulated: horizon,
    generatedEventCount,
    chosenEventCount: counters.chosenEventCount,
    expiredEventCount: counters.expiredEventCount,
    decisionCount: counters.decisionCount,
    pressureDecisionCount: counters.pressureDecisionCount,
    agentGoalSwitchCount: counters.agentGoalSwitchCount,
    crisisModeDecisionCount: counters.crisisModeDecisionCount,
    replayFingerprint: getVillageAIReplayFingerprint(save),
    behaviorDiversity: getVillageAIBehaviorDiversity(save),
    behaviorQuality: getVillageAIBehaviorQuality(save),
    serializedSize,
    maxPendingEventCount: peaks.maxPendingEventCount,
    maxDecisionHistoryLength: peaks.maxDecisionHistoryLength,
    evaluationWorkUnits,
  };
}
