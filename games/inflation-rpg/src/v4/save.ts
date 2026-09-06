import type { HeroSnapshot } from '../hero/HeroEntity';
import { HeroLifecycle } from '../hero/HeroLifecycle';
import { FACILITY_IDS, AGENT_DEFINITIONS, REALM_IDS } from './data';
import { completeFacilityTasks } from './domain';
import type {
  FacilityState,
  OfflineSummary,
  SupportAgent,
  V4CurrencyKey,
  V4HeroSnapshot,
  V4SaveEnvelope,
} from './types';

export const V4_SAVE_KEY = 'shin-ui-eternal-sponsor-v4-save-v1';
export const V4_SCHEMA_VERSION = 1 as const;
export const V4_OFFLINE_CAP_MS = 8 * 60 * 60 * 1000;
export const V4_OFFLINE_EFFICIENCY = 0.7;

const CURRENCY_KEYS: V4CurrencyKey[] = ['spirit', 'gold', 'materials', 'rift'];
const HERO_NAMES = ['연화', '도윤', '서린', '한결', '무진', '가람'];

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

function isCurrencyRecord(value: unknown): value is Partial<Record<V4CurrencyKey, number>> {
  return isRecord(value) && Object.entries(value).every(([key, amount]) =>
    CURRENCY_KEYS.includes(key as V4CurrencyKey) && isNonNegativeNumber(amount));
}

function isFacilityTaskRecord(value: unknown): boolean {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.facilityId !== 'string'
    || !FACILITY_IDS.includes(value.facilityId as typeof FACILITY_IDS[number]) || typeof value.type !== 'string'
    || !isNonNegativeNumber(value.startedAt) || !isNonNegativeNumber(value.completesAt)
    || !isCurrencyRecord(value.input) || !isCurrencyRecord(value.outputPreview)
    || (value.outputEquipmentIds !== undefined
      && (!Array.isArray(value.outputEquipmentIds) || !value.outputEquipmentIds.every((id) => typeof id === 'string')))
    || (value.assignedAgentId !== null && typeof value.assignedAgentId !== 'string')) return false;
  return true;
}

function isExpeditionRecord(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && typeof value.id === 'string'
    && typeof value.realmId === 'string' && REALM_IDS.includes(value.realmId as typeof REALM_IDS[number])
    && ['aggression', 'hoarding', 'training'].includes(value.policy as string)
    && (value.assignedAgentId === null || value.assignedAgentId === 'guide')
    && isNonNegativeNumber(value.startedAt) && isNonNegativeNumber(value.completesAt)
    && value.status === 'traveling';
}

function isSagaEntryRecord(value: unknown): boolean {
  return isRecord(value) && typeof value.id === 'string' && typeof value.createdAt === 'number'
    && Number.isFinite(value.createdAt) && typeof value.title === 'string' && typeof value.text === 'string'
    && ['birth', 'facility', 'expedition', 'rejuvenation', 'milestone'].includes(value.kind as string);
}

function isV4SaveEnvelope(value: unknown): value is V4SaveEnvelope {
  if (!isRecord(value) || value.schemaVersion !== V4_SCHEMA_VERSION) return false;
  if (!isNonNegativeNumber(value.createdAt) || !isNonNegativeNumber(value.updatedAt) || !isNonNegativeNumber(value.lastProcessedAt)) return false;

  const meta = value.meta;
  const run = value.run;
  if (!isRecord(meta) || !isRecord(run)) return false;

  const currencies = meta.currencies;
  if (!isRecord(currencies) || !CURRENCY_KEYS.every((key) => isNonNegativeNumber(currencies[key]))) return false;

  const facilities = meta.facilities;
  if (!isRecord(facilities) || !FACILITY_IDS.every((id) => {
    const facility = facilities[id];
    return isRecord(facility)
      && facility.id === id
      && isFiniteNumber(facility.level) && facility.level >= 1
      && (facility.activeTaskId === null || typeof facility.activeTaskId === 'string');
  })) return false;
  const tasks = meta.tasks;
  if (!isRecord(tasks) || !Object.entries(tasks).every(([id, task]) =>
    isRecord(task) && isFacilityTaskRecord(task) && task.id === id)
    || !Array.isArray(meta.agents) || !Array.isArray(meta.unlockedRealms) || !Array.isArray(meta.sagaEntries)
    || !meta.sagaEntries.every(isSagaEntryRecord)) return false;
  if (!meta.unlockedRealms.every((id) => typeof id === 'string' && REALM_IDS.includes(id as typeof REALM_IDS[number]))) return false;

  const settings = meta.settings;
  if (!isRecord(settings) || !isNonNegativeNumber(settings.music) || settings.music > 1
    || !isNonNegativeNumber(settings.sfx) || settings.sfx > 1 || typeof settings.muted !== 'boolean') return false;
  if (!meta.agents.every((agent) => isRecord(agent)
    && typeof agent.id === 'string' && Object.prototype.hasOwnProperty.call(AGENT_DEFINITIONS, agent.id)
    && typeof agent.nameKR === 'string' && typeof agent.roleKR === 'string' && typeof agent.trait === 'string'
    && isNonNegativeNumber(agent.level) && isNonNegativeNumber(agent.trust) && isNonNegativeNumber(agent.fatigue)
    && (agent.activeTaskId === null || typeof agent.activeTaskId === 'string'))) return false;

  const expedition = run.expedition;
  if (expedition !== null && !isExpeditionRecord(expedition)) return false;

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
      if (!agent || agent.activeTaskId !== taskId) return false;
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
  if (!isRecord(hero) || typeof hero.name !== 'string' || typeof hero.emoji !== 'string'
    || !REALM_IDS.includes(hero.realmId as typeof REALM_IDS[number])
    || !['rest', 'train', 'expedition'].includes(hero.currentAction as string)
    || !Array.isArray(hero.equipmentIds) || !hero.equipmentIds.every((id) => typeof id === 'string')) return false;
  const heroNumbers = ['age', 'level', 'exp', 'hp', 'hpMax', 'atk', 'def', 'defBase', 'critRateBase', 'actionCount', 'rejuvenationCount'];
  if (!heroNumbers.every((key) => isFiniteNumber(hero[key]))) return false;
  return ['aggression', 'hoarding', 'training'].includes(run.policy as string)
    && isNonNegativeNumber(run.interventionCharges);
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
      interventionCharges: 1,
    },
  };
}

export function migrateV3HeroSnapshot(input: HeroSnapshot): V4HeroSnapshot {
  return {
    name: input.name,
    emoji: input.emoji,
    age: input.age,
    level: input.level,
    exp: input.exp,
    hp: input.hp,
    hpMax: input.hpMax,
    atk: input.atk,
    def: input.def ?? input.defBase ?? Math.round(input.hpMax * 0.1),
    defBase: input.defBase ?? Math.round(input.hpBase * 0.1),
    critRateBase: input.critRateBase ?? 0.05,
    realmId: 'joseon_plains',
    equipmentIds: [...input.equipment],
    actionCount: input.actionCount,
    rejuvenationCount: input.rejuvenationCount,
    currentAction: 'rest',
  };
}

/** Explicit user-triggered import. V4 never calls this during normal loading. */
export function importV3HeroSnapshot(
  source: V4SaveEnvelope,
  input: HeroSnapshot,
  now: number,
): V4SaveEnvelope {
  const hero = migrateV3HeroSnapshot(input);
  return {
    ...source,
    updatedAt: now,
    run: { ...source.run, hero },
    meta: {
      ...source.meta,
      sagaEntries: [{
        id: `saga-import-${now}`,
        kind: 'milestone',
        createdAt: now,
        title: 'V3 영웅 가져오기',
        text: `${hero.name}의 기록을 v4 영웅으로 가져왔습니다.`,
      }, ...source.meta.sagaEntries],
    },
  };
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

export function simulateOfflineProgress(
  save: V4SaveEnvelope,
  now: number,
): { save: V4SaveEnvelope; summary: OfflineSummary } {
  const beforeCurrencies = { ...save.meta.currencies };
  const beforeEquipment = [...save.run.hero.equipmentIds];
  const beforeTaskIds = Object.keys(save.meta.tasks);
  const expeditionWasReady = Boolean(save.run.expedition && save.run.expedition.completesAt <= now);

  if (now < save.lastProcessedAt) {
    return {
      save,
      summary: {
        processedSeconds: 0, efficiency: V4_OFFLINE_EFFICIENCY, completedTaskIds: [],
        completedExpedition: false, resourcesGained: {}, equipmentGained: [],
        wasClamped: false, clockAnomaly: 'backwards',
        notes: ['기기의 시간이 이전 처리 시각보다 빠릅니다. 보상을 중복 정산하지 않았습니다.'],
      },
    };
  }

  const rawElapsed = now - save.lastProcessedAt;
  const processedMs = Math.min(rawElapsed, V4_OFFLINE_CAP_MS);
  const processUntil = save.lastProcessedAt + processedMs;
  const completedBefore = beforeTaskIds.filter((id) => save.meta.tasks[id]?.completesAt <= processUntil);
  const processed = completeFacilityTasks(save, processUntil, V4_OFFLINE_EFFICIENCY, false);
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
      equipmentGained: nextSave.run.hero.equipmentIds.filter((id, index) => beforeEquipment[index] !== id),
      wasClamped: rawElapsed > V4_OFFLINE_CAP_MS,
      clockAnomaly: null,
      notes: rawElapsed === 0 ? [] : ['안전한 시설 작업과 원정만 오프라인으로 정산했습니다.'],
    },
  };
}

export function loadV4Save(storage: Storage | undefined = defaultStorage()): V4SaveEnvelope | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(V4_SAVE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isV4SaveEnvelope(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function persistV4Save(save: V4SaveEnvelope, storage: Storage | undefined = defaultStorage()): void {
  if (!storage) return;
  try {
    storage.setItem(V4_SAVE_KEY, JSON.stringify(save));
  } catch {
    // Persistence is best-effort on local-only builds. Quota, private-mode,
    // or platform storage errors must never interrupt active gameplay.
  }
}
