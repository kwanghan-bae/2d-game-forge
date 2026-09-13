import { REALM_IDS } from '../../data';
import type {
  HeroAction,
  HeroAutonomyDecision,
  HeroAutonomyReason,
  RealmId,
  VillageAIState,
  VillageHeroGoal,
  VillageHeroPersonality,
  VillageMemory,
  VillageMemoryTag,
  VillageSaveEnvelope,
  VillageSeason,
  VillageSimulationState,
  VillageWeather,
  VillageWorldEvent,
  VillageWorldEventChoice,
  VillageWorldEventEffects,
  VillageWorldEventOutcome,
  VillageWorldEventRecord,
} from '../../types';
import {
  Village_MAX_AI_MEMORIES,
  Village_MAX_PENDING_WORLD_EVENTS,
  Village_MAX_RESOLVED_WORLD_EVENTS,
  Village_MAX_WORLD_EVENT_HISTORY,
  Village_SIMULATION_VERSION,
} from '../../types';

export const Village_WORLD_DAY_MS = 10 * 60 * 1000;
export const Village_WORLD_SEASON_DAYS = 7;

const MAX_PERSISTED_NUMBER = Number.MAX_SAFE_INTEGER;
const SEASONS: readonly VillageSeason[] = ['spring', 'summer', 'autumn', 'winter'];
const WEATHERS: readonly VillageWeather[] = ['clear', 'rain', 'fog', 'wind'];
const HERO_GOALS: readonly VillageHeroGoal[] = ['recover', 'prepare', 'explore', 'support'];
const MEMORY_TAGS: readonly VillageMemoryTag[] = ['victory', 'defeat', 'support', 'event', 'choice'];
const HERO_ACTIONS: readonly HeroAction[] = ['rest', 'train', 'expedition'];
const EVENT_TYPES: readonly VillageWorldEvent['type'][] = ['weather', 'social', 'supply', 'omen'];
const EVENT_OUTCOMES: readonly VillageWorldEventOutcome[] = ['chosen', 'expired'];
const HERO_REASONS: readonly HeroAutonomyReason[] = [
  'intervention_window',
  'low_hp',
  'aggression_policy',
  'hoarding_policy',
  'training_policy',
  'active_work',
  'active_expedition',
  'result_confirmation',
  'realm_confirmation',
  'world_event',
  'insufficient_resources',
  'invalid_clock',
  'no_action',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isBoundedNumber(value: unknown, min: number, max: number): value is number {
  return isFiniteNumber(value) && value >= min && value <= max;
}

function isPersistedNumber(value: unknown): value is number {
  return isFiniteNumber(value) && Math.abs(value) <= MAX_PERSISTED_NUMBER;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isOneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && values.includes(value as T);
}

/** A stable, platform-independent unit interval used by the local simulator. */
export function deterministicUnit(key: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0) / 4_294_967_296;
}

function boundedTrait(seed: number, key: string): number {
  return 35 + Math.floor(deterministicUnit(`${seed}:${key}`) * 46);
}

function defaultPersonality(seed: number): VillageHeroPersonality {
  return {
    courage: boundedTrait(seed, 'courage'),
    caution: boundedTrait(seed, 'caution'),
    compassion: boundedTrait(seed, 'compassion'),
    curiosity: boundedTrait(seed, 'curiosity'),
  };
}

function defaultWorld(): VillageAIState['world'] {
  return {
    day: 0,
    season: 'spring',
    weather: 'clear',
    prosperity: 50,
    threatByRealm: {
      sacred_fields: 0.08,
      deep_forest: 0.22,
      underworld: 0.45,
    },
    lastSimulatedDay: 0,
  };
}

export function createVillageAIState(seed: number, createdAt: number): VillageAIState {
  const safeSeed = isPersistedNumber(seed)
    ? Math.floor(Math.abs(seed))
    : isPersistedNumber(createdAt) ? Math.floor(Math.abs(createdAt)) : 0;
  const personality = defaultPersonality(safeSeed);
  return {
    version: 1,
    seed: safeSeed,
    world: defaultWorld(),
    hero: {
      personality,
      needs: { fatigue: 0, morale: 60, purpose: 55 },
      currentGoal: 'explore',
      memories: [],
      lastDecision: null,
    },
    pendingEvents: [],
    resolvedEventIds: [],
  };
}

export function createVillageSimulationState(
  seed: number,
  createdAt: number,
  tick = 0,
  lastSimulatedAt = createdAt,
): VillageSimulationState {
  const safeSeed = isPersistedNumber(seed)
    ? Math.floor(Math.abs(seed))
    : isPersistedNumber(createdAt) ? Math.floor(Math.abs(createdAt)) : 0;
  const safeTick = isPersistedNumber(tick) && Number.isInteger(tick) && tick >= 0 ? tick : 0;
  const safeLastSimulatedAt = isPersistedNumber(lastSimulatedAt) ? lastSimulatedAt : 0;
  return {
    version: Village_SIMULATION_VERSION,
    seed: safeSeed,
    tick: safeTick,
    lastSimulatedAt: safeLastSimulatedAt,
    eventHistory: [],
  };
}

export function getVillageWorldDay(createdAt: number, now: number): number {
  if (!isPersistedNumber(createdAt) || !isPersistedNumber(now) || now < createdAt) return 0;
  return Math.max(0, Math.floor((now - createdAt) / Village_WORLD_DAY_MS));
}

export function getVillageSeason(day: number): VillageSeason {
  const safeDay = Number.isFinite(day) && day >= 0 ? Math.floor(day) : 0;
  return SEASONS[Math.floor(safeDay / Village_WORLD_SEASON_DAYS) % SEASONS.length] ?? 'spring';
}

export function getVillageWeather(seed: number, day: number): VillageWeather {
  const index = Math.floor(deterministicUnit(`${seed}:weather:${day}`) * WEATHERS.length);
  return WEATHERS[Math.min(WEATHERS.length - 1, Math.max(0, index))] ?? 'clear';
}

function isValidMemory(value: unknown): value is VillageMemory {
  return isRecord(value)
    && isNonEmptyString(value.id)
    && isOneOf(MEMORY_TAGS, value.tag)
    && isNonEmptyString(value.summary)
    && isBoundedNumber(value.valence, -1, 1)
    && isBoundedNumber(value.salience, 0, 1)
    && isPersistedNumber(value.createdAt);
}

function isValidEventEffects(value: unknown): value is VillageWorldEventEffects {
  if (!isRecord(value)) return false;
  const currencyDelta = value.currencyDelta;
  if (currencyDelta !== undefined && (!isRecord(currencyDelta)
    || Object.entries(currencyDelta).some(([key, amount]) => (
      !['spirit', 'gold', 'materials', 'rift'].includes(key)
      || !isPersistedNumber(amount)
      || Math.abs(amount) > 1_000
    )))) return false;
  const agentTrustDelta = value.agentTrustDelta;
  if (agentTrustDelta !== undefined && (!isRecord(agentTrustDelta)
    || Object.entries(agentTrustDelta).some(([key, amount]) => (
      !['blacksmith', 'mudang', 'guide'].includes(key)
      || !isPersistedNumber(amount)
      || Math.abs(amount) > 100
    )))) return false;
  const agentFatigueDelta = value.agentFatigueDelta;
  if (agentFatigueDelta !== undefined && (!isRecord(agentFatigueDelta)
    || Object.entries(agentFatigueDelta).some(([key, amount]) => (
      !['blacksmith', 'mudang', 'guide'].includes(key)
      || !isPersistedNumber(amount)
      || Math.abs(amount) > 100
    )))) return false;
  const realmThreatDelta = value.realmThreatDelta;
  if (realmThreatDelta !== undefined && (!isRecord(realmThreatDelta)
    || Object.entries(realmThreatDelta).some(([key, amount]) => (
      !REALM_IDS.includes(key as RealmId)
      || !isPersistedNumber(amount)
      || Math.abs(amount) > 1
    )))) return false;
  return [value.heroMoraleDelta, value.heroFatigueDelta, value.heroPurposeDelta, value.prosperityDelta]
    .every((item) => item === undefined || (isPersistedNumber(item) && Math.abs(item) <= 100));
}

function isValidEventChoice(value: unknown): value is VillageWorldEventChoice {
  return isRecord(value)
    && isNonEmptyString(value.id)
    && isNonEmptyString(value.title)
    && isNonEmptyString(value.text)
    && isValidEventEffects(value.effects);
}

export function isValidVillageWorldEvent(value: unknown): value is VillageWorldEvent {
  return isRecord(value)
    && isNonEmptyString(value.id)
    && isOneOf(EVENT_TYPES, value.type)
    && isPersistedNumber(value.day)
    && Number.isInteger(value.day)
    && isPersistedNumber(value.createdAt)
    && isPersistedNumber(value.expiresAt)
    && value.expiresAt > value.createdAt
    && isNonEmptyString(value.title)
    && isNonEmptyString(value.cause)
    && isNonEmptyString(value.prompt)
    && Array.isArray(value.choices)
    && value.choices.length >= 2
    && value.choices.length <= 3
    && value.choices.every(isValidEventChoice)
    && new Set(value.choices.map((choice) => choice.id)).size === value.choices.length;
}

function isValidVillageWorldEventRecord(value: unknown): value is VillageWorldEventRecord {
  if (!isRecord(value)
    || !isNonEmptyString(value.eventId)
    || !isOneOf(EVENT_TYPES, value.type)
    || !isPersistedNumber(value.day)
    || !Number.isInteger(value.day)
    || value.day < 0
    || !isOneOf(EVENT_OUTCOMES, value.outcome)
    || !isPersistedNumber(value.resolvedAt)) return false;
  return value.outcome === 'expired'
    ? value.choiceId === null
    : isNonEmptyString(value.choiceId);
}

export function isValidVillageSimulationState(value: unknown): value is VillageSimulationState {
  return isRecord(value)
    && value.version === Village_SIMULATION_VERSION
    && isPersistedNumber(value.seed)
    && Number.isInteger(value.seed)
    && value.seed >= 0
    && isPersistedNumber(value.tick)
    && Number.isInteger(value.tick)
    && value.tick >= 0
    && isPersistedNumber(value.lastSimulatedAt)
    && Array.isArray(value.eventHistory)
    && value.eventHistory.length <= Village_MAX_WORLD_EVENT_HISTORY
    && value.eventHistory.every(isValidVillageWorldEventRecord)
    && new Set(value.eventHistory.map((record) => record.eventId)).size === value.eventHistory.length;
}

export function isValidVillageAIState(value: unknown): value is VillageAIState {
  if (!isRecord(value) || value.version !== 1 || !isPersistedNumber(value.seed)
    || !Number.isInteger(value.seed) || value.seed < 0) return false;
  const world = value.world;
  const threatByRealm = isRecord(world) ? world.threatByRealm : undefined;
  if (!isRecord(world)
    || !isPersistedNumber(world.day) || !Number.isInteger(world.day) || world.day < 0
    || !isOneOf(SEASONS, world.season)
    || !isOneOf(WEATHERS, world.weather)
    || !isBoundedNumber(world.prosperity, 0, 100)
    || !isPersistedNumber(world.lastSimulatedDay)
    || !Number.isInteger(world.lastSimulatedDay)
    || world.lastSimulatedDay < 0
    || !isRecord(threatByRealm)
    || !REALM_IDS.every((id) => isBoundedNumber(threatByRealm[id], 0, 1))) return false;

  const hero = value.hero;
  if (!isRecord(hero) || !isRecord(hero.personality) || !isRecord(hero.needs)
    || !isOneOf(HERO_GOALS, hero.currentGoal)
    || !isBoundedNumber(hero.personality.courage, 0, 100)
    || !isBoundedNumber(hero.personality.caution, 0, 100)
    || !isBoundedNumber(hero.personality.compassion, 0, 100)
    || !isBoundedNumber(hero.personality.curiosity, 0, 100)
    || !isBoundedNumber(hero.needs.fatigue, 0, 100)
    || !isBoundedNumber(hero.needs.morale, 0, 100)
    || !isBoundedNumber(hero.needs.purpose, 0, 100)
    || !Array.isArray(hero.memories)
    || hero.memories.length > Village_MAX_AI_MEMORIES
    || !hero.memories.every(isValidMemory)) return false;

  if (hero.lastDecision !== null) {
    const decision = hero.lastDecision;
    if (!isRecord(decision)
      || !isOneOf(HERO_ACTIONS, decision.action)
      || !isOneOf(HERO_REASONS, decision.reason)
      || !isBoundedNumber(decision.confidence, 0, 1)
      || !isPersistedNumber(decision.decidedAt)) return false;
  }

  return Array.isArray(value.pendingEvents)
    && value.pendingEvents.length <= Village_MAX_PENDING_WORLD_EVENTS
    && value.pendingEvents.every(isValidVillageWorldEvent)
    && new Set(value.pendingEvents.map((event) => event.id)).size === value.pendingEvents.length
    && Array.isArray(value.resolvedEventIds)
    && value.resolvedEventIds.length <= Village_MAX_RESOLVED_WORLD_EVENTS
    && value.resolvedEventIds.every(isNonEmptyString)
    && new Set(value.resolvedEventIds).size === value.resolvedEventIds.length;
}

export function getVillageAIState(source: VillageSaveEnvelope): VillageAIState {
  return source.meta.ai && isValidVillageAIState(source.meta.ai)
    ? source.meta.ai
    : createVillageAIState(source.createdAt, source.createdAt);
}

export function ensureVillageAIState(save: VillageSaveEnvelope): VillageAIState {
  if (!save.meta.ai || !isValidVillageAIState(save.meta.ai)) {
    save.meta.ai = createVillageAIState(save.createdAt, save.createdAt);
  }
  return save.meta.ai;
}

export function getVillageSimulationState(source: VillageSaveEnvelope): VillageSimulationState {
  return source.meta.simulation
    && isValidVillageSimulationState(source.meta.simulation)
    && source.meta.simulation.seed === getVillageAIState(source).seed
    && source.meta.simulation.tick <= getVillageAIState(source).world.lastSimulatedDay
    ? source.meta.simulation
    : createVillageSimulationState(getVillageAIState(source).seed, source.createdAt, 0, source.createdAt);
}

export function ensureVillageSimulationState(save: VillageSaveEnvelope): VillageSimulationState {
  const ai = ensureVillageAIState(save);
  if (!save.meta.simulation
    || !isValidVillageSimulationState(save.meta.simulation)
    || save.meta.simulation.seed !== ai.seed
    || save.meta.simulation.tick > ai.world.lastSimulatedDay) {
    save.meta.simulation = createVillageSimulationState(ai.seed, save.createdAt, ai.world.lastSimulatedDay);
  }
  return save.meta.simulation;
}

export function recordVillageSimulationEvent(
  save: VillageSaveEnvelope,
  record: VillageWorldEventRecord,
): void {
  const simulation = ensureVillageSimulationState(save);
  if (!isValidVillageWorldEventRecord(record)) return;
  simulation.eventHistory = [
    record,
    ...simulation.eventHistory.filter((candidate) => candidate.eventId !== record.eventId),
  ].slice(0, Village_MAX_WORLD_EVENT_HISTORY);
  simulation.tick = Math.max(simulation.tick, record.day);
  simulation.lastSimulatedAt = Math.max(simulation.lastSimulatedAt, record.resolvedAt);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function recordVillageAIMemory(
  save: VillageSaveEnvelope,
  tag: VillageMemoryTag,
  summary: string,
  valence: number,
  salience: number,
  createdAt: number,
): void {
  const ai = ensureVillageAIState(save);
  if (!isNonEmptyString(summary) || !isPersistedNumber(createdAt)) return;
  const safeTag = MEMORY_TAGS.includes(tag) ? tag : 'event';
  const idBase = `ai-memory-${Math.floor(createdAt)}-${safeTag}`;
  let id = idBase;
  let suffix = 2;
  while (ai.hero.memories.some((memory) => memory.id === id)) {
    id = `${idBase}-${suffix}`;
    suffix += 1;
  }
  ai.hero.memories.unshift({
    id,
    tag: safeTag,
    summary: summary.trim().slice(0, 160),
    valence: clamp(Number.isFinite(valence) ? valence : 0, -1, 1),
    salience: clamp(Number.isFinite(salience) ? salience : 0.5, 0, 1),
    createdAt,
  });
  if (ai.hero.memories.length > Village_MAX_AI_MEMORIES) {
    ai.hero.memories.length = Village_MAX_AI_MEMORIES;
  }
}

export function recordVillageAIDecision(
  save: VillageSaveEnvelope,
  decision: HeroAutonomyDecision,
  decidedAt: number,
  confidence = 0.5,
): void {
  const ai = ensureVillageAIState(save);
  const actionGoal: Record<HeroAction, VillageHeroGoal> = {
    rest: 'recover',
    train: 'prepare',
    expedition: 'explore',
  };
  ai.hero.currentGoal = actionGoal[decision.action] ?? 'support';
  ai.hero.lastDecision = {
    action: decision.action,
    reason: decision.reason,
    confidence: clamp(Number.isFinite(confidence) ? confidence : 0.5, 0, 1),
    decidedAt: isPersistedNumber(decidedAt) ? decidedAt : save.updatedAt,
  };
}

export function recordVillageAIOutcome(
  save: VillageSaveEnvelope,
  tag: Extract<VillageMemoryTag, 'victory' | 'defeat' | 'support'>,
  summary: string,
  valence: number,
  createdAt: number,
): void {
  const ai = ensureVillageAIState(save);
  recordVillageAIMemory(save, tag, summary, valence, 0.85, createdAt);
  if (tag === 'victory') {
    ai.hero.needs.morale = clamp(ai.hero.needs.morale + 8, 0, 100);
    ai.hero.needs.purpose = clamp(ai.hero.needs.purpose + 5, 0, 100);
    ai.hero.currentGoal = 'explore';
  } else if (tag === 'defeat') {
    ai.hero.needs.morale = clamp(ai.hero.needs.morale - 12, 0, 100);
    ai.hero.needs.fatigue = clamp(ai.hero.needs.fatigue + 15, 0, 100);
    ai.hero.currentGoal = 'recover';
  } else {
    ai.hero.needs.morale = clamp(ai.hero.needs.morale + 2, 0, 100);
    ai.hero.currentGoal = 'support';
  }
}

export function decayVillageAINeeds(save: VillageSaveEnvelope, elapsedDays: number): void {
  const ai = ensureVillageAIState(save);
  const days = Number.isFinite(elapsedDays) && elapsedDays > 0 ? Math.min(30, Math.floor(elapsedDays)) : 0;
  if (days <= 0) return;
  ai.hero.needs.fatigue = clamp(ai.hero.needs.fatigue - days * 8, 0, 100);
  ai.hero.needs.purpose = clamp(ai.hero.needs.purpose + days * 2, 0, 100);
  for (const memory of ai.hero.memories) {
    memory.salience = clamp(memory.salience - days * 0.03, 0, 1);
  }
}
