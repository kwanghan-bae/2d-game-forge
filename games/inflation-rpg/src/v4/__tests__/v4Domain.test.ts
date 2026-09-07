import { describe, expect, it, vi } from 'vitest';
import type { HeroSnapshot } from '../../hero/HeroEntity';
import { HeroLifecycle } from '../../hero/HeroLifecycle';
import {
  createInitialV4Save,
  importV3HeroSnapshot,
  loadV4Save,
  migrateV3HeroSnapshot,
  persistV4Save,
  simulateOfflineProgress,
} from '../save';
import {
  cancelFacilityTask,
  completeFacilityTasks,
  completeFacilityTaskNow,
  advanceHeroActions,
  getFacilityTaskPreview,
  getFacilityUpgradeCost,
  getExpeditionSuccessChance,
  getV4HeroPower,
  getHeroNextAction,
  grantInterventionCharge,
  grantOfflineResourceBonus,
  rejuvenateHero,
  restAgent,
  setV4Policy,
  confirmPendingExpedition,
  confirmNextRealmUnlock,
  startExpedition,
  startFacilityTask,
  updateV4Settings,
  upgradeFacility,
  useIntervention,
} from '../domain';
import { createV4HeroRuntime } from '../heroRuntime';
import { V4_MAX_SAGA_ENTRIES } from '../types';
import type { FacilityId, RealmId } from '../types';

const HOUR = 60 * 60 * 1000;

describe('v4 save and domain', () => {
  it('creates an isolated launch save with the fixed content boundary', () => {
    vi.setSystemTime(new Date('2026-09-06T00:00:00.000Z'));
    const save = createInitialV4Save(42);

    expect(save.schemaVersion).toBe(1);
    expect(save.meta.currencies).toEqual({ spirit: 100, gold: 100, materials: 12, rift: 0 });
    expect(Object.keys(save.meta.facilities)).toHaveLength(7);
    expect(save.meta.agents.map((agent) => agent.id)).toEqual(['blacksmith', 'mudang', 'guide']);
    expect(save.meta.unlockedRealms).toEqual(['joseon_plains']);
    expect(save.run.expedition).toBeNull();
    expect(save.run.lastExpeditionResult).toBeNull();
    expect(save.run.hero.realmId).toBe('joseon_plains');
    expect(save.run.hero.actionCount).toBe(185);
  });

  it('keeps the saga history bounded to the newest records', () => {
    const initial = createInitialV4Save(43);
    initial.meta.sagaEntries = Array.from({ length: V4_MAX_SAGA_ENTRIES + 5 }, (_, index) => ({
      id: `saga-${index}`,
      kind: 'milestone' as const,
      createdAt: initial.createdAt + index,
      title: `기록 ${index}`,
      text: `내용 ${index}`,
    })).reverse();

    const updated = setV4Policy(initial, 'training', initial.updatedAt + 1_000);

    expect(updated.meta.sagaEntries).toHaveLength(V4_MAX_SAGA_ENTRIES);
    expect(updated.meta.sagaEntries[0]?.id).toBe(`saga-${V4_MAX_SAGA_ENTRIES + 4}`);
    expect(updated.meta.sagaEntries.at(-1)?.id).toBe('saga-5');
  });

  it('round-trips valid V4 saves and rejects malformed schema data', () => {
    const save = createInitialV4Save(13);
    const storage = new Map<string, string>();
    const fakeStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    } as unknown as Storage;

    persistV4Save(save, fakeStorage);
    expect(loadV4Save(fakeStorage)).toMatchObject({ schemaVersion: 1, run: { hero: { name: save.run.hero.name } } });

    const { lastExpeditionResult: _legacyResult, ...legacyRun } = save.run;
    storage.set('shin-ui-eternal-sponsor-v4-save-v1', JSON.stringify({ ...save, run: legacyRun }));
    expect(loadV4Save(fakeStorage)).toMatchObject({ schemaVersion: 1, run: { expedition: null } });

    storage.set('shin-ui-eternal-sponsor-v4-save-v1', JSON.stringify({ ...save, meta: { ...save.meta, currencies: { ...save.meta.currencies, gold: 'broken' } } }));
    expect(loadV4Save(fakeStorage)).toBeNull();

    storage.set('shin-ui-eternal-sponsor-v4-save-v1', JSON.stringify({
      ...save,
      meta: { ...save.meta, currencies: { ...save.meta.currencies, gold: Number.MAX_SAFE_INTEGER + 1 } },
    }));
    expect(loadV4Save(fakeStorage)).toBeNull();

    storage.set('shin-ui-eternal-sponsor-v4-save-v1', JSON.stringify({
      ...save,
      meta: { ...save.meta, sagaEntries: [save.meta.sagaEntries[0], save.meta.sagaEntries[0]] },
    }));
    expect(loadV4Save(fakeStorage)).toBeNull();

    storage.set('shin-ui-eternal-sponsor-v4-save-v1', JSON.stringify({
      ...save,
      run: {
        ...save.run,
        hero: {
          ...save.run.hero,
          equipmentIds: ['v4_iron_sword', 'v4_iron_sword'],
          equipmentLevels: { v4_iron_sword: 1 },
        },
      },
    }));
    expect(loadV4Save(fakeStorage)).toBeNull();
  });

  it('keeps gameplay alive when local persistence is unavailable', () => {
    const brokenStorage = {
      setItem: () => { throw new Error('quota'); },
    } as unknown as Storage;

    expect(() => persistV4Save(createInitialV4Save(15), brokenStorage)).not.toThrow();
  });

  it('does not overwrite a valid save with an invalid runtime snapshot', () => {
    const initial = createInitialV4Save(16);
    const storage = new Map<string, string>();
    const fakeStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    } as unknown as Storage;

    persistV4Save(initial, fakeStorage);
    persistV4Save({
      ...initial,
      meta: { ...initial.meta, currencies: { ...initial.meta.currencies, gold: Number.NaN } },
    }, fakeStorage);

    expect(loadV4Save(fakeStorage)?.meta.currencies.gold).toBe(initial.meta.currencies.gold);
  });

  it('rejects malformed task and expedition records before they reach the domain', () => {
    const save = createInitialV4Save(14);
    const storage = new Map<string, string>();
    const fakeStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    } as unknown as Storage;

    storage.set('shin-ui-eternal-sponsor-v4-save-v1', JSON.stringify({
      ...save,
      meta: {
        ...save.meta,
        tasks: { broken: { id: 'broken', facilityId: 'blacksmith', input: { gold: 'NaN' } } },
      },
    }));
    expect(loadV4Save(fakeStorage)).toBeNull();

    storage.set('shin-ui-eternal-sponsor-v4-save-v1', JSON.stringify({
      ...save,
      run: { ...save.run, expedition: { id: 'broken', realmId: 'unknown', status: 'traveling' } },
    }));
    expect(loadV4Save(fakeStorage)).toBeNull();

    storage.set('shin-ui-eternal-sponsor-v4-save-v1', JSON.stringify({
      ...save,
      run: { ...save.run, hero: { ...save.run.hero, level: 0 } },
    }));
    expect(loadV4Save(fakeStorage)).toBeNull();

    storage.set('shin-ui-eternal-sponsor-v4-save-v1', JSON.stringify({
      ...save,
      run: { ...save.run, hero: { ...save.run.hero, hp: save.run.hero.hpMax + 1 } },
    }));
    expect(loadV4Save(fakeStorage)).toBeNull();

    storage.set('shin-ui-eternal-sponsor-v4-save-v1', JSON.stringify({
      ...save,
      run: { ...save.run, interventionCharges: 99 },
    }));
    expect(loadV4Save(fakeStorage)).toBeNull();

    storage.set('shin-ui-eternal-sponsor-v4-save-v1', JSON.stringify({
      ...save,
      meta: {
        ...save.meta,
        agents: save.meta.agents.map((agent) => agent.id === 'guide'
          ? { ...agent, fatigue: 101 }
          : agent),
      },
    }));
    expect(loadV4Save(fakeStorage)).toBeNull();

    storage.set('shin-ui-eternal-sponsor-v4-save-v1', JSON.stringify({
      ...save,
      meta: {
        ...save.meta,
        agents: [save.meta.agents[0], save.meta.agents[0], save.meta.agents[2]],
      },
    }));
    expect(loadV4Save(fakeStorage)).toBeNull();
  });

  it('rejects saves with tampered agent definitions or a locked expedition route', () => {
    const initial = createInitialV4Save(17);
    const storage = new Map<string, string>();
    const fakeStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    } as unknown as Storage;

    storage.set('shin-ui-eternal-sponsor-v4-save-v1', JSON.stringify({
      ...initial,
      meta: {
        ...initial.meta,
        agents: initial.meta.agents.map((agent) => agent.id === 'guide'
          ? { ...agent, trait: '위조된 특성' }
          : agent),
      },
    }));
    expect(loadV4Save(fakeStorage)).toBeNull();

    storage.set('shin-ui-eternal-sponsor-v4-save-v1', JSON.stringify({
      ...initial,
      run: {
        ...initial.run,
        expedition: {
          id: 'locked-route',
          realmId: 'deep_forest',
          policy: 'aggression',
          assignedAgentId: null,
          startedAt: initial.createdAt,
          completesAt: initial.createdAt + 30_000,
          status: 'traveling',
          encounterIndex: 0,
        },
      },
    }));
    expect(loadV4Save(fakeStorage)).toBeNull();
  });

  it('rejects saves whose facility task links are inconsistent', () => {
    const initial = createInitialV4Save(16);
    const started = startFacilityTask(initial, 'blacksmith', initial.createdAt, 'blacksmith');
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const storage = new Map<string, string>();
    const fakeStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    } as unknown as Storage;
    const broken = {
      ...started.save,
      meta: {
        ...started.save.meta,
        facilities: {
          ...started.save.meta.facilities,
          blacksmith: { ...started.save.meta.facilities.blacksmith, activeTaskId: null },
        },
      },
    };
    storage.set('shin-ui-eternal-sponsor-v4-save-v1', JSON.stringify(broken));

    expect(loadV4Save(fakeStorage)).toBeNull();
  });

  it('rejects tasks whose completion time precedes their start time', () => {
    const initial = createInitialV4Save(21);
    const started = startFacilityTask(initial, 'temple', initial.createdAt, null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const storage = new Map<string, string>();
    const fakeStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    } as unknown as Storage;
    const task = started.save.meta.tasks[started.task.id];
    task.completesAt = task.startedAt - 1;
    storage.set('shin-ui-eternal-sponsor-v4-save-v1', JSON.stringify(started.save));

    expect(loadV4Save(fakeStorage)).toBeNull();
  });

  it('rejects zero-duration active tasks and expeditions before they reach the UI', () => {
    const initial = createInitialV4Save(22);
    const taskStart = startFacilityTask(initial, 'temple', initial.createdAt, null);
    const expeditionStart = startExpedition(initial, 'joseon_plains', initial.createdAt, 'aggression', null);
    expect(taskStart.ok).toBe(true);
    expect(expeditionStart.ok).toBe(true);
    if (!taskStart.ok || !expeditionStart.ok) return;

    const storage = new Map<string, string>();
    const fakeStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    } as unknown as Storage;
    taskStart.save.meta.tasks[taskStart.task.id].completesAt = taskStart.task.startedAt;
    persistV4Save(taskStart.save, fakeStorage);
    expect(loadV4Save(fakeStorage)).toBeNull();

    expeditionStart.save.run.expedition!.completesAt = expeditionStart.save.run.expedition!.startedAt;
    persistV4Save(expeditionStart.save, fakeStorage);
    expect(loadV4Save(fakeStorage)).toBeNull();
  });

  it('rejects saves whose expedition and guide links are inconsistent', () => {
    const initial = createInitialV4Save(18);
    const started = startExpedition(initial, 'joseon_plains', initial.createdAt, 'aggression', 'guide');
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const storage = new Map<string, string>();
    const fakeStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    } as unknown as Storage;
    const broken = {
      ...started.save,
      meta: {
        ...started.save.meta,
        agents: started.save.meta.agents.map((agent) => agent.id === 'guide'
          ? { ...agent, activeTaskId: null }
          : agent),
      },
    };
    storage.set('shin-ui-eternal-sponsor-v4-save-v1', JSON.stringify(broken));

    expect(loadV4Save(fakeStorage)).toBeNull();
  });

  it('rejects saves that combine hero training with an expedition or stale action state', () => {
    const initial = createInitialV4Save(16);
    const training = startFacilityTask(initial, 'training', initial.createdAt);
    const expedition = startExpedition(initial, 'joseon_plains', initial.createdAt, 'aggression', null);
    expect(training.ok).toBe(true);
    expect(expedition.ok).toBe(true);
    if (!training.ok || !expedition.ok) return;

    const storage = new Map<string, string>();
    const fakeStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    } as unknown as Storage;
    const conflicting = {
      ...training.save,
      run: { ...training.save.run, expedition: expedition.save.run.expedition },
    };
    persistV4Save(conflicting, fakeStorage);
    expect(loadV4Save(fakeStorage)).toBeNull();

    const staleAction = { ...expedition.save, run: { ...expedition.save.run, hero: { ...expedition.save.run.hero, currentAction: 'rest' as const } } };
    persistV4Save(staleAction, fakeStorage);
    expect(loadV4Save(fakeStorage)).toBeNull();
  });

  it('rejects impossible save chronology, duplicate realm unlocks, and off-specialty task links', () => {
    const initial = createInitialV4Save(23);
    const storage = new Map<string, string>();
    const fakeStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    } as unknown as Storage;
    const put = (save: typeof initial) => {
      storage.set('shin-ui-eternal-sponsor-v4-save-v1', JSON.stringify(save));
      expect(loadV4Save(fakeStorage)).toBeNull();
    };

    put({ ...initial, updatedAt: initial.createdAt - 1 });
    put({ ...initial, lastProcessedAt: initial.createdAt - 1 });
    put({ ...initial, updatedAt: initial.createdAt, lastProcessedAt: initial.createdAt + 1 });
    put({
      ...initial,
      meta: { ...initial.meta, unlockedRealms: ['joseon_plains', 'joseon_plains'] },
    });
    put({
      ...initial,
      run: { ...initial.run, hero: { ...initial.run.hero, realmId: 'deep_forest' } },
    });

    const started = startFacilityTask(initial, 'blacksmith', initial.createdAt, 'blacksmith');
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const task = started.save.meta.tasks[started.task.id];
    put({
      ...started.save,
      meta: {
        ...started.save.meta,
        facilities: {
          ...started.save.meta.facilities,
          blacksmith: { ...started.save.meta.facilities.blacksmith, activeTaskId: task.id },
        },
        tasks: {
          ...started.save.meta.tasks,
          [task.id]: { ...task, assignedAgentId: 'guide' },
        },
        agents: started.save.meta.agents.map((agent) => {
          if (agent.id === 'blacksmith') return { ...agent, activeTaskId: null };
          if (agent.id === 'guide') return { ...agent, activeTaskId: task.id };
          return agent;
        }),
      },
    });
  });

  it('maps a V3 hero snapshot without sharing the V3 store shape', () => {
    const source = {
      name: '홍길동', emoji: '⚔️', age: 37, chapter: '장년기', job: '검객', level: 12,
      exp: 4, hp: 900, hpMax: 1000, atk: 250, atkBase: 200, hpBase: 800,
      actionCount: 492, rejuvenationCount: 1, gridX: 2, gridY: 3, equipment: ['w-knife'],
      personality: { courage: 1, curiosity: 0, greed: -1, compassion: 1, discipline: 0 },
      unlockedJobId: null, unlockedMilestones: [], learnedSkillIds: [], seed: 99,
      def: 80, defBase: 70, critRateBase: 0.08,
    } as unknown as HeroSnapshot;

    const hero = migrateV3HeroSnapshot(source);
    expect(hero).toMatchObject({
      name: '홍길동', age: 37, level: 12, hp: 900, atk: 250, def: 80,
      defBase: 70, critRateBase: 0.08, realmId: 'joseon_plains',
    });
    expect(hero).not.toHaveProperty('personality');

    const sanitized = migrateV3HeroSnapshot({ ...source, name: '   ', emoji: '  ' });
    expect(sanitized.name).toBe('이름 없는 영웅');
    expect(sanitized.emoji).toBe('⚔️');

    const destination = createInitialV4Save(1);
    const imported = importV3HeroSnapshot(destination, source, 1234);
    expect(imported.run.hero.name).toBe('홍길동');
    expect(imported.meta.sagaEntries[0]?.title).toBe('V3 영웅 가져오기');
    const importedAgain = importV3HeroSnapshot(imported, source, 1234);
    expect(importedAgain.meta.sagaEntries[0]?.id).not.toBe(imported.meta.sagaEntries[0]?.id);
    imported.meta.currencies.gold = 0;
    expect(importedAgain.meta.currencies.gold).toBe(100);
    expect(imported.meta.currencies.gold).not.toBe(destination.meta.currencies.gold);
    expect(destination.meta.currencies.gold).toBe(100);
    expect(imported.meta.currencies.gold).not.toBe(importedAgain.meta.currencies.gold);

    const staleDestination = createInitialV4Save(2);
    staleDestination.lastProcessedAt = staleDestination.createdAt + HOUR;
    staleDestination.updatedAt = staleDestination.lastProcessedAt;
    const importedAfterClockRollback = importV3HeroSnapshot(staleDestination, source, staleDestination.createdAt + 1_000);
    expect(importedAfterClockRollback.updatedAt).toBe(staleDestination.lastProcessedAt);
    expect(importedAfterClockRollback.meta.sagaEntries[0]?.createdAt).toBe(staleDestination.lastProcessedAt);

    const importedWithUnsafeClock = importV3HeroSnapshot(destination, source, Number.MAX_VALUE);
    expect(importedWithUnsafeClock.updatedAt).toBe(destination.updatedAt);
    expect(importedWithUnsafeClock.meta.sagaEntries[0]?.createdAt).toBe(destination.updatedAt);
  });

  it('preserves the destination hero action while explicitly importing a V3 hero', () => {
    const destination = createInitialV4Save(118);
    const started = startFacilityTask(destination, 'training', destination.createdAt, null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const imported = importV3HeroSnapshot(started.save, {
      name: '훈련 중인 영웅', emoji: '⚔️', age: 17, chapter: '청년기', job: '검객', level: 1,
      exp: 0, hp: 1_000, hpMax: 1_000, atk: 160, atkBase: 160, hpBase: 1_000,
      actionCount: 185, rejuvenationCount: 0, gridX: 0, gridY: 0, equipment: [],
      personality: { courage: 0, curiosity: 0, greed: 0, compassion: 0, discipline: 0 },
      unlockedJobId: null, unlockedMilestones: [], learnedSkillIds: [], seed: 1,
    } as unknown as HeroSnapshot, destination.createdAt + 1_000);

    expect(imported.run.hero.currentAction).toBe('train');
  });

  it('normalizes duplicate V3 equipment records during explicit import', () => {
    const source = {
      name: '중복 장비 영웅', emoji: '⚔️', age: 37, chapter: '장년기', job: '검객', level: 12,
      exp: 4, hp: 900, hpMax: 1000, atk: 250, atkBase: 200, hpBase: 800,
      actionCount: 492, rejuvenationCount: 1, gridX: 2, gridY: 3,
      equipment: Array.from({ length: 21 }, () => 'w-knife'),
      personality: { courage: 1, curiosity: 0, greed: -1, compassion: 1, discipline: 0 },
      unlockedJobId: null, unlockedMilestones: [], learnedSkillIds: [], seed: 99,
      def: 80, defBase: 70, critRateBase: 0.08,
    } as unknown as HeroSnapshot;

    const hero = migrateV3HeroSnapshot(source);

    expect(hero.equipmentIds).toEqual(['w-knife']);
    expect(hero.equipmentLevels).toEqual({ 'w-knife': 20 });
  });

  it('falls back when optional V3 defensive stats are malformed', () => {
    const source = {
      name: '손상된 영웅', emoji: '⚔️', age: 17, chapter: '청년기', job: '검객', level: 1,
      exp: 0, hp: 1_000, hpMax: 1_000, atk: 160, atkBase: 160, hpBase: 1_000,
      actionCount: 185, rejuvenationCount: 0, gridX: 0, gridY: 0, equipment: [],
      personality: { courage: 0, curiosity: 0, greed: 0, compassion: 0, discipline: 0 },
      unlockedJobId: null, unlockedMilestones: [], learnedSkillIds: [], seed: 1,
      def: Number.NaN, defBase: 'broken', critRateBase: Number.POSITIVE_INFINITY,
    } as unknown as HeroSnapshot;

    const hero = migrateV3HeroSnapshot(source);

    expect(hero.def).toBe(100);
    expect(hero.defBase).toBe(100);
    expect(hero.critRateBase).toBe(0.05);
  });

  it('filters non-string V3 equipment entries during explicit import', () => {
    const source = {
      name: '손상된 장비 영웅', emoji: '⚔️', age: 17, chapter: '청년기', job: '검객', level: 1,
      exp: 0, hp: 1_000, hpMax: 1_000, atk: 160, atkBase: 160, hpBase: 1_000,
      actionCount: 185, rejuvenationCount: 0, gridX: 0, gridY: 0,
      equipment: ['w-knife', 42, null] as never,
      personality: { courage: 0, curiosity: 0, greed: 0, compassion: 0, discipline: 0 },
      unlockedJobId: null, unlockedMilestones: [], learnedSkillIds: [], seed: 1,
    } as unknown as HeroSnapshot;

    const hero = migrateV3HeroSnapshot(source);

    expect(hero.equipmentIds).toEqual(['w-knife']);
    expect(hero.equipmentLevels).toEqual({ 'w-knife': 1 });
  });

  it('normalizes malformed V3 core stats into a valid V4 hero snapshot', () => {
    const source = {
      name: 42, emoji: null, age: Number.MAX_VALUE, chapter: '청년기', job: '검객', level: Number.MAX_VALUE,
      exp: Number.POSITIVE_INFINITY, hp: Number.MAX_VALUE, hpMax: Number.MAX_VALUE,
      atk: Number.MAX_VALUE, atkBase: 160, hpBase: 1_000, actionCount: Number.MAX_VALUE,
      rejuvenationCount: Number.NaN, gridX: 0, gridY: 0, equipment: [],
      personality: { courage: 0, curiosity: 0, greed: 0, compassion: 0, discipline: 0 },
      unlockedJobId: null, unlockedMilestones: [], learnedSkillIds: [], seed: 1,
    } as unknown as HeroSnapshot;

    const hero = migrateV3HeroSnapshot(source);

    expect(hero).toMatchObject({
      name: '이름 없는 영웅', emoji: '⚔️', age: 17, level: 1, exp: 0,
      hp: 1_000, hpMax: 1_000, atk: 160, actionCount: HeroLifecycle.actionsForAge(17),
      rejuvenationCount: 0, currentAction: 'rest',
    });

    expect(() => migrateV3HeroSnapshot(null as never)).not.toThrow();
    expect(migrateV3HeroSnapshot(null as never)).toMatchObject({
      name: '이름 없는 영웅', emoji: '⚔️', age: 17, level: 1,
    });
  });

  it('settles completed facility work once and applies the 70% offline efficiency', () => {
    vi.setSystemTime(new Date('2026-09-06T00:00:00.000Z'));
    const initial = createInitialV4Save(7);
    const started = startFacilityTask(initial, 'blacksmith', initial.createdAt, 'blacksmith');
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const offline = simulateOfflineProgress(started.save, initial.createdAt + HOUR);
    expect(offline.summary.processedSeconds).toBe(3600);
    expect(offline.summary.efficiency).toBe(0.7);
    expect(offline.save.meta.facilities.blacksmith.activeTaskId).toBeNull();
    expect(offline.summary.completedTaskIds).toEqual([started.task.id]);
    expect(offline.summary.equipmentGained).toEqual(['v4_iron_sword']);
    expect(offline.save.run.hero.equipmentIds).toContain('v4_iron_sword');

    const replay = simulateOfflineProgress(offline.save, initial.createdAt + HOUR);
    expect(replay.summary.processedSeconds).toBe(0);
    expect(replay.summary.completedTaskIds).toEqual([]);
    expect(replay.summary.resourcesGained).toEqual({});
    expect(replay.save.meta.currencies).toEqual(offline.save.meta.currencies);
  });

  it('settles overdue work inside the capped window after a later manual save', () => {
    const initial = createInitialV4Save(118);
    const started = startFacilityTask(initial, 'temple', initial.createdAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const now = initial.createdAt + 10 * HOUR;
    started.save.updatedAt = now;
    const offline = simulateOfflineProgress(started.save, now);

    expect(offline.summary.wasClamped).toBe(true);
    expect(offline.summary.completedTaskIds).toContain(started.task.id);
    expect(offline.save.meta.tasks[started.task.id]).toBeUndefined();
  });

  it('does not settle an expedition that falls beyond the capped window', () => {
    const initial = createInitialV4Save(119);
    const started = startExpedition(initial, 'joseon_plains', initial.createdAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const now = initial.createdAt + 10 * HOUR;
    started.save.run.expedition!.completesAt = initial.createdAt + 9 * HOUR;
    started.save.updatedAt = now;
    const offline = simulateOfflineProgress(started.save, now);

    expect(offline.summary.wasClamped).toBe(true);
    expect(offline.summary.completedExpedition).toBe(false);
    expect(offline.save.run.expedition).not.toBeNull();
  });

  it('falls back to full efficiency when settlement receives a non-finite multiplier', () => {
    const initial = createInitialV4Save(28);
    const started = startFacilityTask(initial, 'training', initial.createdAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const completed = completeFacilityTasks(started.save, started.task.completesAt, Number.NaN);

    expect(completed.meta.currencies.spirit).toBe(initial.meta.currencies.spirit + 8);
    expect(completed.run.hero.exp).toBe(40);
    expect(Number.isFinite(completed.run.hero.exp)).toBe(true);
  });

  it('advances the processing watermark when work is completed online', () => {
    const initial = createInitialV4Save(17);
    const started = startFacilityTask(initial, 'temple', initial.createdAt, null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const completedAt = started.task.completesAt;

    const completed = completeFacilityTasks(started.save, completedAt);

    expect(completed.lastProcessedAt).toBe(completedAt);
  });

  it('cancels facility work with a full input refund and releases the agent', () => {
    const initial = createInitialV4Save(71);
    const started = startFacilityTask(initial, 'blacksmith', initial.createdAt, 'blacksmith');
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const canceled = cancelFacilityTask(started.save, 'blacksmith', initial.createdAt + 1_000);
    expect(canceled.ok).toBe(true);
    if (!canceled.ok) return;
    expect(canceled.save.meta.currencies).toMatchObject({
      gold: initial.meta.currencies.gold - 4,
      materials: initial.meta.currencies.materials - 1,
    });
    expect(canceled.save.meta.facilities.blacksmith.activeTaskId).toBeNull();
    expect(canceled.save.meta.tasks).toEqual({});
    expect(canceled.save.meta.agents.find((agent) => agent.id === 'blacksmith')?.activeTaskId).toBeNull();
  });

  it('gates agent specialty by trust and slows tired agents', () => {
    const initial = createInitialV4Save(75);
    const baseline = startFacilityTask(initial, 'blacksmith', initial.createdAt, 'blacksmith');
    expect(baseline.ok).toBe(true);
    if (!baseline.ok) return;

    const trusted = createInitialV4Save(76);
    trusted.meta.agents = trusted.meta.agents.map((agent) => agent.id === 'blacksmith'
      ? { ...agent, trust: 50 }
      : agent);
    const specialized = startFacilityTask(trusted, 'blacksmith', trusted.createdAt, 'blacksmith');
    expect(specialized.ok).toBe(true);
    if (!specialized.ok) return;

    const tired = createInitialV4Save(77);
    tired.meta.agents = tired.meta.agents.map((agent) => agent.id === 'blacksmith'
      ? { ...agent, trust: 50, fatigue: 80 }
      : agent);
    const slowed = startFacilityTask(tired, 'blacksmith', tired.createdAt, 'blacksmith');
    expect(slowed.ok).toBe(true);
    if (!slowed.ok) return;

    expect(specialized.task.completesAt - specialized.task.startedAt)
      .toBeLessThan(baseline.task.completesAt - baseline.task.startedAt);
    expect(slowed.task.completesAt - slowed.task.startedAt)
      .toBeGreaterThan(specialized.task.completesAt - specialized.task.startedAt);
  });

  it('does not assign new work to an exhausted agent', () => {
    const initial = createInitialV4Save(79);
    initial.meta.agents = initial.meta.agents.map((agent) => agent.id === 'blacksmith'
      ? { ...agent, fatigue: 100 }
      : agent);

    const result = startFacilityTask(initial, 'blacksmith', initial.createdAt, 'blacksmith');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('피로');
  });

  it('lets an idle agent rest to recover from fatigue', () => {
    const initial = createInitialV4Save(80);
    initial.meta.agents = initial.meta.agents.map((agent) => agent.id === 'blacksmith'
      ? { ...agent, fatigue: 100 }
      : agent);

    const result = restAgent(initial, 'blacksmith', initial.createdAt + 1_000);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.save.meta.agents.find((agent) => agent.id === 'blacksmith')?.fatigue).toBe(75);
    expect(result.save.meta.sagaEntries[0]?.title).toContain('휴식');
  });

  it('does not rest an agent while it owns an active task', () => {
    const initial = createInitialV4Save(81);
    const started = startFacilityTask(initial, 'blacksmith', initial.createdAt, 'blacksmith');
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const result = restAgent(started.save, 'blacksmith', initial.createdAt + 1_000);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('작업 중');
  });

  it('promotes an agent after trust grows through completed work', () => {
    const initial = createInitialV4Save(78);
    initial.meta.agents = initial.meta.agents.map((agent) => agent.id === 'blacksmith'
      ? { ...agent, trust: 49 }
      : agent);
    const started = startFacilityTask(initial, 'blacksmith', initial.createdAt, 'blacksmith');
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const completed = completeFacilityTasks(started.save, started.task.completesAt);
    const agent = completed.meta.agents.find((candidate) => candidate.id === 'blacksmith');
    expect(agent).toMatchObject({ trust: 50, level: 2, activeTaskId: null });
  });

  it('makes higher-level specialists work faster and records maximum trust once', () => {
    const levelTwo = createInitialV4Save(98);
    levelTwo.meta.agents = levelTwo.meta.agents.map((agent) => agent.id === 'blacksmith'
      ? { ...agent, trust: 50, level: 2 }
      : agent);
    const levelThree = createInitialV4Save(99);
    levelThree.meta.agents = levelThree.meta.agents.map((agent) => agent.id === 'blacksmith'
      ? { ...agent, trust: 100, level: 3 }
      : agent);

    const first = startFacilityTask(levelTwo, 'blacksmith', levelTwo.createdAt, 'blacksmith');
    const second = startFacilityTask(levelThree, 'blacksmith', levelThree.createdAt, 'blacksmith');
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.task.completesAt - second.task.startedAt)
      .toBeLessThan(first.task.completesAt - first.task.startedAt);

    const maxTrust = createInitialV4Save(100);
    maxTrust.meta.agents = maxTrust.meta.agents.map((agent) => agent.id === 'blacksmith'
      ? { ...agent, trust: 99 }
      : agent);
    const started = startFacilityTask(maxTrust, 'blacksmith', maxTrust.createdAt, 'blacksmith');
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const completed = completeFacilityTasks(started.save, started.task.completesAt);
    expect(completed.meta.agents.find((agent) => agent.id === 'blacksmith')?.trust).toBe(100);
    expect(completed.meta.sagaEntries.some((entry) => entry.title.includes('신뢰'))).toBe(true);
  });

  it('turns training work into hero experience, level, and combat stats', () => {
    const initial = createInitialV4Save(82);
    initial.run.hero.exp = 80;
    const started = startFacilityTask(initial, 'training', initial.createdAt, null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const completed = completeFacilityTasks(started.save, started.task.completesAt);

    expect(completed.run.hero.level).toBe(2);
    expect(completed.run.hero.exp).toBe(20);
    expect(completed.run.hero.atk).toBeGreaterThan(initial.run.hero.atk);
    expect(completed.run.hero.hpMax).toBe(initial.run.hero.hpMax + 100);
    expect(completed.run.hero.hp).toBe(initial.run.hero.hp + 100);
    expect(completed.run.hero.actionCount).toBe(initial.run.hero.actionCount + 1);
    expect(completed.run.hero.currentAction).toBe('rest');
  });

  it('ages the eternal hero from completed actions and records an age boundary', () => {
    const initial = createInitialV4Save(87);
    initial.run.hero.age = 17;
    initial.run.hero.actionCount = 185;

    const advanced = advanceHeroActions(initial, 15, initial.createdAt + 1_000);

    expect(advanced.run.hero.actionCount).toBe(200);
    expect(advanced.run.hero.age).toBe(18);
    expect(advanced.meta.sagaEntries[0]).toMatchObject({
      kind: 'milestone',
      title: '영웅의 시간',
    });
    expect(advanced.meta.sagaEntries[0]?.text).toContain('17세에서 18세');
    expect(initial.run.hero.actionCount).toBe(185);
    expect(advanceHeroActions(advanced, 0, initial.createdAt + 2_000)).toBe(advanced);
  });

  it('keeps hero training and expedition actions mutually exclusive', () => {
    const initial = createInitialV4Save(83);
    const training = startFacilityTask(initial, 'training', initial.createdAt, null);
    expect(training.ok).toBe(true);
    if (!training.ok) return;

    const expeditionWhileTraining = startExpedition(training.save, 'joseon_plains', initial.createdAt, 'aggression', null);
    expect(expeditionWhileTraining.ok).toBe(false);

    const expedition = startExpedition(initial, 'joseon_plains', initial.createdAt, 'aggression', null);
    expect(expedition.ok).toBe(true);
    if (!expedition.ok) return;
    const trainingDuringExpedition = startFacilityTask(expedition.save, 'training', initial.createdAt, null);
    expect(trainingDuringExpedition.ok).toBe(false);
  });

  it('scales facility upgrade costs and task throughput by level', () => {
    const initial = createInitialV4Save(84);
    initial.meta.currencies.gold = 500;
    initial.meta.currencies.materials = 100;

    const firstUpgrade = upgradeFacility(initial, 'temple', initial.createdAt);
    expect(firstUpgrade.ok).toBe(true);
    if (!firstUpgrade.ok) return;
    expect(firstUpgrade.task.input).toEqual({ gold: 80, materials: 4 });

    const secondUpgrade = upgradeFacility(firstUpgrade.save, 'temple', initial.createdAt + 1_000);
    expect(secondUpgrade.ok).toBe(true);
    if (!secondUpgrade.ok) return;
    expect(secondUpgrade.task.input).toEqual({ gold: 108, materials: 5 });

    const started = startFacilityTask(secondUpgrade.save, 'temple', initial.createdAt + 2_000);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(started.task.outputPreview.spirit).toBe(24);
  });

  it('previews the same facility economy and blockers before a task starts', () => {
    const initial = createInitialV4Save(85);
    const preview = getFacilityTaskPreview(initial, 'blacksmith', 'blacksmith');
    const started = startFacilityTask(initial, 'blacksmith', initial.createdAt, 'blacksmith');

    expect(preview).toMatchObject({
      facilityId: 'blacksmith',
      durationSeconds: 45,
      input: { gold: 20, materials: 3 },
      output: { materials: 2 },
      outputEquipmentIds: ['v4_iron_sword'],
      assignedAgentId: 'blacksmith',
      canStart: true,
      error: null,
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(started.task.completesAt - started.task.startedAt).toBe(preview.durationSeconds * 1000);
    expect(started.task.input).toEqual(preview.input);
    expect(started.task.outputPreview).toEqual(preview.output);

    const blocked = getFacilityTaskPreview({
      ...initial,
      meta: { ...initial.meta, currencies: { ...initial.meta.currencies, gold: 0 } },
    }, 'blacksmith', 'blacksmith');
    expect(blocked.canStart).toBe(false);
    expect(blocked.error).toContain('재화');
  });

  it('allows only a specialist agent to own its designated facility work', () => {
    const initial = createInitialV4Save(94);
    const preview = getFacilityTaskPreview(initial, 'blacksmith', 'guide');
    const result = startFacilityTask(initial, 'blacksmith', initial.createdAt, 'guide');

    expect(preview.canStart).toBe(false);
    expect(preview.error).toContain('전문');
    expect(result.ok).toBe(false);
  });

  it('makes training and expedition facility levels affect the live economy', () => {
    const base = createInitialV4Save(95);
    const upgraded = createInitialV4Save(96);
    upgraded.meta.facilities.training.level = 3;
    upgraded.meta.facilities.expedition.level = 3;

    const baseTraining = getFacilityTaskPreview(base, 'training', null);
    const upgradedTraining = getFacilityTaskPreview(upgraded, 'training', null);
    expect(upgradedTraining.heroExpGain).toBeGreaterThan(baseTraining.heroExpGain);

    const baseExpedition = startExpedition(base, 'joseon_plains', base.createdAt, 'aggression', null);
    const upgradedExpedition = startExpedition(upgraded, 'joseon_plains', upgraded.createdAt, 'aggression', null);
    expect(baseExpedition.ok).toBe(true);
    expect(upgradedExpedition.ok).toBe(true);
    if (!baseExpedition.ok || !upgradedExpedition.ok) return;
    expect(upgradedExpedition.task.completesAt - upgradedExpedition.task.startedAt)
      .toBeLessThan(baseExpedition.task.completesAt - baseExpedition.task.startedAt);
  });

  it('keeps facility economy previews finite for malformed extreme levels', () => {
    const malformed = createInitialV4Save(117);
    malformed.meta.facilities.blacksmith.level = Number.MAX_VALUE;
    malformed.meta.facilities.temple.level = Number.MAX_VALUE;

    const preview = getFacilityTaskPreview(malformed, 'blacksmith', null);
    const cost = getFacilityUpgradeCost(malformed, 'temple');

    expect(cost).not.toBeNull();
    expect([
      preview.durationSeconds,
      preview.heroExpGain,
      ...Object.values(preview.output),
      ...(cost ? [cost.gold, cost.materials] : []),
    ].every((value) => Number.isFinite(value))).toBe(true);
  });

  it('exposes the scaled facility upgrade cost without mutating the save', () => {
    const initial = createInitialV4Save(86);
    initial.meta.facilities.temple.level = 3;

    expect(getFacilityUpgradeCost(initial, 'temple')).toEqual({ gold: 145, materials: 7 });
    expect(initial.meta.currencies).toEqual({ spirit: 100, gold: 100, materials: 12, rift: 0 });
  });

  it('applies monetization effects through pure V4 domain helpers', () => {
    const initial = createInitialV4Save(72);
    const started = startFacilityTask(initial, 'temple', initial.createdAt, null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const instant = completeFacilityTaskNow(started.save, 'temple', initial.createdAt + 1_000);
    expect(instant.ok).toBe(true);
    if (!instant.ok) return;
    expect(instant.save.meta.currencies.spirit).toBe(118);
    expect(instant.save.meta.tasks).toEqual({});

    const doubled = grantOfflineResourceBonus(instant.save, { spirit: 18, gold: 4 }, initial.createdAt + 2_000);
    expect(doubled.meta.currencies).toMatchObject({ spirit: 136, gold: 104 });
    const charged = grantInterventionCharge(doubled, initial.createdAt + 3_000);
    expect(charged.run.interventionCharges).toBe(2);
    expect(grantInterventionCharge({ ...charged, run: { ...charged.run, interventionCharges: 3 } }, initial.createdAt + 4_000).run.interventionCharges).toBe(3);
  });

  it('spends an intervention charge on a full heal and records the choice', () => {
    const initial = createInitialV4Save(73);
    initial.run.hero.hp = 120;
    const result = useIntervention(initial, 'heal', initial.createdAt + 1_000);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.save.run.interventionCharges).toBe(0);
    expect(result.save.run.hero.hp).toBe(result.save.run.hero.hpMax);
    expect(result.save.meta.sagaEntries[0]?.title).toBe('신의 개입: 즉시 회복');
  });

  it('uses an intervention to retreat safely and releases the guide', () => {
    const initial = createInitialV4Save(74);
    const started = startExpedition(initial, 'joseon_plains', initial.createdAt, 'aggression', 'guide');
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const result = useIntervention(started.save, 'retreat', initial.createdAt + 1_000);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.save.run.interventionCharges).toBe(0);
    expect(result.save.run.expedition).toBeNull();
    expect(result.save.run.hero.currentAction).toBe('rest');
    expect(result.save.meta.agents.find((agent) => agent.id === 'guide')?.activeTaskId).toBeNull();
    expect(result.save.meta.currencies.spirit).toBe(94);
    expect(result.save.meta.sagaEntries[0]?.title).toBe('신의 개입: 원정 후퇴');
  });

  it('does not spend an intervention charge on a stale action clock', () => {
    const initial = createInitialV4Save(119);
    initial.run.hero.hp = 120;

    const result = useIntervention(initial, 'heal', initial.updatedAt - 1);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.save).toBe(initial);
    expect(initial.run.interventionCharges).toBe(1);
    expect(initial.run.hero.hp).toBe(120);
  });

  it('clamps offline processing to 8 hours and rejects backwards time', () => {
    const initial = createInitialV4Save(8);
    const future = simulateOfflineProgress(initial, initial.lastProcessedAt + 24 * HOUR);
    expect(future.summary.processedSeconds).toBe(8 * 3600);
    expect(future.summary.wasClamped).toBe(true);

    const backwards = simulateOfflineProgress(future.save, initial.lastProcessedAt - 1);
    expect(backwards.summary.processedSeconds).toBe(0);
    expect(backwards.summary.clockAnomaly).toBe('backwards');
  });

  it('rejects a save whose last write is in the future', () => {
    const initial = createInitialV4Save(22);
    const futureSave = { ...initial, updatedAt: initial.lastProcessedAt + HOUR };

    const result = simulateOfflineProgress(futureSave, initial.lastProcessedAt + 1_000);

    expect(result.summary.processedSeconds).toBe(0);
    expect(result.summary.clockAnomaly).toBe('future');
    expect(result.save).toBe(futureSave);
  });

  it('rejects a non-finite offline clock without corrupting the save', () => {
    const initial = createInitialV4Save(25);

    const result = simulateOfflineProgress(initial, Number.NaN);

    expect(result.summary.processedSeconds).toBe(0);
    expect(result.summary.clockAnomaly).toBe('invalid');
    expect(result.save).toBe(initial);
  });

  it('rejects an unsafe offline clock before it can create an invalid save', () => {
    const initial = createInitialV4Save(27);

    const result = simulateOfflineProgress(initial, Number.MAX_SAFE_INTEGER + 1);

    expect(result.summary.processedSeconds).toBe(0);
    expect(result.summary.clockAnomaly).toBe('invalid');
    expect(result.save).toBe(initial);
  });

  it('normalizes non-finite explicit action timestamps before persisting', () => {
    const initial = createInitialV4Save(26);
    initial.meta.agents = initial.meta.agents.map((agent) => agent.id === 'blacksmith'
      ? { ...agent, fatigue: 25 }
      : agent);

    const rested = restAgent(initial, 'blacksmith', Number.NaN);
    const started = startFacilityTask(initial, 'temple', Number.POSITIVE_INFINITY);
    const unsafeClockSave = createInitialV4Save(28);
    const startedWithUnsafeClock = startFacilityTask(unsafeClockSave, 'temple', Number.MAX_VALUE);

    expect(rested.ok).toBe(true);
    expect(started.ok).toBe(true);
    expect(startedWithUnsafeClock.ok).toBe(true);
    if (!rested.ok || !started.ok || !startedWithUnsafeClock.ok) return;
    expect(rested.save.meta.sagaEntries[0]?.createdAt).toBe(initial.updatedAt);
    expect(started.task.startedAt).toBe(initial.updatedAt);
    expect(started.task.completesAt).toBeGreaterThan(started.task.startedAt);
    expect(startedWithUnsafeClock.task.startedAt).toBe(unsafeClockSave.updatedAt);
  });

  it('does not settle due work before a future persisted write time', () => {
    const initial = createInitialV4Save(27);
    const started = startFacilityTask(initial, 'temple', initial.createdAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.meta.tasks[started.task.id].completesAt = initial.createdAt;
    started.save.updatedAt = initial.createdAt + HOUR;

    const result = completeFacilityTasks(started.save, initial.createdAt + 1_000);

    expect(result).toBe(started.save);
    expect(result.meta.tasks[started.task.id]).toBeDefined();
  });

  it('does not settle work when the completion clock is non-finite', () => {
    const initial = createInitialV4Save(29);
    const started = startFacilityTask(initial, 'temple', initial.createdAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.meta.tasks[started.task.id].completesAt = initial.createdAt;

    const result = completeFacilityTasks(started.save, Number.POSITIVE_INFINITY);

    expect(result).toBe(started.save);
    expect(result.meta.tasks[started.task.id]).toBeDefined();
  });

  it('caps malformed training experience before settlement', () => {
    const initial = createInitialV4Save(116);
    const started = startFacilityTask(initial, 'training', initial.createdAt, null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.meta.tasks[started.task.id].heroExpGain = 100_001;

    const result = completeFacilityTasks(started.save, started.task.completesAt);

    expect(result.run.hero.level).toBe(45);
    expect(result.run.hero.exp).toBe(1_000);
    expect(Number.isFinite(result.run.hero.exp)).toBe(true);
  });

  it('saturates hero stats when a level-up reaches the persistable ceiling', () => {
    const initial = createInitialV4Save(117);
    const started = startFacilityTask(initial, 'training', initial.createdAt, null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const hero = started.save.run.hero;
    hero.exp = 99;
    hero.atk = Number.MAX_SAFE_INTEGER;
    hero.def = Number.MAX_SAFE_INTEGER;
    hero.defBase = Number.MAX_SAFE_INTEGER;
    hero.hp = Number.MAX_SAFE_INTEGER;
    hero.hpMax = Number.MAX_SAFE_INTEGER;
    started.save.meta.tasks[started.task.id].heroExpGain = 100;

    const result = completeFacilityTasks(started.save, started.task.completesAt);

    expect(result.run.hero.atk).toBe(Number.MAX_SAFE_INTEGER);
    expect(result.run.hero.def).toBe(Number.MAX_SAFE_INTEGER);
    expect(result.run.hero.defBase).toBe(Number.MAX_SAFE_INTEGER);
    expect(result.run.hero.hp).toBe(Number.MAX_SAFE_INTEGER);
    expect(result.run.hero.hpMax).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('rejects instant completion before a future persisted write time', () => {
    const initial = createInitialV4Save(30);
    const started = startFacilityTask(initial, 'temple', initial.createdAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.updatedAt = initial.createdAt + HOUR;

    const result = completeFacilityTaskNow(started.save, 'temple', initial.createdAt + 1_000);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('미래');
  });

  it('keeps the save chronology valid when an explicit action sees a backwards clock', () => {
    const initial = createInitialV4Save(24);
    initial.lastProcessedAt = initial.createdAt + HOUR;
    initial.updatedAt = initial.lastProcessedAt;

    const changed = setV4Policy(initial, 'training', initial.createdAt + 1_000);
    expect(changed.updatedAt).toBe(initial.lastProcessedAt);

    const storage = new Map<string, string>();
    const fakeStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    } as unknown as Storage;
    persistV4Save(changed, fakeStorage);
    expect(loadV4Save(fakeStorage)).not.toBeNull();
  });

  it('normalizes backwards task and expedition action clocks to the last saved time', () => {
    const staleTaskSave = createInitialV4Save(31);
    staleTaskSave.lastProcessedAt += HOUR;
    staleTaskSave.updatedAt = staleTaskSave.lastProcessedAt;
    const task = startFacilityTask(staleTaskSave, 'temple', staleTaskSave.createdAt);
    expect(task.ok).toBe(true);
    if (!task.ok) return;
    expect(task.task.startedAt).toBe(staleTaskSave.updatedAt);
    expect(task.task.id).toContain(`${staleTaskSave.updatedAt}`);

    const staleExpeditionSave = createInitialV4Save(32);
    staleExpeditionSave.lastProcessedAt += HOUR;
    staleExpeditionSave.updatedAt = staleExpeditionSave.lastProcessedAt;
    const expedition = startExpedition(staleExpeditionSave, 'joseon_plains', staleExpeditionSave.createdAt, 'aggression', null);
    expect(expedition.ok).toBe(true);
    if (!expedition.ok) return;
    expect(expedition.save.run.expedition?.startedAt).toBe(staleExpeditionSave.updatedAt);
  });

  it('does not auto-confirm a risky Realm boss during offline processing', () => {
    const initial = createInitialV4Save(19);
    initial.meta.unlockedRealms.push('deep_forest');
    const started = startExpedition(initial, 'deep_forest', initial.lastProcessedAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const afterNormal = completeFacilityTasks(started.save, started.save.run.expedition!.completesAt);
    const afterElite = completeFacilityTasks(afterNormal, afterNormal.run.expedition!.completesAt);
    const offline = simulateOfflineProgress(afterElite, afterElite.run.expedition!.completesAt);

    expect(offline.summary.completedExpedition).toBe(false);
    expect(offline.save.run.expedition?.realmId).toBe('deep_forest');
    expect(offline.save.run.expedition?.encounterIndex).toBe(2);
    expect(offline.save.run.expedition?.status).toBe('awaiting_confirmation');

    const refreshed = completeFacilityTasks(offline.save, offline.save.lastProcessedAt + 1_000);
    expect(refreshed.run.expedition?.status).toBe('awaiting_confirmation');

    const confirmed = confirmPendingExpedition(refreshed, refreshed.lastProcessedAt + 1_000);
    expect(confirmed.run.expedition).toBeNull();
    expect(confirmed.run.lastExpeditionResult?.realmId).toBe('deep_forest');
    expect(confirmPendingExpedition(confirmed, confirmed.updatedAt + 1_000)).toBe(confirmed);
  });

  it('keeps a risky expedition pending for invalid or premature confirmation clocks', () => {
    const initial = createInitialV4Save(20);
    initial.meta.unlockedRealms.push('deep_forest');
    const started = startExpedition(initial, 'deep_forest', initial.lastProcessedAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const afterNormal = completeFacilityTasks(started.save, started.save.run.expedition!.completesAt);
    const afterElite = completeFacilityTasks(afterNormal, afterNormal.run.expedition!.completesAt);
    const pending = completeFacilityTasks(afterElite, afterElite.run.expedition!.completesAt, 1, false);
    expect(pending.run.expedition?.status).toBe('awaiting_confirmation');

    expect(confirmPendingExpedition(pending, Number.NaN)).toBe(pending);
    expect(confirmPendingExpedition(pending, pending.updatedAt - 1)).toBe(pending);
    expect(pending.run.expedition?.status).toBe('awaiting_confirmation');
  });

  it('requires explicit confirmation before an offline victory unlocks the next Realm', () => {
    const initial = createInitialV4Save(93);
    const started = startExpedition(initial, 'joseon_plains', initial.createdAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.run.expedition!.id = 'e2e-victory-4';
    started.save.run.expedition!.encounterIndex = 2;
    started.save.run.expedition!.completesAt = started.save.run.expedition!.startedAt;

    const offline = completeFacilityTasks(started.save, started.save.run.expedition!.completesAt, 0.7, false);
    expect(offline.run.lastExpeditionResult?.outcome).toBe('victory');
    expect(offline.meta.unlockedRealms).toEqual(['joseon_plains']);

    const confirmed = confirmNextRealmUnlock(offline, offline.updatedAt + 1_000);
    expect(confirmed.meta.unlockedRealms).toEqual(['joseon_plains', 'deep_forest']);
    expect(confirmed.meta.sagaEntries[0]?.title).toContain('깊은 숲');
    expect(confirmNextRealmUnlock(confirmed, confirmed.updatedAt + 1_000)).toBe(confirmed);
  });

  it('does not unlock a Realm when the confirmation clock is invalid or stale', () => {
    const initial = createInitialV4Save(95);
    const started = startExpedition(initial, 'joseon_plains', initial.createdAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.run.expedition!.id = 'e2e-victory-clock-guard';
    started.save.run.expedition!.encounterIndex = 2;
    started.save.run.expedition!.completesAt = started.save.run.expedition!.startedAt;

    const victory = completeFacilityTasks(started.save, started.save.run.expedition!.completesAt, 0.7, false);
    expect(victory.run.lastExpeditionResult?.outcome).toBe('victory');

    expect(confirmNextRealmUnlock(victory, Number.NaN)).toBe(victory);
    expect(confirmNextRealmUnlock(victory, victory.updatedAt - 1)).toBe(victory);
    expect(victory.meta.unlockedRealms).toEqual(['joseon_plains']);
  });

  it('allows one expedition and resolves it into rewards', () => {
    const initial = createInitialV4Save(9);
    const started = startExpedition(initial, 'joseon_plains', initial.createdAt, 'aggression', 'guide');
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(started.save.run.expedition?.realmId).toBe('joseon_plains');

    const second = startExpedition(started.save, 'joseon_plains', initial.createdAt, 'aggression', 'guide');
    expect(second.ok).toBe(false);

    const invalidAgent = startExpedition(initial, 'joseon_plains', initial.createdAt, 'aggression', 'blacksmith');
    expect(invalidAgent.ok).toBe(false);

    let completed = started.save;
    while (completed.run.expedition) {
      completed = completeFacilityTasks(completed, completed.run.expedition.completesAt);
    }
    expect(completed.run.expedition).toBeNull();
    expect(completed.meta.sagaEntries[0]?.kind).toBe('expedition');
    expect(completed.meta.sagaEntries[0]).toMatchObject({
      title: '조선 평야 원정 성공',
      text: expect.stringContaining('마을로 돌아왔다'),
    });
    expect(completed.run.lastExpeditionResult).toMatchObject({
      realmId: 'joseon_plains', outcome: 'victory', retryAfterSeconds: 0,
    });
  });

  it('does not assign a fully fatigued guide to a new expedition', () => {
    const initial = createInitialV4Save(103);
    initial.meta.agents = initial.meta.agents.map((agent) => agent.id === 'guide'
      ? { ...agent, fatigue: 100 }
      : agent);

    const result = startExpedition(initial, 'joseon_plains', initial.createdAt, 'aggression', 'guide');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('피로');
  });

  it('does not reuse task ids after a same-clock completion and restart', () => {
    const initial = createInitialV4Save(101);
    const first = startFacilityTask(initial, 'temple', initial.createdAt, null);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const completed = completeFacilityTasks(first.save, first.task.completesAt);
    const second = startFacilityTask(completed, 'temple', initial.createdAt, null);

    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.task.id).not.toBe(first.task.id);
  });

  it('does not reuse an expedition id after same-clock intervention retreat', () => {
    const initial = createInitialV4Save(102);
    const first = startExpedition(initial, 'joseon_plains', initial.createdAt, 'aggression', null);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const retreated = useIntervention(first.save, 'retreat', initial.createdAt);
    expect(retreated.ok).toBe(true);
    if (!retreated.ok) return;
    const second = startExpedition(retreated.save, 'joseon_plains', initial.createdAt, 'aggression', null);

    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.task.id).not.toBe(first.task.id);
  });

  it('advances a new expedition through normal, elite, and boss encounters', () => {
    const initial = createInitialV4Save(90);
    const started = startExpedition(initial, 'joseon_plains', initial.createdAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(started.save.run.expedition).toMatchObject({ encounterIndex: 0 });

    const normal = completeFacilityTasks(started.save, started.save.run.expedition!.completesAt);
    expect(normal.run.expedition).toMatchObject({ encounterIndex: 1 });
    expect(normal.run.lastExpeditionResult).toBeNull();

    const elite = completeFacilityTasks(normal, normal.run.expedition!.completesAt);
    expect(elite.run.expedition).toMatchObject({ encounterIndex: 2 });
    expect(elite.run.lastExpeditionResult).toBeNull();

    const boss = completeFacilityTasks(elite, elite.run.expedition!.completesAt);
    expect(boss.run.expedition).toBeNull();
    expect(boss.run.lastExpeditionResult).toMatchObject({
      outcome: 'victory', encountersCleared: 3, totalEncounterCount: 3,
    });
  });

  it('forecasts target success bands and makes support policy effects visible', () => {
    const atRecommendedPower = createInitialV4Save(92);
    atRecommendedPower.run.hero.atk = 30;
    const normal = getExpeditionSuccessChance(atRecommendedPower, 'joseon_plains', 0, null);
    const elite = getExpeditionSuccessChance(atRecommendedPower, 'joseon_plains', 1, null);
    const boss = getExpeditionSuccessChance(atRecommendedPower, 'joseon_plains', 2, null);

    expect(getV4HeroPower(atRecommendedPower)).toBe(120);
    expect(normal).toBeGreaterThanOrEqual(0.9);
    expect(normal).toBeLessThanOrEqual(0.97);
    expect(elite).toBeGreaterThanOrEqual(0.65);
    expect(elite).toBeLessThanOrEqual(0.8);
    expect(boss).toBeGreaterThanOrEqual(0.45);
    expect(boss).toBeLessThanOrEqual(0.65);

    const guide = getExpeditionSuccessChance(atRecommendedPower, 'joseon_plains', 2, 'guide');
    const hoarding = getExpeditionSuccessChance(setV4Policy(atRecommendedPower, 'hoarding', atRecommendedPower.createdAt + 1), 'joseon_plains', 2, null);
    const blessedSave = createInitialV4Save(97);
    blessedSave.run.hero.atk = 30;
    blessedSave.meta.facilities.mudang.level = 3;
    const blessed = getExpeditionSuccessChance(blessedSave, 'joseon_plains', 2, null);
    expect(guide).toBeGreaterThan(boss);
    expect(hoarding).toBeGreaterThan(boss);
    expect(blessed).toBeGreaterThan(boss);
  });

  it('uses the V4 hero battle adapter instead of power alone', () => {
    const initial = createInitialV4Save(11);
    initial.run.hero.atk = 300;
    initial.run.hero.hp = 1;
    const started = startExpedition(initial, 'joseon_plains', initial.createdAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.run.expedition!.encounterIndex = 2;
    started.save.run.expedition!.completesAt = started.save.run.expedition!.startedAt;

    const completed = completeFacilityTasks(started.save, started.save.run.expedition!.completesAt);
    expect(completed.meta.sagaEntries[0]?.title).toBe('조선 평야 원정 중단');
    expect(completed.meta.currencies.gold).toBe(initial.meta.currencies.gold);
    expect(completed.meta.currencies.spirit).toBe(initial.meta.currencies.spirit);
    expect(completed.run.lastExpeditionResult).toMatchObject({
      outcome: 'defeat', recommendedFacilityId: 'recovery', recommendedEquipmentId: 'v4_iron_sword',
    });
  });

  it('does not dispatch a defeated hero before recovery', () => {
    const initial = createInitialV4Save(20);
    initial.run.hero.hp = 0;

    const result = startExpedition(initial, 'joseon_plains', initial.createdAt, 'aggression', null);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('회복');
  });

  it('rejuvenates the eternal hero through V4 storage with a gold cost and saga entry', () => {
    const initial = createInitialV4Save(12);
    const result = rejuvenateHero(initial, 5, initial.createdAt + 1_000);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.save.run.hero.age).toBe(12);
    expect(result.save.run.hero.rejuvenationCount).toBe(1);
    expect(result.save.meta.currencies.gold).toBe(50);
    expect(result.save.meta.sagaEntries[0]?.kind).toBe('rejuvenation');
  });

  it('keeps V4 hero decisions and battle independent from the V3 cycle controller', () => {
    const save = createInitialV4Save(10);
    const runtime = createV4HeroRuntime(save.run.hero);
    expect(runtime.chooseAction({ hp: 1_000, hpMax: 1_000, policy: 'aggression', expeditionAvailable: true })).toBe('expedition');
    expect(runtime.resolveBattle({ heroAtk: 100, heroDef: 20, heroHp: 100, enemyHp: 250, enemyAtk: 25 }).won).toBe(true);
    expect(runtime.rejuvenate(3).yearsReduced).toBe(3);
  });

  it('keeps the hero runtime snapshot valid for an unknown rejuvenation input', () => {
    const save = createInitialV4Save(111);
    const runtime = createV4HeroRuntime(save.run.hero);

    const result = runtime.rejuvenate('unknown' as never);

    expect(result.yearsReduced).toBe(0);
    expect(result.cost).toBe(0);
    expect(result.snapshot).toEqual(save.run.hero);
  });

  it('normalizes malformed hero state before applying rejuvenation', () => {
    const save = createInitialV4Save(120);
    const runtime = createV4HeroRuntime({
      ...save.run.hero,
      age: Number.NaN,
      hp: Number.NaN,
      hpMax: Number.POSITIVE_INFINITY,
      rejuvenationCount: Number.NaN,
    });

    const result = runtime.rejuvenate(5);

    expect(result.snapshot.age).toBe(12);
    expect(result.snapshot.actionCount).toBe(HeroLifecycle.actionsForAge(12));
    expect(result.snapshot.rejuvenationCount).toBe(1);
    expect(result.snapshot.hp).toBe(1_000);
    expect([result.yearsReduced, result.cost, result.snapshot.hp].every((value) => Number.isFinite(value))).toBe(true);
  });

  it('keeps runtime snapshot cloning safe for malformed equipment collections', () => {
    const save = createInitialV4Save(121);
    const runtime = createV4HeroRuntime({
      ...save.run.hero,
      equipmentIds: undefined as never,
      equipmentLevels: 'broken' as never,
    });

    expect(runtime.getSnapshot().equipmentIds).toEqual([]);
    expect(runtime.getSnapshot().equipmentLevels).toBeUndefined();
  });

  it('keeps battle results finite for malformed runtime input', () => {
    const save = createInitialV4Save(113);
    const result = createV4HeroRuntime(save.run.hero).resolveBattle({
      heroAtk: Number.NaN,
      heroDef: Number.POSITIVE_INFINITY,
      heroHp: Number.NaN,
      enemyHp: Number.NaN,
      enemyAtk: Number.NEGATIVE_INFINITY,
      maxTurns: 'many' as never,
    });

    expect(result.won).toBe(false);
    expect([
      result.turns,
      result.totalDamageDealt,
      result.totalDamageTaken,
      result.heroRemainingHp,
    ].every((value) => Number.isFinite(value))).toBe(true);
  });

  it('bounds finite-but-overflowing battle inputs and turn budgets', () => {
    const save = createInitialV4Save(115);
    const runtime = createV4HeroRuntime(save.run.hero);
    const overflowing = runtime.resolveBattle({
      heroAtk: Number.MAX_VALUE,
      heroDef: Number.MAX_VALUE,
      heroHp: Number.MAX_VALUE,
      enemyHp: Number.MAX_VALUE,
      enemyAtk: Number.MAX_VALUE,
      maxTurns: Number.MAX_VALUE,
    });
    const bounded = runtime.resolveBattle({
      heroAtk: 1, heroDef: 0, heroHp: 10_000, enemyHp: 10_000, enemyAtk: 1, maxTurns: 101,
    });

    expect([
      overflowing.turns,
      overflowing.totalDamageDealt,
      overflowing.totalDamageTaken,
      overflowing.heroRemainingHp,
    ].every((value) => Number.isFinite(value))).toBe(true);
    expect(overflowing.turns).toBeLessThanOrEqual(100);
    expect(bounded.turns).toBe(100);
  });

  it('keeps hero power and expedition forecast finite for malformed hero stats', () => {
    const save = createInitialV4Save(114);
    save.run.hero.atk = Number.NaN;
    save.run.hero.hp = Number.NaN;

    expect(getV4HeroPower(save)).toBe(0);
    expect(Number.isFinite(getExpeditionSuccessChance(save, 'joseon_plains', 2, null))).toBe(true);
  });

  it('saturates hero power before it can invalidate a result save', () => {
    const save = createInitialV4Save(124);
    save.run.hero.atk = Number.MAX_SAFE_INTEGER;
    save.run.hero.def = Number.MAX_SAFE_INTEGER;
    save.run.hero.hpMax = Number.MAX_SAFE_INTEGER;

    expect(getV4HeroPower(save)).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('carries V3 hit variance, crits, and defense mitigation into V4 battles', () => {
    const critical = createInitialV4Save(11);
    critical.run.hero.critRateBase = 1;
    const criticalResult = createV4HeroRuntime(critical.run.hero).resolveBattle({
      heroAtk: 100, heroDef: 20, heroHp: 500, enemyHp: 100, enemyAtk: 25,
    });
    expect(criticalResult.totalDamageDealt).toBeGreaterThan(100);

    const attrition = createV4HeroRuntime(critical.run.hero).resolveBattle({
      heroAtk: 1, heroDef: 20, heroHp: 500, enemyHp: 1_000, enemyAtk: 25, maxTurns: 2,
    });
    expect(attrition.totalDamageTaken).toBeGreaterThan(10);
  });

  it('turns the sponsor policy and hero condition into a visible next-action decision', () => {
    const initial = createInitialV4Save(89);
    expect(getHeroNextAction(initial)).toBe('expedition');
    expect(getHeroNextAction(setV4Policy(initial, 'training', initial.createdAt + 1_000))).toBe('train');

    const wounded = {
      ...initial,
      run: { ...initial.run, hero: { ...initial.run.hero, hp: 300 } },
    };
    expect(getHeroNextAction(wounded)).toBe('rest');
  });

  it('updates only the V4 audio settings through an isolated save copy', () => {
    const initial = createInitialV4Save(91);
    const updated = updateV4Settings(initial, { music: 0, sfx: 0.35, muted: true }, initial.createdAt + 1_000);

    expect(updated.meta.settings).toEqual({ music: 0, sfx: 0.35, muted: true });
    expect(updated.meta.currencies).toEqual(initial.meta.currencies);
    expect(updated.run.hero).toEqual(initial.run.hero);
    expect(initial.meta.settings).toEqual({ music: 0.7, sfx: 0.8, muted: false });
  });

  it('keeps runtime policy and audio settings valid when callers pass unknown values', () => {
    const initial = createInitialV4Save(106);
    const policy = setV4Policy(initial, 'unsafe' as never, initial.updatedAt + 1_000);
    const settings = updateV4Settings(initial, {
      music: 'broken' as never,
      sfx: Number.NaN,
      muted: 'yes' as never,
    }, initial.updatedAt + 1_000);

    expect(policy).toBe(initial);
    expect(settings.meta.settings).toEqual(initial.meta.settings);
  });

  it('rejects an unknown expedition policy before charging or dispatching', () => {
    const initial = createInitialV4Save(107);
    const result = startExpedition(initial, 'joseon_plains', initial.updatedAt + 1_000, 'unsafe' as never, null);

    expect(result.ok).toBe(false);
    expect(result.save).toBe(initial);
    expect(initial.run.expedition).toBeNull();
    expect(initial.meta.currencies).toEqual({ spirit: 100, gold: 100, materials: 12, rift: 0 });
  });

  it('rejects inherited definition keys at public domain boundaries', () => {
    const initial = createInitialV4Save(113);
    const invalidFacility = 'constructor' as FacilityId;
    const invalidRealm = 'constructor' as RealmId;

    expect(getFacilityTaskPreview(initial, invalidFacility)).toMatchObject({
      canStart: false,
      error: '아직 사용할 수 없는 시설입니다.',
    });
    expect(startFacilityTask(initial, invalidFacility, initial.createdAt, null)).toMatchObject({ ok: false });
    expect(getFacilityUpgradeCost(initial, invalidFacility)).toBeNull();
    expect(() => getExpeditionSuccessChance(initial, invalidRealm)).not.toThrow();
    expect(getExpeditionSuccessChance(initial, invalidRealm)).toBe(0.05);
  });

  it('rejects an unknown Realm before checking unlocks or charging', () => {
    const initial = createInitialV4Save(112);
    const result = startExpedition(initial, 'unknown_realm' as never, initial.updatedAt + 1_000, 'aggression', null);

    expect(result.ok).toBe(false);
    expect(result.save).toBe(initial);
    if (result.ok) return;
    expect(result.error).toContain('알 수 없는 Realm');
    expect(initial.run.expedition).toBeNull();
  });

  it('rejects an unknown intervention before consuming a charge or retreating', () => {
    const initial = createInitialV4Save(108);
    const started = startExpedition(initial, 'joseon_plains', initial.updatedAt + 1_000, 'aggression', null);
    if (!started.ok) throw new Error(started.error);

    const result = useIntervention(started.save, 'teleport' as never, started.save.updatedAt + 1_000);

    expect(result.ok).toBe(false);
    expect(result.save).toBe(started.save);
    expect(started.save.run.expedition).not.toBeNull();
    expect(started.save.run.interventionCharges).toBe(initial.run.interventionCharges);
  });

  it('ignores non-finite, negative, and unknown offline bonus values', () => {
    const initial = createInitialV4Save(94);
    const updated = grantOfflineResourceBonus(initial, {
      spirit: Number.NaN,
      gold: Number.POSITIVE_INFINITY,
      materials: 3,
      rift: -10,
      unknown: 999,
    } as never, initial.createdAt + 1_000);

    expect(updated.meta.currencies).toEqual({ spirit: 100, gold: 100, materials: 15, rift: 0 });
  });

  it('does not advance the save clock when an offline bonus has no valid gains', () => {
    const initial = createInitialV4Save(121);
    const unchanged = grantOfflineResourceBonus(initial, {
      spirit: Number.NaN,
      gold: -1,
      materials: 0,
      unknown: 10,
    } as never, initial.updatedAt + 1_000);

    expect(unchanged).toBe(initial);
    expect(grantOfflineResourceBonus(initial, null as never, initial.updatedAt + 1_000)).toBe(initial);
  });

  it('does not let an oversized task reward overflow a currency', () => {
    const initial = createInitialV4Save(109);
    const started = startFacilityTask(initial, 'temple', initial.updatedAt);
    if (!started.ok) throw new Error(started.error);

    started.save.meta.currencies.gold = 1e308;
    started.save.meta.tasks[started.task.id].outputPreview = { gold: 1e308 };
    const completed = completeFacilityTasks(started.save, started.task.completesAt + 1_000);

    expect(Number.isFinite(completed.meta.currencies.gold)).toBe(true);
    expect(completed.meta.currencies.gold).toBe(1e308);
  });

  it('saturates a currency bonus at the persistable ceiling', () => {
    const nearLimit = createInitialV4Save(122);
    nearLimit.meta.currencies.gold = Number.MAX_SAFE_INTEGER - 1;

    const updated = grantOfflineResourceBonus(nearLimit, { gold: 10 }, nearLimit.updatedAt + 1_000);

    expect(updated.meta.currencies.gold).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('saturates hero action history at the persistable ceiling', () => {
    const nearLimit = createInitialV4Save(123);
    nearLimit.run.hero.actionCount = Number.MAX_SAFE_INTEGER;
    nearLimit.run.hero.age = HeroLifecycle.ageFromActions(Number.MAX_SAFE_INTEGER);

    const advanced = advanceHeroActions(nearLimit, 1, nearLimit.updatedAt + 1_000);

    expect(advanced.run.hero.actionCount).toBe(Number.MAX_SAFE_INTEGER);
    expect(Number.isSafeInteger(advanced.run.hero.actionCount)).toBe(true);
  });

  it('does not upgrade a facility beyond the persistable level ceiling', () => {
    const capped = createInitialV4Save(120);
    capped.meta.facilities.temple.level = Number.MAX_SAFE_INTEGER;
    capped.meta.currencies.gold = Number.MAX_SAFE_INTEGER;
    capped.meta.currencies.materials = Number.MAX_SAFE_INTEGER;

    const result = upgradeFacility(capped, 'temple', capped.updatedAt + 1_000);

    expect(result.ok).toBe(false);
    expect(result.save).toBe(capped);
    expect(capped.meta.facilities.temple.level).toBe(Number.MAX_SAFE_INTEGER);
    expect(capped.meta.currencies).toMatchObject({ gold: Number.MAX_SAFE_INTEGER, materials: Number.MAX_SAFE_INTEGER });
  });

  it('does not grant rewarded currency or intervention charges on an invalid action clock', () => {
    const initial = createInitialV4Save(96);
    const invalidBonus = grantOfflineResourceBonus(initial, { gold: 10 }, Number.NaN);
    const staleBonus = grantOfflineResourceBonus(initial, { gold: 10 }, initial.updatedAt - 1);
    const invalidCharge = grantInterventionCharge(initial, Number.POSITIVE_INFINITY);
    const staleCharge = grantInterventionCharge(initial, initial.updatedAt - 1);

    expect(invalidBonus).toBe(initial);
    expect(staleBonus).toBe(initial);
    expect(invalidCharge).toBe(initial);
    expect(staleCharge).toBe(initial);
  });

  it('rejects an unsafe action clock before direct rewards can normalize it', () => {
    const initial = createInitialV4Save(124);
    const unsafeClock = Number.MAX_SAFE_INTEGER + 1;

    const bonus = grantOfflineResourceBonus(initial, { gold: 10 }, unsafeClock);
    const charge = grantInterventionCharge(initial, unsafeClock);
    const intervention = useIntervention(initial, 'heal', unsafeClock);

    expect(bonus).toBe(initial);
    expect(charge).toBe(initial);
    expect(intervention.ok).toBe(false);
    if (intervention.ok) return;
    expect(intervention.save).toBe(initial);
  });

  it('rejects unsafe completion clocks before pending work can be settled', () => {
    const initial = createInitialV4Save(125);
    const unsafeClock = Number.MAX_SAFE_INTEGER + 1;
    const startedTask = startFacilityTask(initial, 'temple', initial.updatedAt, null);
    expect(startedTask.ok).toBe(true);
    if (!startedTask.ok) return;

    const settled = completeFacilityTasks(startedTask.save, unsafeClock);
    const instant = completeFacilityTaskNow(startedTask.save, 'temple', unsafeClock);
    expect(settled).toBe(startedTask.save);
    expect(instant.ok).toBe(false);
    if (instant.ok) return;
    expect(instant.save).toBe(startedTask.save);

    const startedExpedition = startExpedition(initial, 'joseon_plains', initial.updatedAt, 'aggression', null);
    expect(startedExpedition.ok).toBe(true);
    if (!startedExpedition.ok) return;
    const pending = startedExpedition.save.run.expedition!;
    pending.status = 'awaiting_confirmation';
    pending.encounterIndex = 2;
    pending.completesAt = startedExpedition.save.updatedAt;
    expect(confirmPendingExpedition(startedExpedition.save, unsafeClock)).toBe(startedExpedition.save);
  });

  it('does not schedule work past the persistable clock ceiling', () => {
    const initial = createInitialV4Save(126);
    initial.lastProcessedAt = Number.MAX_SAFE_INTEGER;
    initial.updatedAt = Number.MAX_SAFE_INTEGER;

    const task = startFacilityTask(initial, 'temple', initial.updatedAt, null);
    const expedition = startExpedition(initial, 'joseon_plains', initial.updatedAt, 'aggression', null);

    expect(task.ok).toBe(false);
    expect(task.save).toBe(initial);
    expect(expedition.ok).toBe(false);
    expect(expedition.save).toBe(initial);
  });

  it('does not mutate a full intervention reserve', () => {
    const full = createInitialV4Save(97);
    full.run.interventionCharges = 3;

    expect(grantInterventionCharge(full, full.updatedAt + 1_000)).toBe(full);
  });
});
