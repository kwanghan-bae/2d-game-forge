import type { HeroSnapshot } from '../hero/HeroEntity';
import { HeroLifecycle } from '../hero/HeroLifecycle';
import { FACILITY_IDS, AGENT_DEFINITIONS } from './data';
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

export function loadV4Save(storage: Storage | undefined = typeof window === 'undefined' ? undefined : window.localStorage): V4SaveEnvelope | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(V4_SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as V4SaveEnvelope;
    if (parsed.schemaVersion !== V4_SCHEMA_VERSION || !parsed.meta || !parsed.run) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function persistV4Save(save: V4SaveEnvelope, storage: Storage | undefined = typeof window === 'undefined' ? undefined : window.localStorage): void {
  if (!storage) return;
  storage.setItem(V4_SAVE_KEY, JSON.stringify(save));
}
