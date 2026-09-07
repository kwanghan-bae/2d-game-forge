import type { HeroSnapshot } from '../hero/HeroEntity';
import { HeroLifecycle } from '../hero/HeroLifecycle';
import { FACILITY_IDS, AGENT_DEFINITIONS, REALM_IDS } from './data';
import { completeFacilityTasks } from './domain';
import { applyV4EquipmentBonuses, getV4EquipmentBonuses, getV4EquipmentDefinition } from './equipment';
import type {
  FacilityState,
  OfflineSummary,
  SupportAgent,
  V4CurrencyKey,
  V4HeroSnapshot,
  V4SaveEnvelope,
} from './types';
import { V4_MAX_INTERVENTION_CHARGES, V4_MAX_SAGA_ENTRIES } from './types';

export { V4_MAX_INTERVENTION_CHARGES } from './types';

export const V4_SAVE_KEY = 'shin-ui-eternal-sponsor-v4-save-v1';
export const V4_SCHEMA_VERSION = 1 as const;
export const V4_OFFLINE_CAP_MS = 8 * 60 * 60 * 1000;
export const V4_OFFLINE_EFFICIENCY = 0.7;
export const V4_RECOVERY_BACKUP_KEY = `${V4_SAVE_KEY}-recovery-backup`;

export type V4SaveLoadResult =
  | { status: 'missing' }
  | { status: 'valid'; save: V4SaveEnvelope }
  | { status: 'invalid'; reason: 'malformed_json' | 'invalid_schema' }
  | { status: 'unavailable' };

const CURRENCY_KEYS: V4CurrencyKey[] = ['spirit', 'gold', 'materials', 'rift'];
const HERO_NAMES = ['연화', '도윤', '서린', '한결', '무진', '가람'];
const MAX_PERSISTED_NUMBER = Number.MAX_SAFE_INTEGER;

function defaultStorage(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNonNegativeNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0;
}

function isPersistableNumber(value: unknown): value is number {
  return isFiniteNumber(value) && Math.abs(value) <= MAX_PERSISTED_NUMBER;
}

function isPersistableNonNegativeNumber(value: unknown): value is number {
  return isPersistableNumber(value) && value >= 0;
}

function finiteNonNegativeOr(value: unknown, fallback: number): number {
  return isNonNegativeNumber(value) && value <= MAX_PERSISTED_NUMBER ? value : fallback;
}

function finitePositiveOr(value: unknown, fallback: number): number {
  return isFiniteNumber(value) && value > 0 && value <= MAX_PERSISTED_NUMBER ? value : fallback;
}

function finiteStringOr(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function positiveIntegerOr(value: unknown, fallback: number): number {
  return isFiniteNumber(value) && Number.isInteger(value) && value >= 1 && value <= MAX_PERSISTED_NUMBER
    ? value
    : fallback;
}

function nonNegativeIntegerOr(value: unknown, fallback: number): number {
  return isNonNegativeNumber(value) && Number.isInteger(value) && value <= MAX_PERSISTED_NUMBER
    ? value
    : fallback;
}

function safeActionCountForAge(age: number): number {
  const derived = HeroLifecycle.actionsForAge(age);
  return Number.isFinite(derived)
    ? Math.min(MAX_PERSISTED_NUMBER, Math.max(0, Math.floor(derived)))
    : MAX_PERSISTED_NUMBER;
}

function isCurrencyRecord(value: unknown): value is Partial<Record<V4CurrencyKey, number>> {
  return isRecord(value) && Object.entries(value).every(([key, amount]) =>
    CURRENCY_KEYS.includes(key as V4CurrencyKey) && isPersistableNonNegativeNumber(amount));
}

function isFacilityTaskRecord(value: unknown): boolean {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.facilityId !== 'string'
    || !FACILITY_IDS.includes(value.facilityId as typeof FACILITY_IDS[number]) || typeof value.type !== 'string'
    || !isPersistableNonNegativeNumber(value.startedAt) || !isPersistableNonNegativeNumber(value.completesAt)
    || value.completesAt <= value.startedAt
    || !isCurrencyRecord(value.input) || !isCurrencyRecord(value.outputPreview)
    || (value.outputEquipmentIds !== undefined
      && (!Array.isArray(value.outputEquipmentIds) || !value.outputEquipmentIds.every((id) =>
        typeof id === 'string' && getV4EquipmentDefinition(id) !== undefined)))
    || (value.heroExpGain !== undefined && !isPersistableNonNegativeNumber(value.heroExpGain))
    || (value.assignedAgentId !== null
      && (typeof value.assignedAgentId !== 'string'
        || !Object.prototype.hasOwnProperty.call(AGENT_DEFINITIONS, value.assignedAgentId)))) return false;
  return true;
}

function isExpeditionRecord(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && typeof value.id === 'string'
    && typeof value.realmId === 'string' && REALM_IDS.includes(value.realmId as typeof REALM_IDS[number])
    && ['aggression', 'hoarding', 'training'].includes(value.policy as string)
    && (value.assignedAgentId === null || value.assignedAgentId === 'guide')
    && isPersistableNonNegativeNumber(value.startedAt) && isPersistableNonNegativeNumber(value.completesAt)
    && value.completesAt > value.startedAt
    && (value.status === 'traveling' || value.status === 'awaiting_confirmation')
    && (value.encounterIndex === undefined
      || (isPersistableNonNegativeNumber(value.encounterIndex) && Number.isInteger(value.encounterIndex) && value.encounterIndex <= 2))
    && (value.encountersCleared === undefined
      || (isPersistableNonNegativeNumber(value.encountersCleared) && Number.isInteger(value.encountersCleared) && value.encountersCleared <= 3))
    && (value.totalTurns === undefined || isPersistableNonNegativeNumber(value.totalTurns))
    && (value.totalDamageDealt === undefined || isPersistableNonNegativeNumber(value.totalDamageDealt))
    && (value.totalDamageTaken === undefined || isPersistableNonNegativeNumber(value.totalDamageTaken));
}

function isExpeditionResultRecord(value: unknown): value is Record<string, unknown> {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.realmId === 'string'
    && REALM_IDS.includes(value.realmId as typeof REALM_IDS[number])
    && (value.outcome === 'victory' || value.outcome === 'defeat')
    && isPersistableNonNegativeNumber(value.completedAt)
    && isCurrencyRecord(value.reward)
    && isPersistableNonNegativeNumber(value.heroPower)
    && isPersistableNonNegativeNumber(value.recommendedPower)
    && isPersistableNonNegativeNumber(value.turns)
    && isPersistableNonNegativeNumber(value.totalDamageDealt)
    && isPersistableNonNegativeNumber(value.totalDamageTaken)
    && isPersistableNonNegativeNumber(value.heroRemainingHp)
    && typeof value.weaknessKR === 'string'
    && typeof value.recommendedFacilityId === 'string'
    && FACILITY_IDS.includes(value.recommendedFacilityId as typeof FACILITY_IDS[number])
    && (value.recommendedEquipmentId === null || typeof value.recommendedEquipmentId === 'string')
    && isPersistableNonNegativeNumber(value.retryAfterSeconds)
    && (value.successChance === undefined || (isPersistableNonNegativeNumber(value.successChance) && value.successChance <= 1))
    && (value.encountersCleared === undefined
      || (isPersistableNonNegativeNumber(value.encountersCleared) && Number.isInteger(value.encountersCleared) && value.encountersCleared <= 3))
    && (value.totalEncounterCount === undefined
      || (isPersistableNonNegativeNumber(value.totalEncounterCount) && Number.isInteger(value.totalEncounterCount) && value.totalEncounterCount >= 1 && value.totalEncounterCount <= 3));
}

function isSagaEntryRecord(value: unknown): boolean {
  return isRecord(value) && typeof value.id === 'string' && isPersistableNonNegativeNumber(value.createdAt)
    && typeof value.title === 'string' && typeof value.text === 'string'
    && ['birth', 'facility', 'expedition', 'rejuvenation', 'milestone'].includes(value.kind as string);
}

function isV4SaveEnvelope(value: unknown): value is V4SaveEnvelope {
  if (!isRecord(value) || value.schemaVersion !== V4_SCHEMA_VERSION) return false;
  if (!isPersistableNonNegativeNumber(value.createdAt) || !isPersistableNonNegativeNumber(value.updatedAt) || !isPersistableNonNegativeNumber(value.lastProcessedAt)
    || value.updatedAt < value.createdAt
    || value.lastProcessedAt < value.createdAt
    || value.lastProcessedAt > value.updatedAt) return false;
  const createdAt = value.createdAt;
  const updatedAt = value.updatedAt;

  const meta = value.meta;
  const run = value.run;
  if (!isRecord(meta) || !isRecord(run)) return false;

  const currencies = meta.currencies;
  if (!isRecord(currencies)
    || Object.keys(currencies).length !== CURRENCY_KEYS.length
    || !Object.keys(currencies).every((key) => CURRENCY_KEYS.includes(key as V4CurrencyKey))
    || !CURRENCY_KEYS.every((key) => isPersistableNonNegativeNumber(currencies[key]))) return false;

  const facilities = meta.facilities;
  if (!isRecord(facilities) || Object.keys(facilities).length !== FACILITY_IDS.length || !FACILITY_IDS.every((id) => {
    const facility = facilities[id];
      return isRecord(facility)
      && facility.id === id
      && isPersistableNumber(facility.level) && Number.isInteger(facility.level) && facility.level >= 1
      && (facility.activeTaskId === null || typeof facility.activeTaskId === 'string');
  })) return false;
  const tasks = meta.tasks;
  if (!isRecord(tasks) || !Object.entries(tasks).every(([id, task]) =>
    isRecord(task) && isFacilityTaskRecord(task) && task.id === id)
    || !Array.isArray(meta.agents) || !Array.isArray(meta.unlockedRealms) || !Array.isArray(meta.sagaEntries)
    || !meta.sagaEntries.every(isSagaEntryRecord)
    || new Set(meta.sagaEntries.map((entry) => entry.id)).size !== meta.sagaEntries.length) return false;
  if (Object.values(tasks).some((task) => isRecord(task)
    && typeof task.startedAt === 'number'
    && (task.startedAt < createdAt || task.startedAt > updatedAt))) return false;
  if (meta.unlockedRealms.length === 0
    || new Set(meta.unlockedRealms).size !== meta.unlockedRealms.length
    || !meta.unlockedRealms.includes('joseon_plains')
    || !meta.unlockedRealms.every((id) => typeof id === 'string' && REALM_IDS.includes(id as typeof REALM_IDS[number]))) return false;

  const settings = meta.settings;
  if (!isRecord(settings) || !isPersistableNonNegativeNumber(settings.music) || settings.music > 1
    || !isPersistableNonNegativeNumber(settings.sfx) || settings.sfx > 1 || typeof settings.muted !== 'boolean') return false;
  const agentIds = meta.agents.map((agent) => isRecord(agent) ? agent.id : undefined);
  if (meta.agents.length !== Object.keys(AGENT_DEFINITIONS).length
    || new Set(agentIds).size !== meta.agents.length
    || !Object.keys(AGENT_DEFINITIONS).every((id) => agentIds.includes(id))) return false;
  if (!meta.agents.every((agent) => isRecord(agent)
    && typeof agent.id === 'string' && Object.prototype.hasOwnProperty.call(AGENT_DEFINITIONS, agent.id)
    && typeof agent.nameKR === 'string' && typeof agent.roleKR === 'string' && typeof agent.trait === 'string'
    && isPersistableNonNegativeNumber(agent.level) && Number.isInteger(agent.level) && agent.level >= 1 && agent.level <= 3
    && isPersistableNonNegativeNumber(agent.trust) && agent.trust <= 100
    && isPersistableNonNegativeNumber(agent.fatigue) && agent.fatigue <= 100
    && (agent.activeTaskId === null || typeof agent.activeTaskId === 'string'))) return false;
  for (const agent of meta.agents) {
    if (!isRecord(agent) || typeof agent.id !== 'string') return false;
    const definition = AGENT_DEFINITIONS[agent.id as keyof typeof AGENT_DEFINITIONS];
    if (!definition || agent.nameKR !== definition.nameKR || agent.roleKR !== definition.roleKR || agent.trait !== definition.trait) return false;
  }

  const expedition = run.expedition;
  if (expedition !== null && !isExpeditionRecord(expedition)) return false;
  if (expedition !== null
    && typeof expedition.startedAt === 'number'
    && (expedition.startedAt < createdAt || expedition.startedAt > updatedAt)) return false;
  if (expedition !== null && !meta.unlockedRealms.includes(expedition.realmId as typeof REALM_IDS[number])) return false;
  const hasTrainingTask = Object.values(tasks).some((task) => isRecord(task) && task.facilityId === 'training');
  if (expedition !== null && hasTrainingTask) return false;
  const lastExpeditionResult = run.lastExpeditionResult;
  if (lastExpeditionResult !== undefined && lastExpeditionResult !== null) {
    if (!isExpeditionResultRecord(lastExpeditionResult)
      || typeof lastExpeditionResult.completedAt !== 'number'
      || lastExpeditionResult.completedAt < value.createdAt
      || lastExpeditionResult.completedAt > value.updatedAt
      || !meta.unlockedRealms.includes(lastExpeditionResult.realmId as typeof REALM_IDS[number])) return false;
  }

  // Facility, task, and agent links must be symmetric. This prevents a
  // partially-written save from making a task impossible to finish or
  // leaving an agent permanently marked as busy.
  for (const facilityId of FACILITY_IDS) {
    const facility = facilities[facilityId];
    const taskId = isRecord(facility) ? facility.activeTaskId : null;
    if (taskId !== null) {
      const task = tasks[taskId as string];
      if (!isRecord(task) || task.facilityId !== facilityId) return false;
    }
  }
  for (const [taskId, candidate] of Object.entries(tasks)) {
    if (!isRecord(candidate)) return false;
    const facility = facilities[candidate.facilityId as string];
    if (!isRecord(facility) || facility.activeTaskId !== taskId) return false;
    if (candidate.assignedAgentId !== null) {
      const agent = meta.agents.find((item) => isRecord(item) && item.id === candidate.assignedAgentId);
      const definition = AGENT_DEFINITIONS[candidate.assignedAgentId as keyof typeof AGENT_DEFINITIONS];
      if (!agent || agent.activeTaskId !== taskId || definition?.specialty !== candidate.facilityId) return false;
    }
  }
  for (const candidate of meta.agents) {
    if (!isRecord(candidate) || candidate.activeTaskId === null) continue;
    const task = tasks[candidate.activeTaskId as string];
    const assignedExpedition = expedition !== null
      && isRecord(expedition)
      && expedition.id === candidate.activeTaskId
      && expedition.assignedAgentId === candidate.id;
    if ((!isRecord(task) || task.assignedAgentId !== candidate.id) && !assignedExpedition) return false;
  }
  if (expedition !== null) {
    const expeditionAgents = meta.agents.filter((agent) => isRecord(agent) && agent.activeTaskId === expedition.id);
    if (expedition.assignedAgentId === 'guide') {
      const guide = meta.agents.find((agent) => isRecord(agent) && agent.id === 'guide');
      if (!guide || guide.activeTaskId !== expedition.id || expeditionAgents.some((agent) => agent.id !== 'guide')) return false;
    } else if (expeditionAgents.length > 0) {
      return false;
    }
  }

  const hero = run.hero;
  if (!isRecord(hero) || typeof hero.name !== 'string' || hero.name.trim().length === 0
    || typeof hero.emoji !== 'string' || hero.emoji.trim().length === 0
    || !REALM_IDS.includes(hero.realmId as typeof REALM_IDS[number])
    || !['rest', 'train', 'expedition'].includes(hero.currentAction as string)
    || !Array.isArray(hero.equipmentIds) || !hero.equipmentIds.every((id) => typeof id === 'string')
    || (hero.equipmentLevels !== undefined && (!isRecord(hero.equipmentLevels)
      || !Object.entries(hero.equipmentLevels).every(([id, level]) => typeof id === 'string'
        && isPersistableNonNegativeNumber(level) && Number.isInteger(level) && level >= 1 && level <= 20)))) return false;
  const equipmentIds = hero.equipmentIds as string[];
  if (hero.equipmentLevels !== undefined) {
    const equipmentLevels = hero.equipmentLevels as Record<string, unknown>;
    if (new Set(equipmentIds).size !== equipmentIds.length
      || Object.keys(equipmentLevels).length !== equipmentIds.length
      || !equipmentIds.every((id) => Object.prototype.hasOwnProperty.call(equipmentLevels, id))) return false;
  }
  if (!meta.unlockedRealms.includes(hero.realmId as typeof REALM_IDS[number])) return false;
  const heroAge = hero.age;
  const heroLevel = hero.level;
  const heroExp = hero.exp;
  const heroHp = hero.hp;
  const heroHpMax = hero.hpMax;
  const heroAtk = hero.atk;
  const heroDef = hero.def;
  const heroDefBase = hero.defBase;
  const heroCritRate = hero.critRateBase;
  const heroActionCount = hero.actionCount;
  const heroRejuvenationCount = hero.rejuvenationCount;
  if (!isPersistableNumber(heroAge) || !isPersistableNumber(heroLevel) || !isPersistableNumber(heroExp)
    || !isPersistableNumber(heroHp) || !isPersistableNumber(heroHpMax) || !isPersistableNumber(heroAtk)
    || !isPersistableNumber(heroDef) || !isPersistableNumber(heroDefBase) || !isPersistableNumber(heroCritRate)
    || !isPersistableNumber(heroActionCount) || !isPersistableNumber(heroRejuvenationCount)) return false;
  if (!Number.isInteger(heroAge) || heroAge < 5
    || !Number.isInteger(heroLevel) || heroLevel < 1
    || heroExp < 0
    || heroHp < 0 || heroHpMax <= 0 || heroHp > heroHpMax
    || heroAtk < 0 || heroDef < 0 || heroDefBase < 0
    || heroCritRate < 0 || heroCritRate > 1
    || !Number.isInteger(heroActionCount) || heroActionCount < 0
    || !Number.isInteger(heroRejuvenationCount) || heroRejuvenationCount < 0) return false;
  const expectedHeroAction = expedition !== null ? 'expedition' : hasTrainingTask ? 'train' : 'rest';
  if (hero.currentAction !== expectedHeroAction) return false;
  return ['aggression', 'hoarding', 'training'].includes(run.policy as string)
    && isPersistableNonNegativeNumber(run.interventionCharges)
    && Number.isInteger(run.interventionCharges)
    && run.interventionCharges <= V4_MAX_INTERVENTION_CHARGES;
}

function emptyFacilities(): Record<string, FacilityState> {
  return Object.fromEntries(
    FACILITY_IDS.map((id) => [id, { id, level: 1, activeTaskId: null }]),
  );
}

function initialAgents(): SupportAgent[] {
  return (Object.keys(AGENT_DEFINITIONS) as Array<keyof typeof AGENT_DEFINITIONS>).map((id) => {
    const definition = AGENT_DEFINITIONS[id];
    return {
      id,
      nameKR: definition.nameKR,
      roleKR: definition.roleKR,
      level: 1,
      trust: 30,
      fatigue: 0,
      trait: definition.trait,
      activeTaskId: null,
    };
  });
}

function initialHero(seed: number): V4HeroSnapshot {
  const name = HERO_NAMES[Math.abs(Math.floor(seed)) % HERO_NAMES.length] ?? HERO_NAMES[0];
  return {
    name,
    emoji: '⚔️',
    age: 17,
    level: 1,
    exp: 0,
    hp: 1_000,
    hpMax: 1_000,
    atk: 160,
    def: 80,
    defBase: 80,
    critRateBase: 0.05,
    realmId: 'joseon_plains',
    equipmentIds: [],
    equipmentLevels: {},
    actionCount: HeroLifecycle.actionsForAge(17),
    rejuvenationCount: 0,
    currentAction: 'rest',
  };
}

export function createInitialV4Save(seed: number): V4SaveEnvelope {
  const now = Date.now();
  return {
    schemaVersion: V4_SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    lastProcessedAt: now,
    meta: {
      currencies: { spirit: 100, gold: 100, materials: 12, rift: 0 },
      facilities: emptyFacilities(),
      tasks: {},
      agents: initialAgents(),
      unlockedRealms: ['joseon_plains'],
      sagaEntries: [{
        id: `saga-birth-${now}`,
        kind: 'birth',
        createdAt: now,
        title: '영원한 후원자의 탄생',
        text: `${initialHero(seed).name}이(가) 신의 마을에서 첫 발을 내디뎠다.`,
      }],
      settings: { music: 0.7, sfx: 0.8, muted: false },
    },
    run: {
      hero: initialHero(seed),
      policy: 'aggression',
      expedition: null,
      lastExpeditionResult: null,
      interventionCharges: 1,
    },
  };
}

export function migrateV3HeroSnapshot(input: HeroSnapshot): V4HeroSnapshot {
  const snapshot = input && typeof input === 'object' ? input : {} as HeroSnapshot;
  const legacyEquipment = Array.isArray(snapshot.equipment)
    ? snapshot.equipment.filter((id): id is string => typeof id === 'string')
    : [];
  const equipmentIds = [...new Set(legacyEquipment)];
  const equipmentLevels = Object.fromEntries(
    equipmentIds.map((id) => [id, Math.min(20, Math.max(1, legacyEquipment.filter((candidate) => candidate === id).length))]),
  );
  const name = finiteStringOr(snapshot.name, '이름 없는 영웅');
  const emoji = finiteStringOr(snapshot.emoji, '⚔️');
  const age = Math.max(5, positiveIntegerOr(snapshot.age, 17));
  const level = positiveIntegerOr(snapshot.level, 1);
  const expLimit = level * 100;
  const rawExp = finiteNonNegativeOr(snapshot.exp, 0);
  const exp = Number.isFinite(expLimit) ? Math.min(rawExp, Math.max(0, expLimit - 1)) : rawExp;
  const hpMax = finitePositiveOr(snapshot.hpMax, 1_000);
  const hp = Math.min(hpMax, finiteNonNegativeOr(snapshot.hp, hpMax));
  const atk = finiteNonNegativeOr(snapshot.atk, finiteNonNegativeOr(snapshot.atkBase, 160));
  const fallbackDefBase = Math.round(finiteNonNegativeOr(snapshot.hpBase, hpMax) * 0.1);
  const defBase = finiteNonNegativeOr(snapshot.defBase, fallbackDefBase);
  const fallbackDef = Math.round(hpMax * 0.1);
  const def = finiteNonNegativeOr(snapshot.def, finiteNonNegativeOr(snapshot.defBase, fallbackDef));
  const actionCount = nonNegativeIntegerOr(snapshot.actionCount, safeActionCountForAge(age));
  const rejuvenationCount = nonNegativeIntegerOr(snapshot.rejuvenationCount, 0);
  return {
    name,
    emoji,
    age,
    level,
    exp,
    hp,
    hpMax,
    atk,
    def,
    defBase,
    critRateBase: Math.min(1, finiteNonNegativeOr(snapshot.critRateBase, 0.05)),
    realmId: 'joseon_plains',
    equipmentIds,
    equipmentLevels,
    actionCount,
    rejuvenationCount,
    currentAction: 'rest',
  };
}

function hydrateEquipmentStats(save: V4SaveEnvelope): V4SaveEnvelope {
  let next = save;
  if (save.run.hero.equipmentLevels === undefined) {
    const equipmentIds = [...new Set(save.run.hero.equipmentIds)];
    const equipmentLevels = Object.fromEntries(
      equipmentIds.map((id) => [id, Math.min(20, save.run.hero.equipmentIds.filter((candidate) => candidate === id).length)]),
    );
    next = JSON.parse(JSON.stringify(save)) as V4SaveEnvelope;
    next.run.hero.equipmentIds = equipmentIds;
    next.run.hero.equipmentLevels = equipmentLevels;
    applyV4EquipmentBonuses(next.run.hero, getV4EquipmentBonuses(equipmentIds, equipmentLevels));
    next.run.hero.hp = Math.min(next.run.hero.hpMax, next.run.hero.hp);
  }
  if (next.meta.sagaEntries.length > V4_MAX_SAGA_ENTRIES) {
    if (next === save) next = JSON.parse(JSON.stringify(save)) as V4SaveEnvelope;
    next.meta.sagaEntries = next.meta.sagaEntries.slice(0, V4_MAX_SAGA_ENTRIES);
  }
  return next;
}

function nextSagaId(source: V4SaveEnvelope, base: string): string {
  const used = new Set(source.meta.sagaEntries.map((entry) => entry.id));
  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

function cloneV4Save(source: V4SaveEnvelope): V4SaveEnvelope {
  return JSON.parse(JSON.stringify(source)) as V4SaveEnvelope;
}

function destinationHeroAction(source: V4SaveEnvelope): V4HeroSnapshot['currentAction'] {
  if (source.run.expedition) return 'expedition';
  return Object.values(source.meta.tasks).some((task) => task.facilityId === 'training') ? 'train' : 'rest';
}

/** Explicit user-triggered import. V4 never calls this during normal loading. */
export function importV3HeroSnapshot(
  source: V4SaveEnvelope,
  input: HeroSnapshot,
  now: number,
): V4SaveEnvelope {
  const eventAt = isPersistableNonNegativeNumber(now)
    ? Math.max(source.updatedAt, now)
    : source.updatedAt;
  const updatedAt = Math.min(MAX_PERSISTED_NUMBER, Math.max(source.updatedAt, source.lastProcessedAt, eventAt));
  const next = cloneV4Save(source);
  const hero = {
    ...migrateV3HeroSnapshot(input),
    currentAction: destinationHeroAction(source),
  };
  next.updatedAt = updatedAt;
  next.run.hero = hero;
  next.meta.sagaEntries = [{
    id: nextSagaId(next, `saga-import-${eventAt}`),
    kind: 'milestone' as const,
    createdAt: eventAt,
    title: 'V3 영웅 가져오기',
    text: `${hero.name}의 기록을 v4 영웅으로 가져왔습니다.`,
  }, ...next.meta.sagaEntries].slice(0, V4_MAX_SAGA_ENTRIES);
  return next;
}

function resourceDelta(
  before: Record<V4CurrencyKey, number>,
  after: Record<V4CurrencyKey, number>,
): Partial<Record<V4CurrencyKey, number>> {
  const result: Partial<Record<V4CurrencyKey, number>> = {};
  for (const key of CURRENCY_KEYS) {
    const delta = after[key] - before[key];
    if (delta !== 0) result[key] = delta;
  }
  return result;
}

function summaryEquipmentLevel(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(20, Math.max(1, Math.floor(value)))
    : 1;
}

export function simulateOfflineProgress(
  save: V4SaveEnvelope,
  now: number,
): { save: V4SaveEnvelope; summary: OfflineSummary } {
  const beforeCurrencies = { ...save.meta.currencies };
  const beforeEquipment = [...save.run.hero.equipmentIds];
  const beforeTaskIds = Object.keys(save.meta.tasks);
  const expeditionWasReady = Boolean(save.run.expedition
    && save.run.expedition.status === 'traveling'
    && save.run.expedition.completesAt <= now);

  if (!isPersistableNonNegativeNumber(now)) {
    return {
      save,
      summary: {
        processedSeconds: 0, efficiency: V4_OFFLINE_EFFICIENCY, completedTaskIds: [],
        completedExpedition: false, resourcesGained: {}, equipmentGained: [], equipmentUpgraded: [],
        wasClamped: false, clockAnomaly: 'invalid',
        notes: ['기기 시각을 확인할 수 없습니다. 보상을 정산하지 않았습니다.'],
      },
    };
  }

  if (now < save.lastProcessedAt) {
    return {
      save,
      summary: {
        processedSeconds: 0, efficiency: V4_OFFLINE_EFFICIENCY, completedTaskIds: [],
        completedExpedition: false, resourcesGained: {}, equipmentGained: [], equipmentUpgraded: [],
        wasClamped: false, clockAnomaly: 'backwards',
        notes: ['기기의 시간이 이전 처리 시각보다 빠릅니다. 보상을 중복 정산하지 않았습니다.'],
      },
    };
  }

  if (save.updatedAt > now) {
    return {
      save,
      summary: {
        processedSeconds: 0, efficiency: V4_OFFLINE_EFFICIENCY, completedTaskIds: [],
        completedExpedition: false, resourcesGained: {}, equipmentGained: [], equipmentUpgraded: [],
        wasClamped: false, clockAnomaly: 'future',
        notes: ['저장 시각이 현재 기기 시각보다 미래입니다. 시계를 확인한 뒤 다시 시도해 주세요.'],
      },
    };
  }

  const rawElapsed = now - save.lastProcessedAt;
  const processedMs = Math.min(rawElapsed, V4_OFFLINE_CAP_MS);
  const processUntil = save.lastProcessedAt + processedMs;
  const completedBefore = beforeTaskIds.filter((id) => save.meta.tasks[id]?.completesAt <= processUntil);
  if (rawElapsed === 0 && completedBefore.length === 0 && !expeditionWasReady) {
    return {
      save,
      summary: {
        processedSeconds: 0, efficiency: V4_OFFLINE_EFFICIENCY, completedTaskIds: [],
        completedExpedition: false, resourcesGained: {}, equipmentGained: [], equipmentUpgraded: [],
        wasClamped: false, clockAnomaly: null,
        notes: [],
      },
    };
  }
  const processed = completeFacilityTasks(save, processUntil, V4_OFFLINE_EFFICIENCY, false, true);
  const completedTaskIds = completedBefore.filter((id) => !processed.meta.tasks[id]);
  const completedExpedition = Boolean(expeditionWasReady && !processed.run.expedition);

  const nextSave: V4SaveEnvelope = {
    ...processed,
    // The real clock is consumed even when the reward calculation is capped.
    // This prevents repeatedly reopening the app from replaying the same 8h.
    lastProcessedAt: now,
    updatedAt: now,
  };

  return {
    save: nextSave,
    summary: {
      processedSeconds: Math.floor(processedMs / 1000),
      efficiency: V4_OFFLINE_EFFICIENCY,
      completedTaskIds,
      completedExpedition,
      resourcesGained: resourceDelta(beforeCurrencies, nextSave.meta.currencies),
      equipmentGained: nextSave.run.hero.equipmentIds.filter((id) => !beforeEquipment.includes(id)),
      equipmentUpgraded: nextSave.run.hero.equipmentIds.filter((id) => beforeEquipment.includes(id)
        && summaryEquipmentLevel(nextSave.run.hero.equipmentLevels?.[id])
          > summaryEquipmentLevel(save.run.hero.equipmentLevels?.[id])),
      wasClamped: rawElapsed > V4_OFFLINE_CAP_MS,
      clockAnomaly: null,
      notes: rawElapsed === 0 ? [] : ['안전한 시설 작업과 원정만 오프라인으로 정산했습니다.'],
    },
  };
}

export function loadV4Save(storage: Storage | undefined = defaultStorage()): V4SaveEnvelope | null {
  const result = readV4Save(storage);
  return result.status === 'valid' ? result.save : null;
}

export function readV4Save(storage: Storage | undefined = defaultStorage()): V4SaveLoadResult {
  if (!storage) return { status: 'missing' };

  let raw: string | null;
  try {
    raw = storage.getItem(V4_SAVE_KEY);
  } catch {
    return { status: 'unavailable' };
  }
  if (raw === null) return { status: 'missing' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: 'invalid', reason: 'malformed_json' };
  }

  return isV4SaveEnvelope(parsed)
    ? { status: 'valid', save: hydrateEquipmentStats(parsed) }
    : { status: 'invalid', reason: 'invalid_schema' };
}

/**
 * Explicit recovery action. A valid save is never replaced. When the stored
 * payload is invalid, keep one recoverable copy before writing a new save.
 */
export function startFreshV4Save(
  storage: Storage | undefined = defaultStorage(),
  seed: number = Date.now(),
): V4SaveEnvelope {
  const current = readV4Save(storage);
  if (current.status === 'valid') return current.save;

  if (current.status === 'invalid' && storage) {
    try {
      const raw = storage.getItem(V4_SAVE_KEY);
      if (raw !== null) storage.setItem(V4_RECOVERY_BACKUP_KEY, raw);
    } catch {
      // The new game can still start when the best-effort recovery copy fails.
    }
  }

  const fresh = createInitialV4Save(seed);
  persistV4Save(fresh, storage);
  return fresh;
}

export function persistV4Save(save: V4SaveEnvelope, storage: Storage | undefined = defaultStorage()): boolean {
  if (!storage || !isV4SaveEnvelope(save)) return false;
  try {
    storage.setItem(V4_SAVE_KEY, JSON.stringify(save));
    return true;
  } catch {
    // Persistence is best-effort on local-only builds. Quota, private-mode,
    // or platform storage errors must never interrupt active gameplay.
    return false;
  }
}
