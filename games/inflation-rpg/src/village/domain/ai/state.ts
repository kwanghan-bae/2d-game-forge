import { REALM_IDS } from '../../data';
import type {
  HeroAction,
  HeroAutonomyDecision,
  HeroAutonomyReason,
  SupportAgentId,
  RealmId,
  VillageAgentAIState,
  VillageAgentBelief,
  VillageAgentBeliefKind,
  VillageAgentBeliefSource,
  VillageAgentCognitionState,
  VillageAgentDecisionReason,
  VillageAgentGoal,
  VillageAgentMemory,
  VillageAgentMemoryTag,
  VillageAgentPlanState,
  VillageAgentPlanStep,
  VillageAgentPlanStepKind,
  VillageAIDecisionKind,
  VillageAIDecisionRecord,
  VillageAIState,
  VillageFactionId,
  VillageFactionState,
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
  VillageWorldChainKind,
  VillageWorldChainState,
} from '../../types';
import {
  Village_MAX_AI_MEMORIES,
  Village_MAX_AI_DECISION_HISTORY,
  Village_MAX_AGENT_BELIEFS,
  Village_MAX_AGENT_MEMORIES,
  Village_MAX_PENDING_WORLD_EVENTS,
  Village_MAX_RESOLVED_WORLD_EVENTS,
  Village_MAX_WORLD_CHAINS,
  Village_MAX_WORLD_CHAIN_STEP,
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
export const VILLAGE_SUPPORT_AGENT_IDS: readonly SupportAgentId[] = ['blacksmith', 'mudang', 'guide'];
export const VILLAGE_FACTION_IDS: readonly VillageFactionId[] = ['village', 'merchants', 'spirits'];
const WORLD_CHAIN_KINDS: readonly VillageWorldChainKind[] = [
  'weather_supply',
  'supply_social',
  'social_omen',
  'omen_weather',
];
const AGENT_GOALS: readonly VillageAgentGoal[] = ['recover', 'craft', 'ward', 'guide', 'bond'];
const AGENT_MEMORY_TAGS: readonly VillageAgentMemoryTag[] = [
  'observation',
  'choice',
  'success',
  'failure',
  'support',
  'conflict',
];
const AGENT_BELIEF_KINDS: readonly VillageAgentBeliefKind[] = [
  'hero_trust',
  'peer_trust',
  'supply_security',
  'weather_safety',
  'realm_threat',
  'faction_trust',
  'faction_tension',
];
const AGENT_BELIEF_SOURCES: readonly VillageAgentBeliefSource[] = ['observation', 'rumor', 'outcome'];
const AGENT_PLAN_STEP_KINDS: readonly VillageAgentPlanStepKind[] = [
  'observe',
  'prepare',
  'act',
  'recover',
  'reconcile',
];
const AGENT_BELIEF_SUBJECTS: readonly VillageAgentBelief['subject'][] = [
  'hero',
  ...VILLAGE_FACTION_IDS,
  ...VILLAGE_SUPPORT_AGENT_IDS,
  ...REALM_IDS,
];
const AGENT_DECISION_REASONS: readonly VillageAgentDecisionReason[] = [
  'fatigue',
  'specialty',
  'relationship',
  'weather',
  'routine',
  'conflict',
  'world_pressure',
];
const AGENT_SPECIALTY_GOALS: Record<SupportAgentId, VillageAgentGoal> = {
  blacksmith: 'craft',
  mudang: 'ward',
  guide: 'guide',
};
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
const DECISION_KINDS: readonly VillageAIDecisionKind[] = ['hero_action', 'agent_goal'];

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

function defaultFactionValue(seed: number, key: string, base: number, spread: number): number {
  const noise = (deterministicUnit(`${seed}:faction:${key}`) - 0.5) * spread;
  return Math.min(1, Math.max(0, base + noise));
}

function createDefaultFactionStates(seed: number): Record<VillageFactionId, VillageFactionState> {
  return {
    village: {
      trust: defaultFactionValue(seed, 'village', 0.72, 0.06),
      influence: defaultFactionValue(seed, 'village-influence', 0.72, 0.06),
      tension: defaultFactionValue(seed, 'village-tension', 0.18, 0.05),
      lastActionDay: 0,
    },
    merchants: {
      trust: defaultFactionValue(seed, 'merchants', 0.52, 0.08),
      influence: defaultFactionValue(seed, 'merchants-influence', 0.58, 0.08),
      tension: defaultFactionValue(seed, 'merchants-tension', 0.28, 0.07),
      lastActionDay: 0,
    },
    spirits: {
      trust: defaultFactionValue(seed, 'spirits', 0.44, 0.1),
      influence: defaultFactionValue(seed, 'spirits-influence', 0.46, 0.1),
      tension: defaultFactionValue(seed, 'spirits-tension', 0.36, 0.08),
      lastActionDay: 0,
    },
  };
}

function defaultWorld(seed = 0): VillageAIState['world'] {
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
    factions: createDefaultFactionStates(seed),
    chains: [],
  };
}

function safeAgentTick(value: number, fallback = 0): number {
  return isPersistedNumber(value) && Number.isInteger(value) && value >= 0 ? value : fallback;
}

function defaultAgentRelationships(seed: number, agentId: SupportAgentId): Record<SupportAgentId, number> {
  return Object.fromEntries(
    VILLAGE_SUPPORT_AGENT_IDS.map((targetId) => [
      targetId,
      targetId === agentId
        ? 0
        : Math.round((deterministicUnit(`${seed}:agent-relation:${agentId}:${targetId}`) * 2 - 1) * 100) / 100,
    ]),
  ) as Record<SupportAgentId, number>;
}

function defaultWeatherSafety(weather: VillageWeather): number {
  return weather === 'clear' ? 0.92 : weather === 'rain' ? 0.66 : weather === 'wind' ? 0.58 : 0.44;
}

function defaultAgentBeliefValue(
  seed: number,
  agentId: SupportAgentId,
  kind: VillageAgentBeliefKind,
  subject: VillageAgentBelief['subject'],
  value: number,
): number {
  const roleBias = kind === 'weather_safety'
    ? agentId === 'guide' ? -0.08 : agentId === 'mudang' ? 0.04 : 0
    : kind === 'realm_threat'
      ? agentId === 'guide' ? 0.06 : agentId === 'mudang' ? 0.04 : 0.02
      : kind === 'supply_security' && agentId === 'blacksmith' ? -0.05
        : kind === 'faction_trust'
          ? agentId === 'blacksmith' && subject === 'merchants' ? 0.05
            : agentId === 'mudang' && subject === 'spirits' ? 0.06
              : agentId === 'guide' && subject === 'village' ? 0.04
                : 0
          : kind === 'faction_tension'
            ? agentId === 'blacksmith' && subject === 'merchants' ? 0.04
              : agentId === 'mudang' && subject === 'spirits' ? 0.06
                : agentId === 'guide' && subject === 'village' ? 0.03
                  : 0
            : 0;
  const noise = (deterministicUnit(`${seed}:agent-belief:${agentId}:${kind}:${subject}`) - 0.5) * 0.1;
  return Math.min(1, Math.max(0, value + roleBias + noise));
}

function createAgentBelief(
  seed: number,
  agentId: SupportAgentId,
  kind: VillageAgentBeliefKind,
  subject: VillageAgentBelief['subject'],
  value: number,
  tick: number,
): VillageAgentBelief {
  return {
    id: `belief-${kind}-${subject}`,
    kind,
    subject,
    value: defaultAgentBeliefValue(seed, agentId, kind, subject, value),
    confidence: 0.52 + deterministicUnit(`${seed}:agent-belief-confidence:${agentId}:${kind}:${subject}`) * 0.28,
    source: 'observation',
    updatedAt: tick,
  };
}

export function createVillageAgentCognitionState(
  seed: number,
  agentId: SupportAgentId,
  tick = 0,
  relationships = defaultAgentRelationships(seed, agentId),
): VillageAgentCognitionState {
  const world = defaultWorld(seed);
  const beliefs: VillageAgentBelief[] = [
    createAgentBelief(seed, agentId, 'hero_trust', 'hero', 0.3, tick),
    createAgentBelief(seed, agentId, 'supply_security', 'village', 0.7, tick),
    createAgentBelief(seed, agentId, 'weather_safety', 'village', defaultWeatherSafety(world.weather), tick),
    ...VILLAGE_FACTION_IDS.flatMap((factionId) => {
      const faction = world.factions?.[factionId];
      return [
        createAgentBelief(seed, agentId, 'faction_trust', factionId, faction?.trust ?? 0.5, tick),
        createAgentBelief(seed, agentId, 'faction_tension', factionId, faction?.tension ?? 0.5, tick),
      ];
    }),
    ...VILLAGE_SUPPORT_AGENT_IDS
      .filter((targetId) => targetId !== agentId)
      .map((targetId) => createAgentBelief(
        seed,
        agentId,
        'peer_trust',
        targetId,
        (relationships[targetId] + 1) / 2,
        tick,
      )),
    ...REALM_IDS.map((realmId) => createAgentBelief(
      seed,
      agentId,
      'realm_threat',
      realmId,
      world.threatByRealm[realmId],
      tick,
    )),
  ];
  return { memories: [], beliefs, plan: null };
}

export function createVillageAgentAIState(
  seed: number,
  agentId: SupportAgentId,
  tick = 0,
): VillageAgentAIState {
  const safeSeed = isPersistedNumber(seed) ? Math.floor(Math.abs(seed)) : 0;
  const safeTick = safeAgentTick(tick);
  const goal = AGENT_SPECIALTY_GOALS[agentId];
  const relationships = defaultAgentRelationships(safeSeed, agentId);
  return {
    goal,
    goalProgress: 25 + Math.floor(deterministicUnit(`${safeSeed}:agent-progress:${agentId}`) * 36),
    stress: 0,
    relationships,
    schedule: {
      goal,
      startTick: safeTick,
      endTick: safeTick + 1 + Math.floor(deterministicUnit(`${safeSeed}:agent-schedule:${agentId}:${safeTick}`) * 2),
      reason: 'routine',
    },
    lastDecisionTick: safeTick,
    cognition: createVillageAgentCognitionState(safeSeed, agentId, safeTick, relationships),
  };
}

export function createVillageAgentAIStates(
  seed: number,
  tick = 0,
): Record<SupportAgentId, VillageAgentAIState> {
  return Object.fromEntries(
    VILLAGE_SUPPORT_AGENT_IDS.map((agentId) => [agentId, createVillageAgentAIState(seed, agentId, tick)]),
  ) as Record<SupportAgentId, VillageAgentAIState>;
}

export function createVillageAIState(seed: number, createdAt: number): VillageAIState {
  const safeSeed = isPersistedNumber(seed)
    ? Math.floor(Math.abs(seed))
    : isPersistedNumber(createdAt) ? Math.floor(Math.abs(createdAt)) : 0;
  const personality = defaultPersonality(safeSeed);
  return {
    version: 1,
    seed: safeSeed,
    world: defaultWorld(safeSeed),
    hero: {
      personality,
      needs: { fatigue: 0, morale: 60, purpose: 55 },
      currentGoal: 'explore',
      memories: [],
      lastDecision: null,
    },
    pendingEvents: [],
    resolvedEventIds: [],
    agentBrains: createVillageAgentAIStates(safeSeed),
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
    decisionHistory: [],
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

function isValidFactionDelta(value: unknown): boolean {
  return value === undefined || (isRecord(value)
    && Object.entries(value).every(([key, amount]) => (
      VILLAGE_FACTION_IDS.includes(key as VillageFactionId)
      && isFiniteNumber(amount)
      && Math.abs(amount) <= 0.35
    )));
}

function isValidWorldChainMetadata(value: Record<string, unknown>): boolean {
  const fields = ['chainId', 'chainKind', 'chainStep', 'factionId', 'parentEventId'];
  const hasMetadata = fields.some((field) => value[field] !== undefined);
  if (!hasMetadata) return true;
  return isNonEmptyString(value.chainId)
    && isOneOf(WORLD_CHAIN_KINDS, value.chainKind)
    && isPersistedNumber(value.chainStep)
    && Number.isInteger(value.chainStep)
    && value.chainStep >= 0
    && value.chainStep <= Village_MAX_WORLD_CHAIN_STEP
    && isOneOf(VILLAGE_FACTION_IDS, value.factionId)
    && (value.parentEventId === undefined || isNonEmptyString(value.parentEventId));
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
  if (!isValidFactionDelta(value.factionTrustDelta)
    || !isValidFactionDelta(value.factionInfluenceDelta)
    || !isValidFactionDelta(value.factionTensionDelta)) return false;
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
    && new Set(value.choices.map((choice) => choice.id)).size === value.choices.length
    && isValidWorldChainMetadata(value);
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
  if (!isValidWorldChainMetadata(value)) return false;
  return value.outcome === 'expired'
    ? value.choiceId === null
    : isNonEmptyString(value.choiceId);
}

function isValidVillageFactionState(value: unknown): value is VillageFactionState {
  return isRecord(value)
    && isBoundedNumber(value.trust, 0, 1)
    && isBoundedNumber(value.influence, 0, 1)
    && isBoundedNumber(value.tension, 0, 1)
    && isPersistedNumber(value.lastActionDay)
    && Number.isInteger(value.lastActionDay)
    && value.lastActionDay >= 0;
}

function isValidVillageFactions(value: unknown): value is Record<VillageFactionId, VillageFactionState> {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value);
  return keys.length === VILLAGE_FACTION_IDS.length
    && VILLAGE_FACTION_IDS.every((factionId) => isValidVillageFactionState(value[factionId]));
}

function isValidVillageWorldChain(value: unknown): value is VillageWorldChainState {
  return isRecord(value)
    && isNonEmptyString(value.id)
    && isOneOf(WORLD_CHAIN_KINDS, value.kind)
    && isOneOf(VILLAGE_FACTION_IDS, value.factionId)
    && isPersistedNumber(value.step)
    && Number.isInteger(value.step)
    && value.step >= 0
    && value.step <= Village_MAX_WORLD_CHAIN_STEP
    && isBoundedNumber(value.momentum, -1, 1)
    && isPersistedNumber(value.nextDay)
    && Number.isInteger(value.nextDay)
    && value.nextDay >= 0
    && (value.pendingEventId === null || isNonEmptyString(value.pendingEventId))
    && isNonEmptyString(value.lastEventId);
}

function isValidVillageWorldChains(value: unknown): value is VillageWorldChainState[] {
  return Array.isArray(value)
    && value.length <= Village_MAX_WORLD_CHAINS
    && value.every(isValidVillageWorldChain)
    && new Set(value.map((chain) => chain.id)).size === value.length;
}

function isValidVillageAIDecisionRecord(value: unknown): value is VillageAIDecisionRecord {
  if (!isRecord(value)
    || !isNonEmptyString(value.id)
    || !isPersistedNumber(value.day)
    || !Number.isInteger(value.day)
    || value.day < 0
    || !isPersistedNumber(value.decidedAt)
    || !isOneOf(DECISION_KINDS, value.kind)) return false;
  if (value.actor === 'hero') {
    return value.kind === 'hero_action'
      && isOneOf(HERO_ACTIONS, value.value)
      && isOneOf(HERO_REASONS, value.reason);
  }
  return isOneOf(VILLAGE_SUPPORT_AGENT_IDS, value.actor)
    && value.kind === 'agent_goal'
    && isOneOf(AGENT_GOALS, value.value)
    && isOneOf(AGENT_DECISION_REASONS, value.reason);
}

function isValidVillageAgentMemory(value: unknown): value is VillageAgentMemory {
  return isRecord(value)
    && isNonEmptyString(value.id)
    && isOneOf(AGENT_MEMORY_TAGS, value.tag)
    && isNonEmptyString(value.summary)
    && isBoundedNumber(value.valence, -1, 1)
    && isBoundedNumber(value.salience, 0, 1)
    && isPersistedNumber(value.createdAt)
    && (value.relatedAgentId === null || isOneOf(VILLAGE_SUPPORT_AGENT_IDS, value.relatedAgentId));
}

function isValidVillageAgentBelief(value: unknown): value is VillageAgentBelief {
  if (!isRecord(value)
    || !isNonEmptyString(value.id)
    || !isOneOf(AGENT_BELIEF_KINDS, value.kind)
    || !isOneOf(AGENT_BELIEF_SUBJECTS, value.subject)
    || !isBoundedNumber(value.value, 0, 1)
    || !isBoundedNumber(value.confidence, 0, 1)
    || !isOneOf(AGENT_BELIEF_SOURCES, value.source)
    || !isPersistedNumber(value.updatedAt)) return false;
  if (value.kind === 'hero_trust' && value.subject !== 'hero') return false;
  if (value.kind === 'peer_trust' && !isOneOf(VILLAGE_SUPPORT_AGENT_IDS, value.subject)) return false;
  if (value.kind === 'supply_security' && value.subject !== 'village') return false;
  if (value.kind === 'weather_safety' && value.subject !== 'village') return false;
  if (value.kind === 'realm_threat') return REALM_IDS.includes(value.subject as RealmId);
  if (value.kind === 'faction_trust' || value.kind === 'faction_tension') {
    return VILLAGE_FACTION_IDS.includes(value.subject as VillageFactionId);
  }
  return true;
}

function isValidVillageAgentPlanStep(value: unknown): value is VillageAgentPlanStep {
  return isRecord(value)
    && isOneOf(AGENT_PLAN_STEP_KINDS, value.kind)
    && isNonEmptyString(value.labelKR);
}

function isValidVillageAgentPlan(value: unknown): value is VillageAgentPlanState {
  return isRecord(value)
    && isOneOf(AGENT_GOALS, value.goal)
    && Array.isArray(value.steps)
    && value.steps.length >= 2
    && value.steps.length <= 5
    && value.steps.every(isValidVillageAgentPlanStep)
    && isPersistedNumber(value.currentStep)
    && Number.isInteger(value.currentStep)
    && value.currentStep >= 0
    && value.currentStep < value.steps.length
    && isPersistedNumber(value.createdAtTick)
    && Number.isInteger(value.createdAtTick)
    && value.createdAtTick >= 0
    && isPersistedNumber(value.expiresAtTick)
    && Number.isInteger(value.expiresAtTick)
    && value.expiresAtTick > value.createdAtTick
    && isPersistedNumber(value.interruptionCount)
    && Number.isInteger(value.interruptionCount)
    && value.interruptionCount >= 0
    && isPersistedNumber(value.lastReplannedTick)
    && Number.isInteger(value.lastReplannedTick)
    && value.lastReplannedTick >= value.createdAtTick
    && value.lastReplannedTick <= value.expiresAtTick;
}

export function isValidVillageAgentCognitionState(value: unknown): value is VillageAgentCognitionState {
  return isRecord(value)
    && Array.isArray(value.memories)
    && value.memories.length <= Village_MAX_AGENT_MEMORIES
    && value.memories.every(isValidVillageAgentMemory)
    && new Set(value.memories.map((memory) => memory.id)).size === value.memories.length
    && Array.isArray(value.beliefs)
    && value.beliefs.length <= Village_MAX_AGENT_BELIEFS
    && value.beliefs.every(isValidVillageAgentBelief)
    && new Set(value.beliefs.map((belief) => belief.id)).size === value.beliefs.length
    && (value.plan === null || isValidVillageAgentPlan(value.plan));
}

export function hasVillageAgentFactionBeliefs(
  cognition: VillageAgentCognitionState | undefined,
): boolean {
  return Boolean(cognition && VILLAGE_FACTION_IDS.every((factionId) => (
    (['faction_trust', 'faction_tension'] as const).every((kind) => (
      cognition.beliefs.some((belief) => belief.kind === kind && belief.subject === factionId)
    ))
  )));
}

function ensureVillageAgentFactionBeliefs(
  cognition: VillageAgentCognitionState,
  seed: number,
  agentId: SupportAgentId,
  tick: number,
  factions: Record<VillageFactionId, VillageFactionState>,
): void {
  const missing = VILLAGE_FACTION_IDS.flatMap((factionId) => {
    const faction = factions[factionId];
    const beliefs: VillageAgentBelief[] = [];
    if (!cognition.beliefs.some((belief) => belief.kind === 'faction_trust' && belief.subject === factionId)) {
      beliefs.push(createAgentBelief(seed, agentId, 'faction_trust', factionId, faction.trust, tick));
    }
    if (!cognition.beliefs.some((belief) => belief.kind === 'faction_tension' && belief.subject === factionId)) {
      beliefs.push(createAgentBelief(seed, agentId, 'faction_tension', factionId, faction.tension, tick));
    }
    return beliefs;
  });
  if (missing.length === 0) return;
  cognition.beliefs = [...cognition.beliefs, ...missing].slice(-Village_MAX_AGENT_BELIEFS);
}

function isValidVillageAgentSchedule(value: unknown): value is VillageAgentAIState['schedule'] {
  return isRecord(value)
    && isOneOf(AGENT_GOALS, value.goal)
    && isPersistedNumber(value.startTick)
    && Number.isInteger(value.startTick)
    && value.startTick >= 0
    && isPersistedNumber(value.endTick)
    && Number.isInteger(value.endTick)
    && value.endTick > value.startTick
    && isOneOf(AGENT_DECISION_REASONS, value.reason);
}

function isValidVillageAgentAIState(
  value: unknown,
  agentId: SupportAgentId,
): value is VillageAgentAIState {
  const relationships = isRecord(value) ? value.relationships : undefined;
  if (!isRecord(value)
    || !isOneOf(AGENT_GOALS, value.goal)
    || !isBoundedNumber(value.goalProgress, 0, 100)
    || !isBoundedNumber(value.stress, 0, 100)
    || !isRecord(relationships)
    || !isValidVillageAgentSchedule(value.schedule)
    || !isPersistedNumber(value.lastDecisionTick)
    || !Number.isInteger(value.lastDecisionTick)
    || value.lastDecisionTick < 0) return false;
  const relationshipKeys = Object.keys(relationships);
  return relationshipKeys.length === VILLAGE_SUPPORT_AGENT_IDS.length
    && VILLAGE_SUPPORT_AGENT_IDS.every((targetId) => (
      isBoundedNumber(relationships[targetId], -1, 1)
    ))
    && relationships[agentId] === 0
    && (value.cognition === undefined || isValidVillageAgentCognitionState(value.cognition));
}

function isValidVillageAgentBrains(
  value: unknown,
): value is Record<SupportAgentId, VillageAgentAIState> {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value);
  return keys.length === VILLAGE_SUPPORT_AGENT_IDS.length
    && VILLAGE_SUPPORT_AGENT_IDS.every((agentId) => isValidVillageAgentAIState(value[agentId], agentId));
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
    && new Set(value.eventHistory.map((record) => record.eventId)).size === value.eventHistory.length
    && (value.decisionHistory === undefined
      || (Array.isArray(value.decisionHistory)
        && value.decisionHistory.length <= Village_MAX_AI_DECISION_HISTORY
        && value.decisionHistory.every(isValidVillageAIDecisionRecord)
        && new Set(value.decisionHistory.map((record) => record.id)).size === value.decisionHistory.length));
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
  if (world.factions !== undefined && !isValidVillageFactions(world.factions)) return false;
  if (world.chains !== undefined && !isValidVillageWorldChains(world.chains)) return false;

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

  // `agentBrains` was added as a backwards-compatible schema 3 extension.
  // Older valid schema 3 saves may omit it and receive deterministic defaults
  // the next time the domain mutates the save.
  if (value.agentBrains !== undefined && !isValidVillageAgentBrains(value.agentBrains)) return false;

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

export function getVillageAgentAIState(
  source: VillageSaveEnvelope,
  agentId: SupportAgentId,
): VillageAgentAIState {
  const ai = getVillageAIState(source);
  const brain = ai.agentBrains?.[agentId];
  return brain && isValidVillageAgentAIState(brain, agentId)
    ? brain
    : createVillageAgentAIState(ai.seed, agentId, ai.world.lastSimulatedDay);
}

export function getVillageAgentCognitionState(
  source: VillageSaveEnvelope,
  agentId: SupportAgentId,
): VillageAgentCognitionState {
  const ai = getVillageAIState(source);
  const brain = getVillageAgentAIState(source, agentId);
  return brain.cognition && isValidVillageAgentCognitionState(brain.cognition)
    ? brain.cognition
    : createVillageAgentCognitionState(ai.seed, agentId, ai.world.lastSimulatedDay, brain.relationships);
}

export function ensureVillageAgentBrains(
  save: VillageSaveEnvelope,
): Record<SupportAgentId, VillageAgentAIState> {
  const ai = ensureVillageAIState(save);
  if (!ai.agentBrains || !isValidVillageAgentBrains(ai.agentBrains)) {
    ai.agentBrains = createVillageAgentAIStates(ai.seed, ai.world.lastSimulatedDay);
  }
  for (const agentId of VILLAGE_SUPPORT_AGENT_IDS) {
    const brain = ai.agentBrains[agentId];
    if (brain && !brain.cognition) {
      brain.cognition = createVillageAgentCognitionState(
        ai.seed,
        agentId,
        ai.world.lastSimulatedDay,
        brain.relationships,
      );
    }
    if (brain?.cognition && isValidVillageAgentCognitionState(brain.cognition)) {
      ensureVillageAgentFactionBeliefs(
        brain.cognition,
        ai.seed,
        agentId,
        ai.world.lastSimulatedDay,
        ai.world.factions as Record<VillageFactionId, VillageFactionState>,
      );
    }
  }
  return ai.agentBrains;
}

export function ensureVillageAgentCognition(
  save: VillageSaveEnvelope,
  agentId: SupportAgentId,
): VillageAgentCognitionState {
  const ai = ensureVillageAIState(save);
  const brains = ensureVillageAgentBrains(save);
  const brain = brains[agentId];
  if (!brain) {
    const fallback = createVillageAgentAIState(ai.seed, agentId, ai.world.lastSimulatedDay);
    brains[agentId] = fallback;
    return fallback.cognition ?? createVillageAgentCognitionState(ai.seed, agentId, ai.world.lastSimulatedDay);
  }
  if (!brain.cognition || !isValidVillageAgentCognitionState(brain.cognition)) {
    brain.cognition = createVillageAgentCognitionState(
      ai.seed,
      agentId,
      ai.world.lastSimulatedDay,
      brain.relationships,
    );
  }
  return brain.cognition;
}

export function ensureVillageAIState(save: VillageSaveEnvelope): VillageAIState {
  let ai: VillageAIState;
  if (!save.meta.ai || !isValidVillageAIState(save.meta.ai)) {
    ai = createVillageAIState(save.createdAt, save.createdAt);
    save.meta.ai = ai;
  } else {
    ai = save.meta.ai;
  }
  if (!ai.agentBrains || !isValidVillageAgentBrains(ai.agentBrains)) {
    ai.agentBrains = createVillageAgentAIStates(ai.seed, ai.world.lastSimulatedDay);
  }
  if (!ai.world.factions || !isValidVillageFactions(ai.world.factions)) {
    ai.world.factions = createDefaultFactionStates(ai.seed);
  }
  if (!ai.world.chains || !isValidVillageWorldChains(ai.world.chains)) {
    ai.world.chains = [];
  }
  for (const agentId of VILLAGE_SUPPORT_AGENT_IDS) {
    const brain = ai.agentBrains[agentId];
    if (brain && !brain.cognition) {
      brain.cognition = createVillageAgentCognitionState(
        ai.seed,
        agentId,
        ai.world.lastSimulatedDay,
        brain.relationships,
      );
    }
    if (brain?.cognition && isValidVillageAgentCognitionState(brain.cognition)) {
      ensureVillageAgentFactionBeliefs(
        brain.cognition,
        ai.seed,
        agentId,
        ai.world.lastSimulatedDay,
        ai.world.factions as Record<VillageFactionId, VillageFactionState>,
      );
    }
  }
  return ai;
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
  if (!save.meta.simulation.decisionHistory) save.meta.simulation.decisionHistory = [];
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

export function recordVillageSimulationDecision(
  save: VillageSaveEnvelope,
  record: VillageAIDecisionRecord,
): void {
  const simulation = ensureVillageSimulationState(save);
  if (!isValidVillageAIDecisionRecord(record)) return;
  const history = simulation.decisionHistory ?? [];
  if (history.some((candidate) => candidate.id === record.id)) return;
  simulation.decisionHistory = [...history, record].slice(-Village_MAX_AI_DECISION_HISTORY);
  simulation.tick = Math.max(simulation.tick, record.day);
  simulation.lastSimulatedAt = Math.max(simulation.lastSimulatedAt, record.decidedAt);
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
