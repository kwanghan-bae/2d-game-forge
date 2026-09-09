import type { HeroSnapshot } from '../hero/HeroEntity';
import { HeroLifecycle } from '../hero/HeroLifecycle';
import { FACILITY_IDS, AGENT_DEFINITIONS, getVillageRealmDefinition, REALM_IDS } from './data';
import { completeFacilityTasks } from './domain';
import { applyVillageEquipmentBonuses, getVillageEquipmentBonuses, getVillageEquipmentDefinition } from './equipment';
import { LEGACY_CURRENT_SAVE_KEY, normalizeLegacyVillageSave } from './legacyCompatibility';
import type {
  FacilityState,
  OfflineSummary,
  SupportAgent,
  VillageCurrencyKey,
  VillageHeroSnapshot,
  VillageSaveEnvelope,
} from './types';
import { Village_MAX_INTERVENTION_CHARGES, Village_MAX_SAGA_ENTRIES } from './types';

export { Village_MAX_INTERVENTION_CHARGES } from './types';

export const Village_SAVE_KEY = 'shin-ui-eternal-sponsor-save-v2';
export { LEGACY_CURRENT_SAVE_KEY } from './legacyCompatibility';
export const Village_SCHEMA_VERSION = 2 as const;
export const Village_OFFLINE_CAP_MS = 8 * 60 * 60 * 1000;
// A normal visible tick runs every second. A larger gap is treated like a
// background resume so live refresh cannot bypass the offline safety rules.
export const Village_LIVE_REFRESH_GAP_MS = 2 * 60 * 1000;
export const Village_OFFLINE_EFFICIENCY = 0.7;
export const Village_RECOVERY_BACKUP_KEY = `${Village_SAVE_KEY}-recovery-backup`;

export type VillageSaveLoadResult =
  | { status: 'missing' }
  | { status: 'valid'; save: VillageSaveEnvelope }
  | { status: 'invalid'; reason: 'malformed_json' | 'invalid_schema' }
  | { status: 'unavailable' };

const CURRENCY_KEYS: VillageCurrencyKey[] = ['spirit', 'gold', 'materials', 'rift'];
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

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
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

function isCurrencyRecord(value: unknown): value is Partial<Record<VillageCurrencyKey, number>> {
  return isRecord(value) && Object.entries(value).every(([key, amount]) =>
    CURRENCY_KEYS.includes(key as VillageCurrencyKey)
      && isPersistableNonNegativeNumber(amount)
      && Number.isInteger(amount));
}

function isFacilityTaskRecord(value: unknown): boolean {
  if (!isRecord(value) || !isNonEmptyString(value.id) || typeof value.facilityId !== 'string'
    || !FACILITY_IDS.includes(value.facilityId as typeof FACILITY_IDS[number]) || !isNonEmptyString(value.type)
    || !isPersistableNonNegativeNumber(value.startedAt) || !isPersistableNonNegativeNumber(value.completesAt)
    || value.completesAt <= value.startedAt
    || !isCurrencyRecord(value.input) || !isCurrencyRecord(value.outputPreview)
    || (value.outputEquipmentIds !== undefined
      && (!Array.isArray(value.outputEquipmentIds) || !value.outputEquipmentIds.every((id) =>
        typeof id === 'string' && getVillageEquipmentDefinition(id) !== undefined)))
    || (value.heroExpGain !== undefined && !isPersistableNonNegativeNumber(value.heroExpGain))
    || (value.assignedAgentId !== null
      && (typeof value.assignedAgentId !== 'string'
        || !Object.prototype.hasOwnProperty.call(AGENT_DEFINITIONS, value.assignedAgentId)))) return false;
  return true;
}

function isExpeditionRecord(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && isNonEmptyString(value.id)
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
    && isNonEmptyString(value.id)
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
    && isNonEmptyString(value.weaknessKR)
    && typeof value.recommendedFacilityId === 'string'
    && FACILITY_IDS.includes(value.recommendedFacilityId as typeof FACILITY_IDS[number])
    && (value.recommendedEquipmentId === null
      || (typeof value.recommendedEquipmentId === 'string'
        && getVillageEquipmentDefinition(value.recommendedEquipmentId) !== undefined))
    && isPersistableNonNegativeNumber(value.retryAfterSeconds)
    && (value.successChance === undefined || (isPersistableNonNegativeNumber(value.successChance) && value.successChance <= 1))
    && (value.encountersCleared === undefined
      || (isPersistableNonNegativeNumber(value.encountersCleared) && Number.isInteger(value.encountersCleared) && value.encountersCleared <= 3))
    && (value.totalEncounterCount === undefined
      || (isPersistableNonNegativeNumber(value.totalEncounterCount) && Number.isInteger(value.totalEncounterCount) && value.totalEncounterCount >= 1 && value.totalEncounterCount <= 3));
}

function isSagaEntryRecord(value: unknown): boolean {
  return isRecord(value) && isNonEmptyString(value.id) && isPersistableNonNegativeNumber(value.createdAt)
    && isNonEmptyString(value.title) && isNonEmptyString(value.text)
    && ['birth', 'facility', 'expedition', 'rejuvenation', 'milestone'].includes(value.kind as string);
}

function isVillageSaveEnvelope(value: unknown): value is VillageSaveEnvelope {
  if (!isRecord(value) || value.schemaVersion !== Village_SCHEMA_VERSION) return false;
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
    || !Object.keys(currencies).every((key) => CURRENCY_KEYS.includes(key as VillageCurrencyKey))
    || !CURRENCY_KEYS.every((key) => isPersistableNonNegativeNumber(currencies[key])
      && Number.isInteger(currencies[key]))) return false;

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
    || !meta.sagaEntries.every((entry) => entry.createdAt >= createdAt && entry.createdAt <= updatedAt)
    || new Set(meta.sagaEntries.map((entry) => entry.id)).size !== meta.sagaEntries.length) return false;
  if (Object.values(tasks).some((task) => isRecord(task)
    && typeof task.startedAt === 'number'
    && (task.startedAt < createdAt || task.startedAt > updatedAt))) return false;
  if (meta.unlockedRealms.length === 0
    || new Set(meta.unlockedRealms).size !== meta.unlockedRealms.length
    || !meta.unlockedRealms.includes('sacred_fields')
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
  // A new expedition clears the previous result before charging its cost.
  // Keeping both records would let a partially-written save expose a stale
  // result while a different run is active, so quarantine the contradiction
  // instead of guessing which side should win during hydration.
  if (expedition !== null && lastExpeditionResult !== undefined && lastExpeditionResult !== null) return false;
  if (lastExpeditionResult !== undefined && lastExpeditionResult !== null) {
    if (!isExpeditionResultRecord(lastExpeditionResult)
      || typeof lastExpeditionResult.completedAt !== 'number'
      || lastExpeditionResult.completedAt < value.createdAt
      || lastExpeditionResult.completedAt > value.updatedAt
      || !meta.unlockedRealms.includes(lastExpeditionResult.realmId as typeof REALM_IDS[number])) return false;
  }

  // Task, expedition, result, and saga IDs share the domain's monotonic ID
  // allocator. Reject a save that violates that namespace boundary instead
  // of allowing two completion paths to mutate the same record identity.
  const reservedIds = new Set(Object.keys(tasks));
  const expeditionId = expedition && typeof expedition.id === 'string' ? expedition.id : undefined;
  const resultId = isRecord(lastExpeditionResult) && typeof lastExpeditionResult.id === 'string'
    ? lastExpeditionResult.id
    : undefined;
  if ((expeditionId && reservedIds.has(expeditionId))
    || (resultId && reservedIds.has(resultId))
    || (expeditionId && resultId && expeditionId === resultId)
    || meta.sagaEntries.some((entry) => reservedIds.has(entry.id)
      || entry.id === expeditionId
      || entry.id === resultId)) return false;

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
    || !Array.isArray(hero.equipmentIds)
    || !hero.equipmentIds.every((id) => typeof id === 'string' && id.trim().length > 0)
    || (hero.equipmentLevels !== undefined && (!isRecord(hero.equipmentLevels)
      || !Object.entries(hero.equipmentLevels).every(([id, level]) => id.trim().length > 0
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
    && run.interventionCharges <= Village_MAX_INTERVENTION_CHARGES;
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

function initialHero(seed: number): VillageHeroSnapshot {
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
    realmId: 'sacred_fields',
    equipmentIds: [],
    equipmentLevels: {},
    actionCount: HeroLifecycle.actionsForAge(17),
    rejuvenationCount: 0,
    currentAction: 'rest',
  };
}

export function createInitialVillageSave(seed: number): VillageSaveEnvelope {
  const now = Date.now();
  return {
    schemaVersion: Village_SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    lastProcessedAt: now,
    meta: {
      currencies: { spirit: 100, gold: 100, materials: 12, rift: 0 },
      facilities: emptyFacilities(),
      tasks: {},
      agents: initialAgents(),
      unlockedRealms: ['sacred_fields'],
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

export function migrateLegacyHeroSnapshot(input: HeroSnapshot): VillageHeroSnapshot {
  const snapshot = input && typeof input === 'object' ? input : {} as HeroSnapshot;
  const legacyEquipment = Array.isArray(snapshot.equipment)
    ? snapshot.equipment.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
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
    realmId: 'sacred_fields',
    equipmentIds,
    equipmentLevels,
    actionCount,
    rejuvenationCount,
    currentAction: 'rest',
  };
}

function hydrateEquipmentStats(save: VillageSaveEnvelope): VillageSaveEnvelope {
  let next = save;
  if (save.run.hero.equipmentLevels === undefined) {
    const equipmentIds = [...new Set(save.run.hero.equipmentIds)];
    const equipmentLevels = Object.fromEntries(
      equipmentIds.map((id) => [id, Math.min(20, save.run.hero.equipmentIds.filter((candidate) => candidate === id).length)]),
    );
    next = JSON.parse(JSON.stringify(save)) as VillageSaveEnvelope;
    next.run.hero.equipmentIds = equipmentIds;
    next.run.hero.equipmentLevels = equipmentLevels;
    applyVillageEquipmentBonuses(next.run.hero, getVillageEquipmentBonuses(equipmentIds, equipmentLevels));
    next.run.hero.hp = Math.min(next.run.hero.hpMax, next.run.hero.hp);
  }
  if (next.meta.sagaEntries.length > Village_MAX_SAGA_ENTRIES) {
    if (next === save) next = JSON.parse(JSON.stringify(save)) as VillageSaveEnvelope;
    next.meta.sagaEntries = next.meta.sagaEntries.slice(0, Village_MAX_SAGA_ENTRIES);
  }
  return next;
}

function nextSagaId(source: VillageSaveEnvelope, base: string): string {
  const isUsed = (id: string): boolean => Object.prototype.hasOwnProperty.call(source.meta.tasks, id)
    || source.run.expedition?.id === id
    || source.run.lastExpeditionResult?.id === id
    || source.meta.sagaEntries.some((entry) => entry.id === id);
  if (!isUsed(base)) return base;
  let suffix = 2;
  while (isUsed(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

function cloneVillageSave(source: VillageSaveEnvelope): VillageSaveEnvelope {
  return JSON.parse(JSON.stringify(source)) as VillageSaveEnvelope;
}

function destinationHeroAction(source: VillageSaveEnvelope): VillageHeroSnapshot['currentAction'] {
  if (source.run.expedition) return 'expedition';
  return Object.values(source.meta.tasks).some((task) => task.facilityId === 'training') ? 'train' : 'rest';
}

/** Explicit user-triggered import. Village never calls this during normal loading. */
export function importLegacyHeroSnapshot(
  source: VillageSaveEnvelope,
  input: HeroSnapshot,
  now: number,
): VillageSaveEnvelope {
  if (source.run.expedition) return source;
  const eventAt = isPersistableNonNegativeNumber(now)
    ? Math.max(source.updatedAt, now)
    : source.updatedAt;
  const updatedAt = Math.min(MAX_PERSISTED_NUMBER, Math.max(source.updatedAt, source.lastProcessedAt, eventAt));
  const next = cloneVillageSave(source);
  const destinationRealmId = source.meta.unlockedRealms.includes(source.run.hero.realmId)
    ? source.run.hero.realmId
    : 'sacred_fields';
  const hero = {
    ...migrateLegacyHeroSnapshot(input),
    realmId: destinationRealmId,
    currentAction: destinationHeroAction(source),
  };
  next.updatedAt = updatedAt;
  next.run.hero = hero;
  next.meta.sagaEntries = [{
    id: nextSagaId(next, `saga-import-${eventAt}`),
    kind: 'milestone' as const,
    createdAt: eventAt,
    title: '기존 영웅 기록 가져오기',
    text: `${hero.name}의 기록을 현재 영웅으로 가져왔습니다.`,
  }, ...next.meta.sagaEntries].slice(0, Village_MAX_SAGA_ENTRIES);
  return next;
}

function resourceDelta(
  before: Record<VillageCurrencyKey, number>,
  after: Record<VillageCurrencyKey, number>,
): Partial<Record<VillageCurrencyKey, number>> {
  const result: Partial<Record<VillageCurrencyKey, number>> = {};
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

function shouldParkRiskyExpeditionAfterOfflineCap(
  expedition: VillageSaveEnvelope['run']['expedition'],
  processUntil: number,
  now: number,
): boolean {
  if (!expedition || expedition.status !== 'traveling'
    || expedition.completesAt > now || expedition.completesAt <= processUntil) return false;
  const realm = getVillageRealmDefinition(expedition.realmId);
  return Boolean(realm && !realm.offlineSafe);
}

export function simulateOfflineProgress(
  save: VillageSaveEnvelope,
  now: number,
): { save: VillageSaveEnvelope; summary: OfflineSummary } {
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
        processedSeconds: 0, efficiency: Village_OFFLINE_EFFICIENCY, completedTaskIds: [],
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
        processedSeconds: 0, efficiency: Village_OFFLINE_EFFICIENCY, completedTaskIds: [],
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
        processedSeconds: 0, efficiency: Village_OFFLINE_EFFICIENCY, completedTaskIds: [],
        completedExpedition: false, resourcesGained: {}, equipmentGained: [], equipmentUpgraded: [],
        wasClamped: false, clockAnomaly: 'future',
        notes: ['저장 시각이 현재 기기 시각보다 미래입니다. 시계를 확인한 뒤 다시 시도해 주세요.'],
      },
    };
  }

  const rawElapsed = now - save.lastProcessedAt;
  const processedMs = Math.min(rawElapsed, Village_OFFLINE_CAP_MS);
  const processUntil = save.lastProcessedAt + processedMs;
  const completedBefore = beforeTaskIds.filter((id) => save.meta.tasks[id]?.completesAt <= processUntil);
  if (rawElapsed === 0 && completedBefore.length === 0 && !expeditionWasReady) {
    return {
      save,
      summary: {
        processedSeconds: 0, efficiency: Village_OFFLINE_EFFICIENCY, completedTaskIds: [],
        completedExpedition: false, resourcesGained: {}, equipmentGained: [], equipmentUpgraded: [],
        wasClamped: false, clockAnomaly: null,
        notes: [],
      },
    };
  }
  const processed = completeFacilityTasks(save, processUntil, Village_OFFLINE_EFFICIENCY, false, true);
  if (processed === save) {
    // A malformed balance, agent, or task must not consume the offline clock.
    // Keeping the original envelope lets a later recovery or explicit action
    // retry the blocked settlement instead of permanently skipping it.
    return {
      save,
      summary: {
        processedSeconds: 0, efficiency: Village_OFFLINE_EFFICIENCY, completedTaskIds: [],
        completedExpedition: false, resourcesGained: {}, equipmentGained: [], equipmentUpgraded: [],
        wasClamped: false, clockAnomaly: null,
        notes: ['저장 상태를 확인할 수 없어 오프라인 보상을 정산하지 않았습니다.'],
      },
    };
  }
  if (shouldParkRiskyExpeditionAfterOfflineCap(processed.run.expedition, processUntil, now)
    && processed.run.expedition) {
    // A non-safe route that finished after the 8h calculation window must not
    // be consumed by the first live refresh, which would otherwise resolve its
    // boss and permanent progression without an explicit player confirmation.
    processed.run.expedition.status = 'awaiting_confirmation';
  }
  const completedTaskIds = completedBefore.filter((id) => !processed.meta.tasks[id]);
  const completedExpedition = Boolean(expeditionWasReady && !processed.run.expedition);

  const nextSave: VillageSaveEnvelope = {
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
      efficiency: Village_OFFLINE_EFFICIENCY,
      completedTaskIds,
      completedExpedition,
      resourcesGained: resourceDelta(beforeCurrencies, nextSave.meta.currencies),
      equipmentGained: nextSave.run.hero.equipmentIds.filter((id) => !beforeEquipment.includes(id)),
      equipmentUpgraded: nextSave.run.hero.equipmentIds.filter((id) => beforeEquipment.includes(id)
        && summaryEquipmentLevel(nextSave.run.hero.equipmentLevels?.[id])
          > summaryEquipmentLevel(save.run.hero.equipmentLevels?.[id])),
      wasClamped: rawElapsed > Village_OFFLINE_CAP_MS,
      clockAnomaly: null,
      notes: rawElapsed === 0 ? [] : ['안전한 시설 작업과 원정만 오프라인으로 정산했습니다.'],
    },
  };
}

export function loadVillageSave(storage: Storage | undefined = defaultStorage()): VillageSaveEnvelope | null {
  const result = readVillageSave(storage);
  return result.status === 'valid' ? result.save : null;
}

export function readVillageSave(storage: Storage | undefined = defaultStorage()): VillageSaveLoadResult {
  if (!storage) return { status: 'missing' };

  let raw: string | null;
  try {
    raw = storage.getItem(Village_SAVE_KEY);
  } catch {
    return { status: 'unavailable' };
  }
  const isCanonical = raw !== null;
  if (raw === null) {
    try {
      raw = storage.getItem(LEGACY_CURRENT_SAVE_KEY);
    } catch {
      return { status: 'unavailable' };
    }
    if (raw === null) return { status: 'missing' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: 'invalid', reason: 'malformed_json' };
  }

  const candidate = isCanonical ? parsed : normalizeLegacyVillageSave(parsed);
  if (!isVillageSaveEnvelope(candidate)) return { status: 'invalid', reason: 'invalid_schema' };
  const save = hydrateEquipmentStats(candidate);
  if (!isCanonical) {
    try {
      storage.setItem(Village_SAVE_KEY, JSON.stringify(save));
    } catch {
      // A valid legacy save remains playable when canonical persistence fails.
    }
  }
  return { status: 'valid', save };
}

/**
 * Explicit recovery action. A valid save is never replaced. When the stored
 * payload is invalid, keep one recoverable copy before writing a new save.
 */
export function startFreshVillageSave(
  storage: Storage | undefined = defaultStorage(),
  seed: number = Date.now(),
): VillageSaveEnvelope {
  const current = readVillageSave(storage);
  if (current.status === 'valid') return current.save;

  if (current.status === 'invalid' && storage) {
    try {
      const raw = storage.getItem(Village_SAVE_KEY) ?? storage.getItem(LEGACY_CURRENT_SAVE_KEY);
      if (raw !== null) storage.setItem(Village_RECOVERY_BACKUP_KEY, raw);
    } catch {
      // The new game can still start when the best-effort recovery copy fails.
    }
  }

  const fresh = createInitialVillageSave(seed);
  persistVillageSave(fresh, storage);
  return fresh;
}

export function persistVillageSave(save: VillageSaveEnvelope, storage: Storage | undefined = defaultStorage()): boolean {
  if (!storage || !isVillageSaveEnvelope(save)) return false;
  try {
    storage.setItem(Village_SAVE_KEY, JSON.stringify(save));
    return true;
  } catch {
    // Persistence is best-effort on local-only builds. Quota, private-mode,
    // or platform storage errors must never interrupt active gameplay.
    return false;
  }
}
