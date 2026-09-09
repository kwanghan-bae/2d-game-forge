import { describe, expect, it, vi } from 'vitest';
import type { HeroSnapshot } from '../../hero/HeroEntity';
import { HeroLifecycle } from '../../hero/HeroLifecycle';
import {
  createInitialVillageSave,
  importLegacyHeroSnapshot,
  loadVillageSave,
  migrateLegacyHeroSnapshot,
  persistVillageSave,
  simulateOfflineProgress,
} from '../save';
import {
  cancelFacilityTask,
  chooseStoryChoice,
  completeFacilityTasks,
  completeFacilityTaskNow,
  advanceHeroActions,
  advanceHeroAutonomy,
  getFacilityTaskPreview,
  getFacilityUpgradeCost,
  getExpeditionForecast,
  getExpeditionSuccessChance,
  getVillageHeroPower,
  getHeroNextAction,
  grantInterventionCharge,
  grantOfflineResourceBonus,
  rejuvenateHero,
  restAgent,
  setVillagePolicy,
  confirmPendingExpedition,
  confirmNextRealmUnlock,
  startExpedition,
  startFacilityTask,
  updateVillageSettings,
  upgradeFacility,
  useIntervention,
} from '../domain';
import { createVillageHeroRuntime } from '../heroRuntime';
import { REALM_DEFINITIONS } from '../data';
import { Village_MAX_SAGA_ENTRIES } from '../types';
import type { FacilityId, RealmId } from '../types';

const HOUR = 60 * 60 * 1000;

describe('Village save and domain', () => {
  it('creates an isolated launch save with the fixed content boundary', () => {
    vi.setSystemTime(new Date('2026-09-06T00:00:00.000Z'));
    const save = createInitialVillageSave(42);

    expect(save.schemaVersion).toBe(2);
    expect(save.meta.currencies).toEqual({ spirit: 100, gold: 100, materials: 12, rift: 0 });
    expect(Object.keys(save.meta.facilities)).toHaveLength(7);
    expect(save.meta.agents.map((agent) => agent.id)).toEqual(['blacksmith', 'mudang', 'guide']);
    expect(save.meta.unlockedRealms).toEqual(['sacred_fields']);
    expect(save.run.expedition).toBeNull();
    expect(save.run.lastExpeditionResult).toBeNull();
    expect(save.run.hero.realmId).toBe('sacred_fields');
    expect(save.run.hero.actionCount).toBe(185);
  });

  it('keeps the saga history bounded to the newest records', () => {
    const initial = createInitialVillageSave(43);
    initial.meta.sagaEntries = Array.from({ length: Village_MAX_SAGA_ENTRIES + 5 }, (_, index) => ({
      id: `saga-${index}`,
      kind: 'milestone' as const,
      createdAt: initial.createdAt + index,
      title: `기록 ${index}`,
      text: `내용 ${index}`,
    })).reverse();

    const updated = setVillagePolicy(initial, 'training', initial.updatedAt + 1_000);

    expect(updated.meta.sagaEntries).toHaveLength(Village_MAX_SAGA_ENTRIES);
    expect(updated.meta.sagaEntries[0]?.id).toBe(`saga-${Village_MAX_SAGA_ENTRIES + 4}`);
    expect(updated.meta.sagaEntries.at(-1)?.id).toBe('saga-5');
  });

  it('round-trips valid Village saves and rejects malformed schema data', () => {
    const save = createInitialVillageSave(13);
    const storage = new Map<string, string>();
    const fakeStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    } as unknown as Storage;

    persistVillageSave(save, fakeStorage);
    expect(loadVillageSave(fakeStorage)).toMatchObject({ schemaVersion: 2, run: { hero: { name: save.run.hero.name } } });

    const { lastExpeditionResult: _legacyResult, ...legacyRun } = save.run;
    storage.set('shin-ui-eternal-sponsor-save-v2', JSON.stringify({ ...save, run: legacyRun }));
    expect(loadVillageSave(fakeStorage)).toMatchObject({ schemaVersion: 2, run: { expedition: null } });

    storage.set('shin-ui-eternal-sponsor-save-v2', JSON.stringify({ ...save, meta: { ...save.meta, currencies: { ...save.meta.currencies, gold: 'broken' } } }));
    expect(loadVillageSave(fakeStorage)).toBeNull();

    storage.set('shin-ui-eternal-sponsor-save-v2', JSON.stringify({
      ...save,
      meta: { ...save.meta, currencies: { ...save.meta.currencies, gold: Number.MAX_SAFE_INTEGER + 1 } },
    }));
    expect(loadVillageSave(fakeStorage)).toBeNull();

    storage.set('shin-ui-eternal-sponsor-save-v2', JSON.stringify({
      ...save,
      meta: { ...save.meta, currencies: { ...save.meta.currencies, cheat: 1 } },
    }));
    expect(loadVillageSave(fakeStorage)).toBeNull();

    storage.set('shin-ui-eternal-sponsor-save-v2', JSON.stringify({
      ...save,
      meta: { ...save.meta, sagaEntries: [save.meta.sagaEntries[0], save.meta.sagaEntries[0]] },
    }));
    expect(loadVillageSave(fakeStorage)).toBeNull();

    storage.set('shin-ui-eternal-sponsor-save-v2', JSON.stringify({
      ...save,
      meta: {
        ...save.meta,
        sagaEntries: [{ ...save.meta.sagaEntries[0], createdAt: save.updatedAt + 1 }],
      },
    }));
    expect(loadVillageSave(fakeStorage)).toBeNull();

    storage.set('shin-ui-eternal-sponsor-save-v2', JSON.stringify({
      ...save,
      meta: {
        ...save.meta,
        sagaEntries: [{ ...save.meta.sagaEntries[0], createdAt: Math.max(0, save.createdAt - 1) }],
      },
    }));
    expect(loadVillageSave(fakeStorage)).toBeNull();

    storage.set('shin-ui-eternal-sponsor-save-v2', JSON.stringify({
      ...save,
      run: {
        ...save.run,
        hero: {
          ...save.run.hero,
          equipmentIds: ['iron_sword', 'iron_sword'],
          equipmentLevels: { iron_sword: 1 },
        },
      },
    }));
    expect(loadVillageSave(fakeStorage)).toBeNull();

    storage.set('shin-ui-eternal-sponsor-save-v2', JSON.stringify({
      ...save,
      run: (() => {
        const { expedition: _expedition, ...runWithoutExpedition } = save.run;
        return runWithoutExpedition;
      })(),
    }));
    expect(loadVillageSave(fakeStorage)).toBeNull();

    const taskSave = startFacilityTask(save, 'blacksmith', save.updatedAt);
    expect(taskSave.ok).toBe(true);
    if (!taskSave.ok) return;
    taskSave.save.meta.tasks[taskSave.task.id].outputEquipmentIds = ['unknown-village-equipment'];
    storage.set('shin-ui-eternal-sponsor-save-v2', JSON.stringify(taskSave.save));
    expect(loadVillageSave(fakeStorage)).toBeNull();
    const settledMalformedTask = completeFacilityTasks(taskSave.save, taskSave.task.completesAt);
    expect(settledMalformedTask.run.hero.equipmentIds).not.toContain('unknown-village-equipment');

    const expeditionSave = createInitialVillageSave(132);
    const expedition = startExpedition(expeditionSave, 'sacred_fields', expeditionSave.updatedAt, 'aggression', null);
    expect(expedition.ok).toBe(true);
    if (!expedition.ok) return;
    expedition.save.run.expedition!.encounterIndex = 2;
    expedition.save.run.expedition!.completesAt = expedition.save.run.expedition!.startedAt;
    const settledExpedition = completeFacilityTasks(expedition.save, expedition.save.run.expedition!.completesAt);
    expect(settledExpedition.run.lastExpeditionResult).not.toBeNull();
    if (!settledExpedition.run.lastExpeditionResult) return;
    storage.set('shin-ui-eternal-sponsor-save-v2', JSON.stringify(settledExpedition));
    expect(loadVillageSave(fakeStorage)).not.toBeNull();
    settledExpedition.run.lastExpeditionResult.recommendedEquipmentId = 'unknown-village-equipment';
    storage.set('shin-ui-eternal-sponsor-save-v2', JSON.stringify(settledExpedition));
    expect(loadVillageSave(fakeStorage)).toBeNull();

  });

  it('rejects an expedition result newer than the save watermark', () => {
    const initial = createInitialVillageSave(130);
    const started = startExpedition(initial, 'sacred_fields', initial.updatedAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.run.expedition!.id = 'e2e-victory-4';
    started.save.run.expedition!.encounterIndex = 2;
    started.save.run.expedition!.completesAt = started.save.run.expedition!.startedAt;
    const settled = completeFacilityTasks(started.save, started.save.run.expedition!.completesAt);
    expect(settled.run.lastExpeditionResult).not.toBeNull();

    const storage = new Map<string, string>();
    const fakeStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    } as unknown as Storage;
    storage.set('shin-ui-eternal-sponsor-save-v2', JSON.stringify({
      ...settled,
      run: {
        ...settled.run,
        lastExpeditionResult: {
          ...settled.run.lastExpeditionResult,
          completedAt: settled.updatedAt + 1,
        },
      },
    }));

    expect(loadVillageSave(fakeStorage)).toBeNull();

    storage.set('shin-ui-eternal-sponsor-save-v2', JSON.stringify({
      ...settled,
      run: {
        ...settled.run,
        lastExpeditionResult: {
          ...settled.run.lastExpeditionResult,
          completedAt: settled.createdAt - 1,
        },
      },
    }));

    expect(loadVillageSave(fakeStorage)).toBeNull();
  });

  it('rejects an expedition result for a locked Realm', () => {
    const initial = createInitialVillageSave(131);
    const started = startExpedition(initial, 'sacred_fields', initial.updatedAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.run.expedition!.id = 'e2e-victory-4';
    started.save.run.expedition!.encounterIndex = 2;
    started.save.run.expedition!.completesAt = started.save.run.expedition!.startedAt;
    const settled = completeFacilityTasks(started.save, started.save.run.expedition!.completesAt);
    expect(settled.run.lastExpeditionResult).not.toBeNull();

    const storage = new Map<string, string>();
    const fakeStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    } as unknown as Storage;
    storage.set('shin-ui-eternal-sponsor-save-v2', JSON.stringify({
      ...settled,
      meta: { ...settled.meta, unlockedRealms: ['sacred_fields'] },
      run: {
        ...settled.run,
        lastExpeditionResult: {
          ...settled.run.lastExpeditionResult,
          realmId: 'deep_forest',
        },
      },
    }));

    expect(loadVillageSave(fakeStorage)).toBeNull();
  });

  it('keeps gameplay alive when local persistence is unavailable', () => {
    const brokenStorage = {
      setItem: () => { throw new Error('quota'); },
    } as unknown as Storage;

    expect(() => persistVillageSave(createInitialVillageSave(15), brokenStorage)).not.toThrow();
  });

  it('does not overwrite a valid save with an invalid runtime snapshot', () => {
    const initial = createInitialVillageSave(16);
    const storage = new Map<string, string>();
    const fakeStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    } as unknown as Storage;

    persistVillageSave(initial, fakeStorage);
    persistVillageSave({
      ...initial,
      meta: { ...initial.meta, currencies: { ...initial.meta.currencies, gold: Number.NaN } },
    }, fakeStorage);

    expect(loadVillageSave(fakeStorage)?.meta.currencies.gold).toBe(initial.meta.currencies.gold);
  });

  it('rejects malformed task and expedition records before they reach the domain', () => {
    const save = createInitialVillageSave(14);
    const storage = new Map<string, string>();
    const fakeStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    } as unknown as Storage;

    storage.set('shin-ui-eternal-sponsor-save-v2', JSON.stringify({
      ...save,
      meta: {
        ...save.meta,
        tasks: { broken: { id: 'broken', facilityId: 'blacksmith', input: { gold: 'NaN' } } },
      },
    }));
    expect(loadVillageSave(fakeStorage)).toBeNull();

    storage.set('shin-ui-eternal-sponsor-save-v2', JSON.stringify({
      ...save,
      run: { ...save.run, expedition: { id: 'broken', realmId: 'unknown', status: 'traveling' } },
    }));
    expect(loadVillageSave(fakeStorage)).toBeNull();

    storage.set('shin-ui-eternal-sponsor-save-v2', JSON.stringify({
      ...save,
      run: { ...save.run, hero: { ...save.run.hero, level: 0 } },
    }));
    expect(loadVillageSave(fakeStorage)).toBeNull();

    storage.set('shin-ui-eternal-sponsor-save-v2', JSON.stringify({
      ...save,
      run: { ...save.run, hero: { ...save.run.hero, hp: save.run.hero.hpMax + 1 } },
    }));
    expect(loadVillageSave(fakeStorage)).toBeNull();

    storage.set('shin-ui-eternal-sponsor-save-v2', JSON.stringify({
      ...save,
      run: { ...save.run, interventionCharges: 99 },
    }));
    expect(loadVillageSave(fakeStorage)).toBeNull();

    storage.set('shin-ui-eternal-sponsor-save-v2', JSON.stringify({
      ...save,
      meta: {
        ...save.meta,
        agents: save.meta.agents.map((agent) => agent.id === 'guide'
          ? { ...agent, fatigue: 101 }
          : agent),
      },
    }));
    expect(loadVillageSave(fakeStorage)).toBeNull();

    storage.set('shin-ui-eternal-sponsor-save-v2', JSON.stringify({
      ...save,
      meta: {
        ...save.meta,
        agents: [save.meta.agents[0], save.meta.agents[0], save.meta.agents[2]],
      },
    }));
    expect(loadVillageSave(fakeStorage)).toBeNull();
  });

  it('rejects saves with tampered agent definitions or a locked expedition route', () => {
    const initial = createInitialVillageSave(17);
    const storage = new Map<string, string>();
    const fakeStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    } as unknown as Storage;

    storage.set('shin-ui-eternal-sponsor-save-v2', JSON.stringify({
      ...initial,
      meta: {
        ...initial.meta,
        agents: initial.meta.agents.map((agent) => agent.id === 'guide'
          ? { ...agent, trait: '위조된 특성' }
          : agent),
      },
    }));
    expect(loadVillageSave(fakeStorage)).toBeNull();

    storage.set('shin-ui-eternal-sponsor-save-v2', JSON.stringify({
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
    expect(loadVillageSave(fakeStorage)).toBeNull();
  });

  it('rejects saves whose facility task links are inconsistent', () => {
    const initial = createInitialVillageSave(16);
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
    storage.set('shin-ui-eternal-sponsor-save-v2', JSON.stringify(broken));

    expect(loadVillageSave(fakeStorage)).toBeNull();
  });

  it('rejects tasks whose completion time precedes their start time', () => {
    const initial = createInitialVillageSave(21);
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
    storage.set('shin-ui-eternal-sponsor-save-v2', JSON.stringify(started.save));

    expect(loadVillageSave(fakeStorage)).toBeNull();
  });

  it('rejects active work whose timestamps fall outside the save chronology', () => {
    const initial = createInitialVillageSave(25);
    const storage = new Map<string, string>();
    const fakeStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => { storage.set(key, value); },
    } as unknown as Storage;

    const taskStart = startFacilityTask(initial, 'temple', initial.createdAt, null);
    expect(taskStart.ok).toBe(true);
    if (!taskStart.ok) return;
    const task = taskStart.save.meta.tasks[taskStart.task.id];
    storage.set('shin-ui-eternal-sponsor-save-v2', JSON.stringify({
      ...taskStart.save,
      meta: {
        ...taskStart.save.meta,
        tasks: { ...taskStart.save.meta.tasks, [task.id]: { ...task, startedAt: initial.createdAt - 1 } },
      },
    }));
    expect(loadVillageSave(fakeStorage)).toBeNull();

    const expeditionStart = startExpedition(initial, 'sacred_fields', initial.createdAt, 'aggression', null);
    expect(expeditionStart.ok).toBe(true);
    if (!expeditionStart.ok) return;
    const expedition = expeditionStart.save.run.expedition;
    expect(expedition).not.toBeNull();
    if (!expedition) return;
    storage.set('shin-ui-eternal-sponsor-save-v2', JSON.stringify({
      ...expeditionStart.save,
      run: {
        ...expeditionStart.save.run,
        expedition: { ...expedition, startedAt: expeditionStart.save.updatedAt + 1 },
      },
    }));
    expect(loadVillageSave(fakeStorage)).toBeNull();
  });

  it('rejects zero-duration active tasks and expeditions before they reach the UI', () => {
    const initial = createInitialVillageSave(22);
    const taskStart = startFacilityTask(initial, 'temple', initial.createdAt, null);
    const expeditionStart = startExpedition(initial, 'sacred_fields', initial.createdAt, 'aggression', null);
    expect(taskStart.ok).toBe(true);
    expect(expeditionStart.ok).toBe(true);
    if (!taskStart.ok || !expeditionStart.ok) return;

    const storage = new Map<string, string>();
    const fakeStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    } as unknown as Storage;
    taskStart.save.meta.tasks[taskStart.task.id].completesAt = taskStart.task.startedAt;
    persistVillageSave(taskStart.save, fakeStorage);
    expect(loadVillageSave(fakeStorage)).toBeNull();

    expeditionStart.save.run.expedition!.completesAt = expeditionStart.save.run.expedition!.startedAt;
    persistVillageSave(expeditionStart.save, fakeStorage);
    expect(loadVillageSave(fakeStorage)).toBeNull();
  });

  it('rejects saves whose expedition and guide links are inconsistent', () => {
    const initial = createInitialVillageSave(18);
    const started = startExpedition(initial, 'sacred_fields', initial.createdAt, 'aggression', 'guide');
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
    storage.set('shin-ui-eternal-sponsor-save-v2', JSON.stringify(broken));

    expect(loadVillageSave(fakeStorage)).toBeNull();
  });

  it('rejects saves that combine hero training with an expedition or stale action state', () => {
    const initial = createInitialVillageSave(16);
    const training = startFacilityTask(initial, 'training', initial.createdAt);
    const expedition = startExpedition(initial, 'sacred_fields', initial.createdAt, 'aggression', null);
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
    persistVillageSave(conflicting, fakeStorage);
    expect(loadVillageSave(fakeStorage)).toBeNull();

    const staleAction = { ...expedition.save, run: { ...expedition.save.run, hero: { ...expedition.save.run.hero, currentAction: 'rest' as const } } };
    persistVillageSave(staleAction, fakeStorage);
    expect(loadVillageSave(fakeStorage)).toBeNull();
  });

  it('rejects impossible save chronology, duplicate realm unlocks, and off-specialty task links', () => {
    const initial = createInitialVillageSave(23);
    const storage = new Map<string, string>();
    const fakeStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    } as unknown as Storage;
    const put = (save: typeof initial) => {
      storage.set('shin-ui-eternal-sponsor-save-v2', JSON.stringify(save));
      expect(loadVillageSave(fakeStorage)).toBeNull();
    };

    put({ ...initial, updatedAt: initial.createdAt - 1 });
    put({ ...initial, lastProcessedAt: initial.createdAt - 1 });
    put({ ...initial, updatedAt: initial.createdAt, lastProcessedAt: initial.createdAt + 1 });
    put({
      ...initial,
      meta: { ...initial.meta, unlockedRealms: ['sacred_fields', 'sacred_fields'] },
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

  it('maps a legacy hero snapshot without sharing the legacy store shape', () => {
    const source = {
      name: '홍길동', emoji: '⚔️', age: 37, chapter: '장년기', job: '검객', level: 12,
      exp: 4, hp: 900, hpMax: 1000, atk: 250, atkBase: 200, hpBase: 800,
      actionCount: 492, rejuvenationCount: 1, gridX: 2, gridY: 3, equipment: ['w-knife'],
      personality: { courage: 1, curiosity: 0, greed: -1, compassion: 1, discipline: 0 },
      unlockedJobId: null, unlockedMilestones: [], learnedSkillIds: [], seed: 99,
      def: 80, defBase: 70, critRateBase: 0.08,
    } as unknown as HeroSnapshot;

    const hero = migrateLegacyHeroSnapshot(source);
    expect(hero).toMatchObject({
      name: '홍길동', age: 37, level: 12, hp: 900, atk: 250, def: 80,
      defBase: 70, critRateBase: 0.08, realmId: 'sacred_fields',
    });
    expect(hero).not.toHaveProperty('personality');

    const sanitized = migrateLegacyHeroSnapshot({ ...source, name: '   ', emoji: '  ' });
    expect(sanitized.name).toBe('이름 없는 영웅');
    expect(sanitized.emoji).toBe('⚔️');

    const destination = createInitialVillageSave(1);
    const imported = importLegacyHeroSnapshot(destination, source, 1234);
    expect(imported.run.hero.name).toBe('홍길동');
    expect(imported.meta.sagaEntries[0]?.title).toBe('기존 영웅 기록 가져오기');
    const importedAgain = importLegacyHeroSnapshot(imported, source, 1234);
    expect(importedAgain.meta.sagaEntries[0]?.id).not.toBe(imported.meta.sagaEntries[0]?.id);
    imported.meta.currencies.gold = 0;
    expect(importedAgain.meta.currencies.gold).toBe(100);
    expect(imported.meta.currencies.gold).not.toBe(destination.meta.currencies.gold);
    expect(destination.meta.currencies.gold).toBe(100);
    expect(imported.meta.currencies.gold).not.toBe(importedAgain.meta.currencies.gold);

    const staleDestination = createInitialVillageSave(2);
    staleDestination.lastProcessedAt = staleDestination.createdAt + HOUR;
    staleDestination.updatedAt = staleDestination.lastProcessedAt;
    const importedAfterClockRollback = importLegacyHeroSnapshot(staleDestination, source, staleDestination.createdAt + 1_000);
    expect(importedAfterClockRollback.updatedAt).toBe(staleDestination.lastProcessedAt);
    expect(importedAfterClockRollback.meta.sagaEntries[0]?.createdAt).toBe(staleDestination.lastProcessedAt);

    const importedWithUnsafeClock = importLegacyHeroSnapshot(destination, source, Number.MAX_VALUE);
    expect(importedWithUnsafeClock.updatedAt).toBe(destination.updatedAt);
    expect(importedWithUnsafeClock.meta.sagaEntries[0]?.createdAt).toBe(destination.updatedAt);

    const fullSagaDestination = createInitialVillageSave(3);
    fullSagaDestination.meta.sagaEntries = Array.from({ length: Village_MAX_SAGA_ENTRIES }, (_, index) => ({
      ...fullSagaDestination.meta.sagaEntries[0]!,
      id: `existing-${index}`,
      title: `기존 기록 ${index}`,
    }));
    const boundedImport = importLegacyHeroSnapshot(fullSagaDestination, source, fullSagaDestination.updatedAt + 1_000);
    expect(boundedImport.meta.sagaEntries).toHaveLength(Village_MAX_SAGA_ENTRIES);
    expect(boundedImport.meta.sagaEntries[0]?.title).toBe('기존 영웅 기록 가져오기');
    expect(boundedImport.meta.sagaEntries.at(-1)?.id).toBe(`existing-${Village_MAX_SAGA_ENTRIES - 2}`);
  });

  it('preserves the destination hero action while explicitly importing a legacy hero', () => {
    const destination = createInitialVillageSave(118);
    destination.meta.unlockedRealms.push('deep_forest');
    destination.run.hero.realmId = 'deep_forest';
    const started = startFacilityTask(destination, 'training', destination.createdAt, null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const imported = importLegacyHeroSnapshot(started.save, {
      name: '훈련 중인 영웅', emoji: '⚔️', age: 17, chapter: '청년기', job: '검객', level: 1,
      exp: 0, hp: 1_000, hpMax: 1_000, atk: 160, atkBase: 160, hpBase: 1_000,
      actionCount: 185, rejuvenationCount: 0, gridX: 0, gridY: 0, equipment: [],
      personality: { courage: 0, curiosity: 0, greed: 0, compassion: 0, discipline: 0 },
      unlockedJobId: null, unlockedMilestones: [], learnedSkillIds: [], seed: 1,
    } as unknown as HeroSnapshot, destination.createdAt + 1_000);

    expect(imported.run.hero.currentAction).toBe('train');
    expect(imported.run.hero.realmId).toBe('deep_forest');
  });

  it('avoids a saga ID collision with an active facility task during explicit import', () => {
    const destination = createInitialVillageSave(1201);
    const started = startFacilityTask(destination, 'temple', destination.createdAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const importAt = destination.createdAt + 1_000;
    const collidingId = `saga-import-${importAt}`;
    const task = started.save.meta.tasks[started.task.id];
    expect(task).toBeDefined();
    if (!task) return;

    delete started.save.meta.tasks[started.task.id];
    task.id = collidingId;
    started.save.meta.tasks[collidingId] = task;
    started.save.meta.facilities.temple.activeTaskId = collidingId;

    const imported = importLegacyHeroSnapshot(started.save, {} as HeroSnapshot, importAt);

    expect(imported.meta.sagaEntries[0]?.id).toBe(`${collidingId}-2`);
    const storage = new Map<string, string>();
    const fakeStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    } as unknown as Storage;
    expect(persistVillageSave(imported, fakeStorage)).toBe(true);
  });

  it('does not replace the battle hero while an expedition is active', () => {
    const destination = createInitialVillageSave(119);
    const started = startExpedition(destination, 'sacred_fields', destination.updatedAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const imported = importLegacyHeroSnapshot(started.save, {
      name: '교체 시도 영웅', emoji: '🛡️', age: 17, chapter: '청년기', job: '검객', level: 1,
      exp: 0, hp: 1_000, hpMax: 1_000, atk: 160, atkBase: 160, hpBase: 1_000,
      actionCount: 185, rejuvenationCount: 0, gridX: 0, gridY: 0, equipment: [],
      personality: { courage: 0, curiosity: 0, greed: 0, compassion: 0, discipline: 0 },
      unlockedJobId: null, unlockedMilestones: [], learnedSkillIds: [], seed: 119,
    } as unknown as HeroSnapshot, destination.updatedAt + 1_000);

    expect(imported).toBe(started.save);
    expect(imported.run.hero.name).not.toBe('교체 시도 영웅');
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

    const hero = migrateLegacyHeroSnapshot(source);

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

    const hero = migrateLegacyHeroSnapshot(source);

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

    const hero = migrateLegacyHeroSnapshot(source);

    expect(hero.equipmentIds).toEqual(['w-knife']);
    expect(hero.equipmentLevels).toEqual({ 'w-knife': 1 });
  });

  it('filters blank V3 equipment identifiers during explicit import', () => {
    const source = {
      name: '빈 장비 영웅', emoji: '⚔️', age: 17, chapter: '청년기', job: '검객', level: 1,
      exp: 0, hp: 1_000, hpMax: 1_000, atk: 160, atkBase: 160, hpBase: 1_000,
      actionCount: 185, rejuvenationCount: 0, gridX: 0, gridY: 0,
      equipment: ['', '  ', '\t', 'legacy-knife', 'legacy-knife'] as never,
      personality: { courage: 0, curiosity: 0, greed: 0, compassion: 0, discipline: 0 },
      unlockedJobId: null, unlockedMilestones: [], learnedSkillIds: [], seed: 1,
    } as unknown as HeroSnapshot;

    const hero = migrateLegacyHeroSnapshot(source);

    expect(hero.equipmentIds).toEqual(['legacy-knife']);
    expect(hero.equipmentLevels).toEqual({ 'legacy-knife': 2 });
  });

  it('normalizes malformed V3 core stats into a valid Village hero snapshot', () => {
    const source = {
      name: 42, emoji: null, age: Number.MAX_VALUE, chapter: '청년기', job: '검객', level: Number.MAX_VALUE,
      exp: Number.POSITIVE_INFINITY, hp: Number.MAX_VALUE, hpMax: Number.MAX_VALUE,
      atk: Number.MAX_VALUE, atkBase: 160, hpBase: 1_000, actionCount: Number.MAX_VALUE,
      rejuvenationCount: Number.NaN, gridX: 0, gridY: 0, equipment: [],
      personality: { courage: 0, curiosity: 0, greed: 0, compassion: 0, discipline: 0 },
      unlockedJobId: null, unlockedMilestones: [], learnedSkillIds: [], seed: 1,
    } as unknown as HeroSnapshot;

    const hero = migrateLegacyHeroSnapshot(source);

    expect(hero).toMatchObject({
      name: '이름 없는 영웅', emoji: '⚔️', age: 17, level: 1, exp: 0,
      hp: 1_000, hpMax: 1_000, atk: 160, actionCount: HeroLifecycle.actionsForAge(17),
      rejuvenationCount: 0, currentAction: 'rest',
    });

    expect(() => migrateLegacyHeroSnapshot(null as never)).not.toThrow();
    expect(migrateLegacyHeroSnapshot(null as never)).toMatchObject({
      name: '이름 없는 영웅', emoji: '⚔️', age: 17, level: 1,
    });
  });

  it('bounds derived hero action clocks when an imported age is extremely large', () => {
    const source = {
      name: '극한 영웅', emoji: '⚔️', age: Number.MAX_SAFE_INTEGER, chapter: '마지막', job: '검객',
      level: 1, exp: 0, hp: 1_000, hpMax: 1_000, atk: 160, atkBase: 160, hpBase: 1_000,
      actionCount: Number.NaN, rejuvenationCount: 0, gridX: 0, gridY: 0, equipment: [],
      personality: { courage: 0, curiosity: 0, greed: 0, compassion: 0, discipline: 0 },
      unlockedJobId: null, unlockedMilestones: [], learnedSkillIds: [], seed: 1,
    } as unknown as HeroSnapshot;

    const hero = migrateLegacyHeroSnapshot(source);

    expect(hero.actionCount).toBe(Number.MAX_SAFE_INTEGER);
    expect(Number.isSafeInteger(hero.actionCount)).toBe(true);
  });

  it('settles completed facility work once and applies the 70% offline efficiency', () => {
    vi.setSystemTime(new Date('2026-09-06T00:00:00.000Z'));
    const initial = createInitialVillageSave(7);
    const started = startFacilityTask(initial, 'blacksmith', initial.createdAt, 'blacksmith');
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const offline = simulateOfflineProgress(started.save, initial.createdAt + HOUR);
    expect(offline.summary.processedSeconds).toBe(3600);
    expect(offline.summary.efficiency).toBe(0.7);
    expect(offline.save.meta.facilities.blacksmith.activeTaskId).toBeNull();
    expect(offline.summary.completedTaskIds).toEqual([started.task.id]);
    expect(offline.summary.equipmentGained).toEqual(['iron_sword']);
    expect(offline.save.run.hero.equipmentIds).toContain('iron_sword');

    const replay = simulateOfflineProgress(offline.save, initial.createdAt + HOUR);
    expect(replay.summary.processedSeconds).toBe(0);
    expect(replay.summary.completedTaskIds).toEqual([]);
    expect(replay.summary.resourcesGained).toEqual({});
    expect(replay.save.meta.currencies).toEqual(offline.save.meta.currencies);
  });

  it('reports an offline equipment upgrade separately from a new equipment gain', () => {
    const initial = createInitialVillageSave(708);
    initial.run.hero.equipmentIds = ['iron_sword'];
    initial.run.hero.equipmentLevels = { iron_sword: 1 };
    const started = startFacilityTask(initial, 'blacksmith', initial.createdAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const offline = simulateOfflineProgress(started.save, initial.createdAt + HOUR);

    expect(offline.summary.equipmentGained).toEqual([]);
    expect(offline.summary.equipmentUpgraded).toEqual(['iron_sword']);
    expect(offline.save.run.hero.equipmentLevels).toEqual({ iron_sword: 2 });
  });

  it('does not create a second save when a resume has no newly due work', () => {
    const initial = createInitialVillageSave(708);
    const settled = simulateOfflineProgress(initial, initial.createdAt + HOUR);
    const replay = simulateOfflineProgress(settled.save, settled.save.lastProcessedAt);

    expect(replay.save).toBe(settled.save);
    expect(replay.summary.processedSeconds).toBe(0);
    expect(replay.summary.completedTaskIds).toEqual([]);
    expect(replay.summary.completedExpedition).toBe(false);
  });

  it('still settles work due exactly at the offline watermark', () => {
    const initial = createInitialVillageSave(709);
    const started = startFacilityTask(initial, 'blacksmith', initial.createdAt, 'blacksmith');
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    started.save.meta.tasks[started.task.id]!.completesAt = started.save.lastProcessedAt;
    const settled = simulateOfflineProgress(started.save, started.save.lastProcessedAt);

    expect(settled.summary.completedTaskIds).toEqual([started.task.id]);
    expect(settled.save.meta.tasks[started.task.id]).toBeUndefined();
  });

  it('settles overdue work inside the capped window after a later manual save', () => {
    const initial = createInitialVillageSave(118);
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
    const initial = createInitialVillageSave(119);
    const started = startExpedition(initial, 'sacred_fields', initial.createdAt, 'aggression', null);
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

  it('parks a risky expedition beyond the capped window before the next live tick can auto-resolve it', () => {
    const initial = createInitialVillageSave(120);
    initial.meta.unlockedRealms.push('deep_forest');
    const started = startExpedition(initial, 'deep_forest', initial.createdAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const now = initial.createdAt + 10 * HOUR;
    started.save.run.expedition!.completesAt = initial.createdAt + 9 * HOUR;
    started.save.updatedAt = now;
    const offline = simulateOfflineProgress(started.save, now);

    expect(offline.save.run.expedition?.status).toBe('awaiting_confirmation');
    expect(offline.summary.completedExpedition).toBe(false);

    const liveTick = completeFacilityTasks(offline.save, now + 1_000);
    expect(liveTick.run.expedition?.status).toBe('awaiting_confirmation');
    expect(liveTick.run.lastExpeditionResult).toBeNull();
  });

  it('falls back to full efficiency when settlement receives a non-finite multiplier', () => {
    const initial = createInitialVillageSave(28);
    const started = startFacilityTask(initial, 'training', initial.createdAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const completed = completeFacilityTasks(started.save, started.task.completesAt, Number.NaN);

    expect(completed.meta.currencies.spirit).toBe(initial.meta.currencies.spirit + 8);
    expect(completed.run.hero.exp).toBe(40);
    expect(Number.isFinite(completed.run.hero.exp)).toBe(true);
  });

  it('advances the processing watermark when work is completed online', () => {
    const initial = createInitialVillageSave(17);
    const started = startFacilityTask(initial, 'temple', initial.createdAt, null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const completedAt = started.task.completesAt;

    const completed = completeFacilityTasks(started.save, completedAt);

    expect(completed.lastProcessedAt).toBe(completedAt);
  });

  it('cancels facility work with a full input refund and releases the agent', () => {
    const initial = createInitialVillageSave(71);
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

  it('does not refund a facility task that is already due for settlement', () => {
    const initial = createInitialVillageSave(72);
    const started = startFacilityTask(initial, 'temple', initial.createdAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const result = cancelFacilityTask(started.save, 'temple', started.task.completesAt);

    expect(result.ok).toBe(false);
    expect(result.save).toBe(started.save);
    if (result.ok) return;
    expect(result.error).toContain('이미 완료');
    expect(result.save.meta.tasks[started.task.id]).toBeDefined();
  });

  it('gates agent specialty by trust and slows tired agents', () => {
    const initial = createInitialVillageSave(75);
    const baseline = startFacilityTask(initial, 'blacksmith', initial.createdAt, 'blacksmith');
    expect(baseline.ok).toBe(true);
    if (!baseline.ok) return;

    const trusted = createInitialVillageSave(76);
    trusted.meta.agents = trusted.meta.agents.map((agent) => agent.id === 'blacksmith'
      ? { ...agent, trust: 50 }
      : agent);
    const specialized = startFacilityTask(trusted, 'blacksmith', trusted.createdAt, 'blacksmith');
    expect(specialized.ok).toBe(true);
    if (!specialized.ok) return;

    const tired = createInitialVillageSave(77);
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
    const initial = createInitialVillageSave(79);
    initial.meta.agents = initial.meta.agents.map((agent) => agent.id === 'blacksmith'
      ? { ...agent, fatigue: 100 }
      : agent);

    const result = startFacilityTask(initial, 'blacksmith', initial.createdAt, 'blacksmith');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('피로');
  });

  it('lets an idle agent rest to recover from fatigue', () => {
    const initial = createInitialVillageSave(80);
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
    const initial = createInitialVillageSave(81);
    const started = startFacilityTask(initial, 'blacksmith', initial.createdAt, 'blacksmith');
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const result = restAgent(started.save, 'blacksmith', initial.createdAt + 1_000);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('작업 중');
  });

  it.each([
    ['missing', undefined],
    ['not-a-number', Number.NaN],
    ['infinite', Number.POSITIVE_INFINITY],
    ['over-cap', 101],
  ])('rejects resting an agent with %s fatigue', (_label, fatigue) => {
    const malformed = createInitialVillageSave(133);
    malformed.meta.agents = malformed.meta.agents.map((agent) => agent.id === 'blacksmith'
      ? { ...agent, fatigue: fatigue as never }
      : agent);

    const result = restAgent(malformed, 'blacksmith', malformed.updatedAt + 1_000);

    expect(result.ok).toBe(false);
    expect(result.save).toBe(malformed);
    expect(malformed.meta.agents.find((agent) => agent.id === 'blacksmith')?.fatigue).toBe(fatigue);
  });

  it.each([
    ['missing', undefined],
    ['not-a-number', Number.NaN],
    ['infinite', Number.POSITIVE_INFINITY],
    ['over-cap', 101],
  ])('rejects assigning an agent with %s fatigue', (_label, fatigue) => {
    const malformed = createInitialVillageSave(134);
    malformed.meta.agents = malformed.meta.agents.map((agent) => agent.id === 'blacksmith' || agent.id === 'guide'
      ? { ...agent, fatigue: fatigue as never }
      : agent);

    const task = startFacilityTask(malformed, 'blacksmith', malformed.updatedAt + 1_000, 'blacksmith');
    const expedition = startExpedition(malformed, 'sacred_fields', malformed.updatedAt + 1_000, 'aggression', 'guide');

    expect(task.ok).toBe(false);
    expect(task.save).toBe(malformed);
    expect(expedition.ok).toBe(false);
    expect(expedition.save).toBe(malformed);
    expect(malformed.meta.tasks).toEqual({});
    expect(malformed.run.expedition).toBeNull();
  });

  it.each([
    ['trust-not-a-number', 'trust', Number.NaN],
    ['trust-over-cap', 'trust', 101],
    ['level-fractional', 'level', 1.5],
    ['level-infinite', 'level', Number.POSITIVE_INFINITY],
    ['trait-tampered', 'trait', '위조된 특성'],
  ])('rejects assigning an agent with malformed %s', (_label, field, value) => {
    const malformed = createInitialVillageSave(135);
    malformed.meta.agents = malformed.meta.agents.map((agent) => {
      if (agent.id !== 'blacksmith' && agent.id !== 'guide') return agent;
      return { ...agent, [field]: value } as typeof agent;
    });

    const task = startFacilityTask(malformed, 'blacksmith', malformed.updatedAt + 1_000, 'blacksmith');
    const expedition = startExpedition(malformed, 'sacred_fields', malformed.updatedAt + 1_000, 'aggression', 'guide');

    expect(task.ok).toBe(false);
    expect(task.save).toBe(malformed);
    expect(expedition.ok).toBe(false);
    expect(expedition.save).toBe(malformed);
    expect(malformed.meta.tasks).toEqual({});
    expect(malformed.run.expedition).toBeNull();
  });

  it('does not settle assigned facility work when agent trust is malformed', () => {
    const initial = createInitialVillageSave(136);
    const started = startFacilityTask(initial, 'blacksmith', initial.createdAt, 'blacksmith');
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const agent = started.save.meta.agents.find((item) => item.id === 'blacksmith');
    if (!agent) return;
    agent.trust = Number.NaN;

    const settled = completeFacilityTasks(started.save, started.task.completesAt);

    expect(settled).toBe(started.save);
    expect(started.save.meta.tasks[started.task.id]).toBeDefined();
    expect(agent.trust).toBe(Number.NaN);
  });

  it('does not settle a guide expedition when agent level is malformed', () => {
    const initial = createInitialVillageSave(137);
    const started = startExpedition(initial, 'sacred_fields', initial.createdAt, 'aggression', 'guide');
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const guide = started.save.meta.agents.find((item) => item.id === 'guide');
    if (!guide) return;
    guide.level = 1.5;

    const settled = completeFacilityTasks(started.save, started.save.run.expedition!.completesAt);

    expect(settled).toBe(started.save);
    expect(started.save.run.expedition).not.toBeNull();
    expect(guide.level).toBe(1.5);
  });

  it('does not consume the offline clock when malformed agent settlement is blocked', () => {
    const initial = createInitialVillageSave(138);
    const started = startFacilityTask(initial, 'blacksmith', initial.createdAt, 'blacksmith');
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const agent = started.save.meta.agents.find((item) => item.id === 'blacksmith');
    if (!agent) return;
    agent.trust = Number.NaN;
    const beforeUpdatedAt = started.save.updatedAt;
    const beforeProcessedAt = started.save.lastProcessedAt;

    const result = simulateOfflineProgress(started.save, started.task.completesAt + HOUR);

    expect(result.save).toBe(started.save);
    expect(result.save.updatedAt).toBe(beforeUpdatedAt);
    expect(result.save.lastProcessedAt).toBe(beforeProcessedAt);
    expect(result.summary.completedTaskIds).toEqual([]);
    expect(result.summary.resourcesGained).toEqual({});
  });

  it('promotes an agent after trust grows through completed work', () => {
    const initial = createInitialVillageSave(78);
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
    const levelTwo = createInitialVillageSave(98);
    levelTwo.meta.agents = levelTwo.meta.agents.map((agent) => agent.id === 'blacksmith'
      ? { ...agent, trust: 50, level: 2 }
      : agent);
    const levelThree = createInitialVillageSave(99);
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

    const maxTrust = createInitialVillageSave(100);
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
    const initial = createInitialVillageSave(82);
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
    const initial = createInitialVillageSave(87);
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
    const initial = createInitialVillageSave(83);
    const training = startFacilityTask(initial, 'training', initial.createdAt, null);
    expect(training.ok).toBe(true);
    if (!training.ok) return;

    const expeditionWhileTraining = startExpedition(training.save, 'sacred_fields', initial.createdAt, 'aggression', null);
    expect(expeditionWhileTraining.ok).toBe(false);

    const expedition = startExpedition(initial, 'sacred_fields', initial.createdAt, 'aggression', null);
    expect(expedition.ok).toBe(true);
    if (!expedition.ok) return;
    const trainingDuringExpedition = startFacilityTask(expedition.save, 'training', initial.createdAt, null);
    expect(trainingDuringExpedition.ok).toBe(false);
  });

  it('scales facility upgrade costs and task throughput by level', () => {
    const initial = createInitialVillageSave(84);
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
    const initial = createInitialVillageSave(85);
    const preview = getFacilityTaskPreview(initial, 'blacksmith', 'blacksmith');
    const started = startFacilityTask(initial, 'blacksmith', initial.createdAt, 'blacksmith');

    expect(preview).toMatchObject({
      facilityId: 'blacksmith',
      durationSeconds: 45,
      input: { gold: 20, materials: 3 },
      output: { materials: 2 },
      outputEquipmentIds: ['iron_sword'],
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
    const initial = createInitialVillageSave(94);
    const preview = getFacilityTaskPreview(initial, 'blacksmith', 'guide');
    const result = startFacilityTask(initial, 'blacksmith', initial.createdAt, 'guide');

    expect(preview.canStart).toBe(false);
    expect(preview.error).toContain('전문');
    expect(result.ok).toBe(false);
  });

  it('rejects empty support-agent assignments before writing tasks or expeditions', () => {
    const initial = createInitialVillageSave(120);
    const preview = getFacilityTaskPreview(initial, 'blacksmith', '' as never);
    const task = startFacilityTask(initial, 'blacksmith', initial.updatedAt, '' as never);
    const expedition = startExpedition(initial, 'sacred_fields', initial.updatedAt, 'aggression', '' as never);
    const undefinedPreview = getFacilityTaskPreview(initial, 'blacksmith', undefined);
    const undefinedTask = startFacilityTask(initial, 'blacksmith', initial.updatedAt, undefined);
    const undefinedExpedition = startExpedition(initial, 'sacred_fields', initial.updatedAt, 'aggression', undefined as never);
    const omittedPreview = getFacilityTaskPreview(initial, 'temple');
    const nullTask = startFacilityTask(initial, 'temple', initial.updatedAt, null);
    const specialistPreview = getFacilityTaskPreview(initial, 'mudang', 'mudang');

    expect(preview.canStart).toBe(false);
    expect(preview.error).toBe('지원 에이전트를 찾을 수 없습니다.');
    expect(task.ok).toBe(false);
    expect(expedition.ok).toBe(false);
    expect(undefinedPreview.canStart).toBe(false);
    expect(undefinedPreview.error).toBe('지원 에이전트를 찾을 수 없습니다.');
    expect(undefinedTask.ok).toBe(false);
    expect(undefinedExpedition.ok).toBe(false);
    expect(omittedPreview.canStart).toBe(true);
    expect(nullTask.ok).toBe(true);
    expect(specialistPreview.canStart).toBe(true);
    expect(initial.meta.tasks).toEqual({});
    expect(initial.run.expedition).toBeNull();
    expect(initial.meta.currencies).toEqual({ spirit: 100, gold: 100, materials: 12, rift: 0 });
  });

  it('makes training and expedition facility levels affect the live economy', () => {
    const base = createInitialVillageSave(95);
    const upgraded = createInitialVillageSave(96);
    upgraded.meta.facilities.training.level = 3;
    upgraded.meta.facilities.expedition.level = 3;

    const baseTraining = getFacilityTaskPreview(base, 'training', null);
    const upgradedTraining = getFacilityTaskPreview(upgraded, 'training', null);
    expect(upgradedTraining.heroExpGain).toBeGreaterThan(baseTraining.heroExpGain);

    const baseExpedition = startExpedition(base, 'sacred_fields', base.createdAt, 'aggression', null);
    const upgradedExpedition = startExpedition(upgraded, 'sacred_fields', upgraded.createdAt, 'aggression', null);
    expect(baseExpedition.ok).toBe(true);
    expect(upgradedExpedition.ok).toBe(true);
    if (!baseExpedition.ok || !upgradedExpedition.ok) return;
    expect(upgradedExpedition.task.completesAt - upgradedExpedition.task.startedAt)
      .toBeLessThan(baseExpedition.task.completesAt - baseExpedition.task.startedAt);
  });

  it('keeps facility economy previews finite for malformed extreme levels', () => {
    const malformed = createInitialVillageSave(117);
    malformed.meta.facilities.blacksmith.level = Number.MAX_VALUE;
    malformed.meta.facilities.temple.level = Number.MAX_VALUE;

    const preview = getFacilityTaskPreview(malformed, 'blacksmith', null);
    const cost = getFacilityUpgradeCost(malformed, 'temple');
    const started = startFacilityTask(malformed, 'blacksmith', malformed.updatedAt, null);

    expect(cost).not.toBeNull();
    expect([
      preview.durationSeconds,
      preview.heroExpGain,
      ...Object.values(preview.output),
      ...(cost ? [cost.gold, cost.materials] : []),
    ].every((value) => Number.isFinite(value))).toBe(true);
    expect(started.ok).toBe(true);
  });

  it('blocks task previews and starts for malformed facility levels', () => {
    for (const level of [Number.NaN, 1.5, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      const malformed = createInitialVillageSave(118);
      malformed.meta.facilities.blacksmith.level = level;

      const preview = getFacilityTaskPreview(malformed, 'blacksmith', null);
      const started = startFacilityTask(malformed, 'blacksmith', malformed.updatedAt, null);

      expect(preview.canStart).toBe(false);
      expect(preview.error).toBe('아직 사용할 수 없는 시설입니다.');
      expect(started.ok).toBe(false);
    }

    const missingLevel = createInitialVillageSave(118);
    delete (missingLevel.meta.facilities.blacksmith as { level?: number }).level;
    const preview = getFacilityTaskPreview(missingLevel, 'blacksmith', null);
    const started = startFacilityTask(missingLevel, 'blacksmith', missingLevel.updatedAt, null);

    expect(preview.canStart).toBe(false);
    expect(preview.error).toBe('아직 사용할 수 없는 시설입니다.');
    expect(started.ok).toBe(false);

    const wrongType = createInitialVillageSave(118);
    (wrongType.meta.facilities.blacksmith as { level: unknown }).level = '2';
    const wrongTypePreview = getFacilityTaskPreview(wrongType, 'blacksmith', null);
    const wrongTypeStarted = startFacilityTask(wrongType, 'blacksmith', wrongType.updatedAt, null);

    expect(wrongTypePreview.canStart).toBe(false);
    expect(wrongTypePreview.error).toBe('아직 사용할 수 없는 시설입니다.');
    expect(wrongTypeStarted.ok).toBe(false);
  });

  it('exposes the scaled facility upgrade cost without mutating the save', () => {
    const initial = createInitialVillageSave(86);
    initial.meta.facilities.temple.level = 3;

    expect(getFacilityUpgradeCost(initial, 'temple')).toEqual({ gold: 145, materials: 7 });
    expect(initial.meta.currencies).toEqual({ spirit: 100, gold: 100, materials: 12, rift: 0 });
  });

  it('settles only the selected task when an instant completion overlaps due work', () => {
    const initial = createInitialVillageSave(119);
    const temple = startFacilityTask(initial, 'temple', initial.updatedAt);
    expect(temple.ok).toBe(true);
    if (!temple.ok) return;

    const archive = startFacilityTask(temple.save, 'archive', initial.updatedAt);
    expect(archive.ok).toBe(true);
    if (!archive.ok) return;
    archive.save.meta.tasks[archive.task.id]!.completesAt = initial.updatedAt + 500;

    const expedition = startExpedition(archive.save, 'sacred_fields', initial.updatedAt, 'aggression', null);
    expect(expedition.ok).toBe(true);
    if (!expedition.ok) return;
    expedition.save.run.expedition!.completesAt = initial.updatedAt + 500;

    const instant = completeFacilityTaskNow(expedition.save, 'temple', initial.updatedAt + 1_000);

    expect(instant.ok).toBe(true);
    if (!instant.ok) return;
    expect(instant.save.meta.tasks[archive.task.id]).toBeDefined();
    expect(instant.save.meta.facilities.archive.activeTaskId).toBe(archive.task.id);
    expect(instant.save.run.expedition).toBeDefined();
    expect(instant.save.meta.currencies).toMatchObject({ spirit: 106, materials: 11, rift: 0 });
  });

  it('applies monetization effects through pure Village domain helpers', () => {
    const initial = createInitialVillageSave(72);
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
    const initial = createInitialVillageSave(73);
    initial.run.hero.hp = 120;
    const result = useIntervention(initial, 'heal', initial.createdAt + 1_000);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.save.run.interventionCharges).toBe(0);
    expect(result.save.run.hero.hp).toBe(result.save.run.hero.hpMax);
    expect(result.save.meta.sagaEntries[0]?.title).toBe('신의 개입: 즉시 회복');
  });

  it('uses an intervention to retreat safely and releases the guide', () => {
    const initial = createInitialVillageSave(74);
    const started = startExpedition(initial, 'sacred_fields', initial.createdAt, 'aggression', 'guide');
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
    const initial = createInitialVillageSave(119);
    initial.run.hero.hp = 120;

    const result = useIntervention(initial, 'heal', initial.updatedAt - 1);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.save).toBe(initial);
    expect(initial.run.interventionCharges).toBe(1);
    expect(initial.run.hero.hp).toBe(120);
  });

  it('does not mutate a malformed intervention reserve into an invalid save', () => {
    const malformed = createInitialVillageSave(131);
    malformed.run.interventionCharges = Number.NaN;
    malformed.run.hero.hp = 120;

    const charged = grantInterventionCharge(malformed, malformed.updatedAt + 1_000);
    const healed = useIntervention(malformed, 'heal', malformed.updatedAt + 1_000);

    expect(charged).toBe(malformed);
    expect(healed.ok).toBe(false);
    if (healed.ok) return;
    expect(healed.save).toBe(malformed);
    expect(healed.error).toContain('충전');
    expect(malformed.run.interventionCharges).toBeNaN();
  });

  it.each([
    ['missing hp', undefined, 200],
    ['not-a-number hp', Number.NaN, 200],
    ['infinite hp', Number.POSITIVE_INFINITY, 200],
    ['negative hp', -1, 200],
    ['unsafe hp max', 100, Number.MAX_VALUE],
  ])('rejects healing when hero HP data is %s', (_label, hp, hpMax) => {
    const malformed = createInitialVillageSave(132);
    malformed.run.hero.hp = hp as never;
    malformed.run.hero.hpMax = hpMax;

    const result = useIntervention(malformed, 'heal', malformed.updatedAt + 1_000);

    expect(result.ok).toBe(false);
    expect(result.save).toBe(malformed);
    expect(malformed.run.interventionCharges).toBe(1);
    expect(malformed.run.hero.hp).toBe(hp);
    expect(malformed.run.hero.hpMax).toBe(hpMax);
  });

  it('clamps offline processing to 8 hours and rejects backwards time', () => {
    const initial = createInitialVillageSave(8);
    const future = simulateOfflineProgress(initial, initial.lastProcessedAt + 24 * HOUR);
    expect(future.summary.processedSeconds).toBe(8 * 3600);
    expect(future.summary.wasClamped).toBe(true);

    const backwards = simulateOfflineProgress(future.save, initial.lastProcessedAt - 1);
    expect(backwards.summary.processedSeconds).toBe(0);
    expect(backwards.summary.clockAnomaly).toBe('backwards');
  });

  it('rejects a save whose last write is in the future', () => {
    const initial = createInitialVillageSave(22);
    const futureSave = { ...initial, updatedAt: initial.lastProcessedAt + HOUR };

    const result = simulateOfflineProgress(futureSave, initial.lastProcessedAt + 1_000);

    expect(result.summary.processedSeconds).toBe(0);
    expect(result.summary.clockAnomaly).toBe('future');
    expect(result.save).toBe(futureSave);
  });

  it('rejects a non-finite offline clock without corrupting the save', () => {
    const initial = createInitialVillageSave(25);

    const result = simulateOfflineProgress(initial, Number.NaN);

    expect(result.summary.processedSeconds).toBe(0);
    expect(result.summary.clockAnomaly).toBe('invalid');
    expect(result.save).toBe(initial);
  });

  it('rejects an unsafe offline clock before it can create an invalid save', () => {
    const initial = createInitialVillageSave(27);

    const result = simulateOfflineProgress(initial, Number.MAX_SAFE_INTEGER + 1);

    expect(result.summary.processedSeconds).toBe(0);
    expect(result.summary.clockAnomaly).toBe('invalid');
    expect(result.save).toBe(initial);
  });

  it('normalizes non-finite explicit action timestamps before persisting', () => {
    const initial = createInitialVillageSave(26);
    initial.meta.agents = initial.meta.agents.map((agent) => agent.id === 'blacksmith'
      ? { ...agent, fatigue: 25 }
      : agent);

    const rested = restAgent(initial, 'blacksmith', Number.NaN);
    const started = startFacilityTask(initial, 'temple', Number.POSITIVE_INFINITY);
    const unsafeClockSave = createInitialVillageSave(28);
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
    const initial = createInitialVillageSave(27);
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
    const initial = createInitialVillageSave(29);
    const started = startFacilityTask(initial, 'temple', initial.createdAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.meta.tasks[started.task.id].completesAt = initial.createdAt;

    const result = completeFacilityTasks(started.save, Number.POSITIVE_INFINITY);

    expect(result).toBe(started.save);
    expect(result.meta.tasks[started.task.id]).toBeDefined();
  });

  it('does not settle a task whose persisted completion clock is NaN', () => {
    const initial = createInitialVillageSave(291);
    const started = startFacilityTask(initial, 'temple', initial.createdAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.meta.tasks[started.task.id].completesAt = Number.NaN;
    const beforeCurrencies = { ...started.save.meta.currencies };

    const result = completeFacilityTasks(started.save, started.save.updatedAt + 60_000);

    expect(result).toBe(started.save);
    expect(result.meta.tasks[started.task.id]).toBeDefined();
    expect(result.meta.currencies).toEqual(beforeCurrencies);
  });

  it('does not resolve an expedition whose persisted completion clock is NaN', () => {
    const initial = createInitialVillageSave(292);
    const started = startExpedition(initial, 'sacred_fields', initial.createdAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const expedition = started.save.run.expedition;
    expect(expedition).not.toBeNull();
    if (!expedition) return;
    expedition.completesAt = Number.NaN;
    const beforeCurrencies = { ...started.save.meta.currencies };

    const result = completeFacilityTasks(started.save, started.save.updatedAt + 60_000);

    expect(result).toBe(started.save);
    expect(result.run.expedition).toBe(expedition);
    expect(result.run.lastExpeditionResult).toBeNull();
    expect(result.meta.currencies).toEqual(beforeCurrencies);
  });

  it('does not refund or instantly complete a task whose clock is NaN', () => {
    const initial = createInitialVillageSave(293);
    const started = startFacilityTask(initial, 'temple', initial.createdAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.meta.tasks[started.task.id].completesAt = Number.NaN;
    const beforeCurrencies = { ...started.save.meta.currencies };

    const canceled = cancelFacilityTask(started.save, 'temple', started.save.updatedAt + 60_000);
    const instant = completeFacilityTaskNow(started.save, 'temple', started.save.updatedAt + 60_000);

    expect(canceled.ok).toBe(false);
    expect(canceled.save).toBe(started.save);
    expect(instant.ok).toBe(false);
    expect(instant.save).toBe(started.save);
    expect(started.save.meta.tasks[started.task.id]).toBeDefined();
    expect(started.save.meta.currencies).toEqual(beforeCurrencies);
  });

  it('caps malformed training experience before settlement', () => {
    const initial = createInitialVillageSave(116);
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
    const initial = createInitialVillageSave(117);
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
    const initial = createInitialVillageSave(30);
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
    const initial = createInitialVillageSave(24);
    initial.lastProcessedAt = initial.createdAt + HOUR;
    initial.updatedAt = initial.lastProcessedAt;

    const changed = setVillagePolicy(initial, 'training', initial.createdAt + 1_000);
    expect(changed.updatedAt).toBe(initial.lastProcessedAt);

    const storage = new Map<string, string>();
    const fakeStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    } as unknown as Storage;
    persistVillageSave(changed, fakeStorage);
    expect(loadVillageSave(fakeStorage)).not.toBeNull();
  });

  it('normalizes backwards task and expedition action clocks to the last saved time', () => {
    const staleTaskSave = createInitialVillageSave(31);
    staleTaskSave.lastProcessedAt += HOUR;
    staleTaskSave.updatedAt = staleTaskSave.lastProcessedAt;
    const task = startFacilityTask(staleTaskSave, 'temple', staleTaskSave.createdAt);
    expect(task.ok).toBe(true);
    if (!task.ok) return;
    expect(task.task.startedAt).toBe(staleTaskSave.updatedAt);
    expect(task.task.id).toContain(`${staleTaskSave.updatedAt}`);

    const staleExpeditionSave = createInitialVillageSave(32);
    staleExpeditionSave.lastProcessedAt += HOUR;
    staleExpeditionSave.updatedAt = staleExpeditionSave.lastProcessedAt;
    const expedition = startExpedition(staleExpeditionSave, 'sacred_fields', staleExpeditionSave.createdAt, 'aggression', null);
    expect(expedition.ok).toBe(true);
    if (!expedition.ok) return;
    expect(expedition.save.run.expedition?.startedAt).toBe(staleExpeditionSave.updatedAt);
  });

  it('does not auto-confirm a risky Realm boss during offline processing', () => {
    const initial = createInitialVillageSave(19);
    initial.meta.unlockedRealms.push('deep_forest');
    initial.run.hero.atk = 10_000;
    initial.run.hero.def = 10_000;
    initial.run.hero.defBase = 10_000;
    initial.run.hero.hp = 10_000;
    initial.run.hero.hpMax = 10_000;
    const started = startExpedition(initial, 'deep_forest', initial.lastProcessedAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.run.expedition!.id = 'e2e-victory-4';

    const afterNormal = completeFacilityTasks(started.save, started.save.run.expedition!.completesAt);
    const afterElite = completeFacilityTasks(afterNormal, afterNormal.run.expedition!.completesAt);
    const offline = simulateOfflineProgress(afterElite, afterElite.run.expedition!.completesAt);

    expect(offline.summary.completedExpedition).toBe(false);
    expect(offline.save.run.expedition?.realmId).toBe('deep_forest');
    expect(offline.save.run.expedition?.encounterIndex).toBe(2);
    expect(offline.save.run.expedition?.status).toBe('awaiting_confirmation');

    const replay = simulateOfflineProgress(offline.save, offline.save.lastProcessedAt);
    expect(replay.save).toBe(offline.save);
    expect(replay.summary.completedExpedition).toBe(false);

    const refreshed = completeFacilityTasks(offline.save, offline.save.lastProcessedAt + 1_000);
    expect(refreshed.run.expedition?.status).toBe('awaiting_confirmation');

    const confirmed = confirmPendingExpedition(refreshed, refreshed.lastProcessedAt + 1_000);
    expect(confirmed.run.expedition).toBeNull();
    expect(confirmed.run.lastExpeditionResult?.realmId).toBe('deep_forest');
    expect(confirmed.run.lastExpeditionResult?.outcome).toBe('victory');
    expect(confirmed.meta.unlockedRealms).toEqual(['sacred_fields', 'deep_forest']);
    const blockedUnlock = confirmNextRealmUnlock(confirmed, confirmed.updatedAt + 1_000);
    expect(blockedUnlock).toBe(confirmed);
    const choice = chooseStoryChoice(confirmed, 'protect_flame', confirmed.updatedAt + 1_000);
    expect(choice.ok).toBe(true);
    if (!choice.ok) return;
    expect(choice.save.meta.unlockedRealms).toEqual(['sacred_fields', 'deep_forest', 'underworld']);
    expect(confirmPendingExpedition(confirmed, confirmed.updatedAt + 1_000)).toBe(confirmed);
  });

  it('keeps a risky expedition pending for invalid or premature confirmation clocks', () => {
    const initial = createInitialVillageSave(20);
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

  it('keeps a risky expedition pending when confirmation settlement is malformed', () => {
    const initial = createInitialVillageSave(139);
    initial.meta.unlockedRealms.push('deep_forest');
    const started = startExpedition(initial, 'deep_forest', initial.updatedAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const afterNormal = completeFacilityTasks(started.save, started.save.run.expedition!.completesAt);
    const afterElite = completeFacilityTasks(afterNormal, afterNormal.run.expedition!.completesAt);
    const pending = completeFacilityTasks(afterElite, afterElite.run.expedition!.completesAt, 1, false);
    expect(pending.run.expedition?.status).toBe('awaiting_confirmation');
    pending.meta.currencies.gold = Number.NaN;

    const confirmed = confirmPendingExpedition(pending, pending.updatedAt + 1_000);

    expect(confirmed).toBe(pending);
    expect(pending.run.expedition?.status).toBe('awaiting_confirmation');
  });

  it('requires explicit confirmation before an offline victory unlocks the next Realm', () => {
    const initial = createInitialVillageSave(93);
    const started = startExpedition(initial, 'sacred_fields', initial.createdAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.run.expedition!.id = 'e2e-victory-4';
    started.save.run.expedition!.encounterIndex = 2;
    started.save.run.expedition!.completesAt = started.save.run.expedition!.startedAt;

    const offline = simulateOfflineProgress(started.save, started.save.run.expedition!.completesAt);
    expect(offline.save.run.expedition?.status).toBe('awaiting_confirmation');
    expect(offline.save.run.lastExpeditionResult).toBeNull();
    expect(offline.summary.completedExpedition).toBe(false);
    expect(offline.save.meta.unlockedRealms).toEqual(['sacred_fields']);

    const victory = confirmPendingExpedition(offline.save, offline.save.updatedAt + 1_000);
    expect(victory.run.lastExpeditionResult?.outcome).toBe('victory');
    expect(victory.run.expedition).toBeNull();
    expect(victory.meta.unlockedRealms).toEqual(['sacred_fields']);

    const confirmed = confirmNextRealmUnlock(victory, victory.updatedAt + 1_000);
    expect(confirmed.meta.unlockedRealms).toEqual(['sacred_fields', 'deep_forest']);
    expect(confirmed.meta.sagaEntries[0]?.title).toContain('깊은 숲');
    expect(confirmNextRealmUnlock(confirmed, confirmed.updatedAt + 1_000)).toBe(confirmed);
  });

  it('never unlocks the underworld through the generic confirmation path when its saga log is capped', () => {
    const source = createInitialVillageSave(140);
    source.meta.unlockedRealms.push('deep_forest');
    source.run.lastExpeditionResult = {
      id: 'deep-forest-result-with-evicted-log',
      realmId: 'deep_forest',
      outcome: 'victory',
      completedAt: source.updatedAt,
      reward: { materials: 1 },
      heroPower: 100,
      recommendedPower: 90,
      turns: 3,
      totalDamageDealt: 120,
      totalDamageTaken: 20,
      heroRemainingHp: 80,
      weaknessKR: '없음',
      recommendedFacilityId: 'training',
      recommendedEquipmentId: null,
      retryAfterSeconds: 0,
    };
    source.meta.sagaEntries = Array.from({ length: Village_MAX_SAGA_ENTRIES }, (_, index) => ({
      id: `old-saga-${index}`,
      kind: 'facility' as const,
      createdAt: source.updatedAt - index,
      title: '오래된 기록',
      text: '깊은 숲 승리 기록이 상한에서 밀려난 상태',
    }));

    const confirmed = confirmNextRealmUnlock(source, source.updatedAt + 1_000);

    expect(confirmed).toBe(source);
    expect(source.meta.unlockedRealms).toEqual(['sacred_fields', 'deep_forest']);
  });

  it('keeps a pending Realm record from being lost by starting another expedition', () => {
    const initial = createInitialVillageSave(94);
    const started = startExpedition(initial, 'sacred_fields', initial.createdAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.run.expedition!.id = 'e2e-victory-4';
    started.save.run.expedition!.encounterIndex = 2;
    started.save.run.expedition!.completesAt = started.save.run.expedition!.startedAt;

    const pending = completeFacilityTasks(started.save, started.save.run.expedition!.completesAt, 0.7, false);
    expect(pending.run.expedition?.status).toBe('awaiting_confirmation');
    const victory = confirmPendingExpedition(pending, pending.updatedAt + 1_000);
    expect(victory.run.lastExpeditionResult?.outcome).toBe('victory');
    expect(victory.meta.unlockedRealms).toEqual(['sacred_fields']);

    const retry = startExpedition(victory, 'sacred_fields', victory.updatedAt + 1_000, 'aggression', null);
    expect(retry.ok).toBe(false);
    expect(retry.save).toBe(victory);
    if (retry.ok) return;
    expect(retry.error).toContain('기록');
    expect(victory.run.lastExpeditionResult?.outcome).toBe('victory');
  });

  it('does not unlock a Realm when the confirmation clock is invalid or stale', () => {
    const initial = createInitialVillageSave(95);
    const started = startExpedition(initial, 'sacred_fields', initial.createdAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.run.expedition!.id = 'e2e-victory-clock-guard';
    started.save.run.expedition!.encounterIndex = 2;
    started.save.run.expedition!.completesAt = started.save.run.expedition!.startedAt;

    const pending = completeFacilityTasks(started.save, started.save.run.expedition!.completesAt, 0.7, false);
    expect(pending.run.expedition?.status).toBe('awaiting_confirmation');
    const victory = confirmPendingExpedition(pending, pending.updatedAt + 1_000);
    expect(victory.run.lastExpeditionResult?.outcome).toBe('victory');

    expect(confirmNextRealmUnlock(victory, Number.NaN)).toBe(victory);
    expect(confirmNextRealmUnlock(victory, victory.updatedAt - 1)).toBe(victory);
    expect(victory.meta.unlockedRealms).toEqual(['sacred_fields']);
  });

  it('allows one expedition and resolves it into rewards', () => {
    const initial = createInitialVillageSave(9);
    const started = startExpedition(initial, 'sacred_fields', initial.createdAt, 'aggression', 'guide');
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(started.save.run.expedition?.realmId).toBe('sacred_fields');

    const second = startExpedition(started.save, 'sacred_fields', initial.createdAt, 'aggression', 'guide');
    expect(second.ok).toBe(false);

    const invalidAgent = startExpedition(initial, 'sacred_fields', initial.createdAt, 'aggression', 'blacksmith');
    expect(invalidAgent.ok).toBe(false);

    let completed = started.save;
    while (completed.run.expedition) {
      completed = completeFacilityTasks(completed, completed.run.expedition.completesAt);
    }
    expect(completed.run.expedition).toBeNull();
    expect(completed.meta.sagaEntries[0]?.kind).toBe('expedition');
    expect(completed.meta.sagaEntries[0]).toMatchObject({
      title: '신목 들판 원정 성공',
      text: expect.stringContaining('마을로 돌아왔다'),
    });
    expect(completed.run.lastExpeditionResult).toMatchObject({
      realmId: 'sacred_fields', outcome: 'victory', retryAfterSeconds: 0,
    });
  });

  it('does not assign a fully fatigued guide to a new expedition', () => {
    const initial = createInitialVillageSave(103);
    initial.meta.agents = initial.meta.agents.map((agent) => agent.id === 'guide'
      ? { ...agent, fatigue: 100 }
      : agent);

    const result = startExpedition(initial, 'sacred_fields', initial.createdAt, 'aggression', 'guide');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('피로');
  });

  it('does not reuse task ids after a same-clock completion and restart', () => {
    const initial = createInitialVillageSave(101);
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
    const initial = createInitialVillageSave(102);
    const first = startExpedition(initial, 'sacred_fields', initial.createdAt, 'aggression', null);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const retreated = useIntervention(first.save, 'retreat', initial.createdAt);
    expect(retreated.ok).toBe(true);
    if (!retreated.ok) return;
    const second = startExpedition(retreated.save, 'sacred_fields', initial.createdAt, 'aggression', null);

    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.task.id).not.toBe(first.task.id);
  });

  it('advances a new expedition through normal, elite, and boss encounters', () => {
    const initial = createInitialVillageSave(90);
    const started = startExpedition(initial, 'sacred_fields', initial.createdAt, 'aggression', null);
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

  it('counts only successful staged encounters as cleared after a defeat', () => {
    const initial = createInitialVillageSave(126);
    initial.run.hero.atk = 1;
    initial.run.hero.hp = 1;
    initial.run.hero.hpMax = 1;
    const started = startExpedition(initial, 'sacred_fields', initial.createdAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const completed = completeFacilityTasks(started.save, started.save.run.expedition!.completesAt);

    expect(completed.run.lastExpeditionResult).toMatchObject({ outcome: 'defeat', encountersCleared: 0 });
  });

  it('forecasts target success bands and makes support policy effects visible', () => {
    const atRecommendedPower = createInitialVillageSave(92);
    atRecommendedPower.run.hero.atk = 30;
    const normal = getExpeditionSuccessChance(atRecommendedPower, 'sacred_fields', 0, null);
    const elite = getExpeditionSuccessChance(atRecommendedPower, 'sacred_fields', 1, null);
    const boss = getExpeditionSuccessChance(atRecommendedPower, 'sacred_fields', 2, null);

    expect(getVillageHeroPower(atRecommendedPower)).toBe(120);
    expect(normal).toBeGreaterThanOrEqual(0.9);
    expect(normal).toBeLessThanOrEqual(0.97);
    expect(elite).toBeGreaterThanOrEqual(0.65);
    expect(elite).toBeLessThanOrEqual(0.8);
    expect(boss).toBeGreaterThanOrEqual(0.45);
    expect(boss).toBeLessThanOrEqual(0.65);

    const guide = getExpeditionSuccessChance(atRecommendedPower, 'sacred_fields', 2, 'guide');
    const hoarding = getExpeditionSuccessChance(setVillagePolicy(atRecommendedPower, 'hoarding', atRecommendedPower.createdAt + 1), 'sacred_fields', 2, null);
    const blessedSave = createInitialVillageSave(97);
    blessedSave.run.hero.atk = 30;
    blessedSave.meta.facilities.mudang.level = 3;
    const blessed = getExpeditionSuccessChance(blessedSave, 'sacred_fields', 2, null);
    expect(guide).toBeGreaterThan(boss);
    expect(hoarding).toBeGreaterThan(boss);
    expect(blessed).toBeGreaterThan(boss);
  });

  it('does not forecast a guide bonus when the guide is unavailable', () => {
    const baselineSave = createInitialVillageSave(98);
    baselineSave.run.hero.atk = 30;
    const baseline = getExpeditionSuccessChance(baselineSave, 'sacred_fields', 2, null);

    const tiredSave = createInitialVillageSave(99);
    tiredSave.run.hero.atk = 30;
    tiredSave.meta.agents = tiredSave.meta.agents.map((agent) => agent.id === 'guide'
      ? { ...agent, fatigue: 100 }
      : agent);
    expect(getExpeditionSuccessChance(tiredSave, 'sacred_fields', 2, 'guide')).toBe(baseline);

    const busySave = createInitialVillageSave(100);
    busySave.run.hero.atk = 30;
    busySave.meta.agents = busySave.meta.agents.map((agent) => agent.id === 'guide'
      ? { ...agent, activeTaskId: 'unrelated-task' }
      : agent);
    expect(getExpeditionSuccessChance(busySave, 'sacred_fields', 2, 'guide')).toBe(baseline);

    const activeSave = createInitialVillageSave(101);
    activeSave.run.hero.atk = 30;
    const started = startExpedition(activeSave, 'sacred_fields', activeSave.createdAt, 'aggression', 'guide');
    expect(started.ok).toBe(true);
    if (started.ok) {
      expect(getExpeditionSuccessChance(started.save, 'sacred_fields', 2, 'guide')).toBeGreaterThan(baseline);
    }
  });

  it('keeps an active expedition forecast on the policy chosen at departure', () => {
    const initial = createInitialVillageSave(93);
    const started = startExpedition(initial, 'sacred_fields', initial.createdAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const beforePolicyChange = getExpeditionSuccessChance(started.save, 'sacred_fields', 2, null);
    const changed = setVillagePolicy(started.save, 'hoarding', started.save.updatedAt + 1);
    const afterPolicyChange = getExpeditionSuccessChance(changed, 'sacred_fields', 2, null);

    expect(changed.run.policy).toBe('hoarding');
    expect(changed.run.expedition?.policy).toBe('aggression');
    expect(afterPolicyChange).toBe(beforePolicyChange);
  });

  it('uses the Village hero battle adapter instead of power alone', () => {
    const initial = createInitialVillageSave(11);
    initial.run.hero.atk = 300;
    initial.run.hero.hp = 1;
    const started = startExpedition(initial, 'sacred_fields', initial.createdAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.run.expedition!.encounterIndex = 2;
    started.save.run.expedition!.completesAt = started.save.run.expedition!.startedAt;

    const completed = completeFacilityTasks(started.save, started.save.run.expedition!.completesAt);
    expect(completed.meta.sagaEntries[0]?.title).toBe('신목 들판 원정 중단');
    expect(completed.meta.currencies.gold).toBe(initial.meta.currencies.gold);
    expect(completed.meta.currencies.spirit).toBe(initial.meta.currencies.spirit);
    expect(completed.run.lastExpeditionResult).toMatchObject({
      outcome: 'defeat', recommendedFacilityId: 'recovery', recommendedEquipmentId: 'iron_sword',
    });
  });

  it('recommends the next unlocked blacksmith equipment after a defeat', () => {
    const initial = createInitialVillageSave(124);
    initial.meta.facilities.blacksmith.level = 3;
    initial.run.hero.equipmentIds = ['iron_sword'];
    initial.run.hero.equipmentLevels = { iron_sword: 1 };
    initial.run.hero.hp = 1;
    const started = startExpedition(initial, 'sacred_fields', initial.createdAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.run.expedition!.encounterIndex = 2;
    started.save.run.expedition!.completesAt = started.save.run.expedition!.startedAt;

    const completed = completeFacilityTasks(started.save, started.save.run.expedition!.completesAt);

    expect(completed.run.lastExpeditionResult).toMatchObject({
      outcome: 'defeat', recommendedFacilityId: 'recovery', recommendedEquipmentId: 'guardian_armor',
    });
  });

  it('does not dispatch a defeated hero before recovery', () => {
    const initial = createInitialVillageSave(20);
    initial.run.hero.hp = 0;

    const result = startExpedition(initial, 'sacred_fields', initial.createdAt, 'aggression', null);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('회복');
  });

  it.each([
    ['missing', undefined],
    ['not-a-number', Number.NaN],
    ['infinite', Number.POSITIVE_INFINITY],
    ['unsafe', Number.MAX_VALUE],
  ])('rejects expedition start when hero HP is %s', (_label, hp) => {
    const malformed = createInitialVillageSave(201);
    malformed.run.hero.hp = hp as never;

    const result = startExpedition(malformed, 'sacred_fields', malformed.updatedAt, 'aggression', null);

    expect(result.ok).toBe(false);
    expect(result.save).toBe(malformed);
    expect(malformed.meta.currencies.spirit).toBe(100);
    expect(malformed.run.expedition).toBeNull();
  });

  it('rejuvenates the eternal hero through Village storage with a gold cost and saga entry', () => {
    const initial = createInitialVillageSave(12);
    const result = rejuvenateHero(initial, 5, initial.createdAt + 1_000);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.save.run.hero.age).toBe(12);
    expect(result.save.run.hero.rejuvenationCount).toBe(1);
    expect(result.save.meta.currencies.gold).toBe(50);
    expect(result.save.meta.sagaEntries[0]?.kind).toBe('rejuvenation');
  });

  it.each([
    ['missing', undefined],
    ['fractional', 12.5],
  ])('does not mutate a save when the rejuvenation gold balance is %s', (_label, gold) => {
    const malformed = createInitialVillageSave(721);
    malformed.meta.currencies.gold = gold as never;

    const result = rejuvenateHero(malformed, 5, malformed.updatedAt + 1_000);

    expect(result.ok).toBe(false);
    expect(result.save).toBe(malformed);
    expect(malformed.meta.currencies.gold).toBe(gold);
  });

  it.each([
    ['fractional', 100.5],
    ['infinite', Number.POSITIVE_INFINITY],
  ])('rejects currency-paying actions when the gold balance is %s', (_label, gold) => {
    const malformed = createInitialVillageSave(722);
    malformed.meta.currencies.gold = gold;

    const task = startFacilityTask(malformed, 'blacksmith', malformed.updatedAt, null);
    const upgrade = upgradeFacility(malformed, 'temple', malformed.updatedAt + 1_000);

    expect(task.ok).toBe(false);
    expect(task.save).toBe(malformed);
    expect(upgrade.ok).toBe(false);
    expect(upgrade.save).toBe(malformed);
    expect(malformed.meta.currencies.gold).toBe(gold);
  });

  it('keeps Village hero decisions and battle independent from the legacy cycle controller', () => {
    const save = createInitialVillageSave(10);
    const runtime = createVillageHeroRuntime(save.run.hero);
    expect(runtime.chooseAction({ hp: 1_000, hpMax: 1_000, policy: 'aggression', expeditionAvailable: true })).toBe('expedition');
    expect(runtime.resolveBattle({ heroAtk: 100, heroDef: 20, heroHp: 100, enemyHp: 250, enemyAtk: 25 }).won).toBe(true);
    expect(runtime.rejuvenate(3).yearsReduced).toBe(3);
  });

  it('keeps the hero runtime snapshot valid for an unknown rejuvenation input', () => {
    const save = createInitialVillageSave(111);
    const runtime = createVillageHeroRuntime(save.run.hero);

    const result = runtime.rejuvenate('unknown' as never);

    expect(result.yearsReduced).toBe(0);
    expect(result.cost).toBe(0);
    expect(result.snapshot).toEqual(save.run.hero);
  });

  it('normalizes malformed hero state before applying rejuvenation', () => {
    const save = createInitialVillageSave(120);
    const runtime = createVillageHeroRuntime({
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

  it('keeps rejuvenation action clocks persistable for an extremely old hero', () => {
    const save = createInitialVillageSave(122);
    const runtime = createVillageHeroRuntime({
      ...save.run.hero,
      age: Number.MAX_SAFE_INTEGER,
      actionCount: Number.MAX_SAFE_INTEGER,
    });

    const result = runtime.rejuvenate(5);

    expect(result.snapshot.actionCount).toBe(Number.MAX_SAFE_INTEGER);
    expect(Number.isSafeInteger(result.snapshot.actionCount)).toBe(true);
  });

  it('keeps extreme rejuvenation costs within the persistable integer range', () => {
    const save = createInitialVillageSave(123);
    const runtime = createVillageHeroRuntime({
      ...save.run.hero,
      age: Number.MAX_SAFE_INTEGER,
      actionCount: Number.MAX_SAFE_INTEGER,
    });

    const result = runtime.rejuvenate(Number.MAX_SAFE_INTEGER);

    expect(Number.isSafeInteger(result.cost)).toBe(true);
    expect(result.cost).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('keeps runtime snapshot cloning safe for malformed equipment collections', () => {
    const save = createInitialVillageSave(121);
    const runtime = createVillageHeroRuntime({
      ...save.run.hero,
      equipmentIds: undefined as never,
      equipmentLevels: 'broken' as never,
    });

    expect(runtime.getSnapshot().equipmentIds).toEqual([]);
    expect(runtime.getSnapshot().equipmentLevels).toBeUndefined();
  });

  it('keeps battle results finite for malformed runtime input', () => {
    const save = createInitialVillageSave(113);
    const result = createVillageHeroRuntime(save.run.hero).resolveBattle({
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
    const save = createInitialVillageSave(115);
    const runtime = createVillageHeroRuntime(save.run.hero);
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
    const save = createInitialVillageSave(114);
    save.run.hero.atk = Number.NaN;
    save.run.hero.hp = Number.NaN;

    expect(getVillageHeroPower(save)).toBe(0);
    expect(Number.isFinite(getExpeditionSuccessChance(save, 'sacred_fields', 2, null))).toBe(true);
  });

  it('keeps malformed HP and support stats from poisoning the expedition forecast', () => {
    const malformed = createInitialVillageSave(127);
    malformed.run.hero.atk = 30;
    malformed.run.hero.hp = Number.NaN;
    malformed.meta.facilities.mudang.level = Number.NaN;
    malformed.meta.agents = malformed.meta.agents.map((agent) => agent.id === 'guide'
      ? { ...agent, trust: Number.NaN }
      : agent);

    const safeEquivalent = createInitialVillageSave(128);
    safeEquivalent.run.hero.atk = 30;
    safeEquivalent.run.hero.hp = 0;
    safeEquivalent.meta.agents = safeEquivalent.meta.agents.map((agent) => agent.id === 'guide'
      ? { ...agent, trust: 0 }
      : agent);

    expect(getExpeditionSuccessChance(malformed, 'sacred_fields', 2, 'guide'))
      .toBe(getExpeditionSuccessChance(safeEquivalent, 'sacred_fields', 2, 'guide'));
  });

  it('treats missing hero power fields as zero instead of maximum power', () => {
    const save = createInitialVillageSave(126);
    save.run.hero.atk = undefined as never;
    save.run.hero.def = 10;
    save.run.hero.hpMax = 1_000;

    expect(getVillageHeroPower(save)).toBe(20);
  });

  it('keeps valid combat stats when the hero max HP field is missing', () => {
    const save = createInitialVillageSave(127);
    save.run.hero.atk = 160;
    save.run.hero.def = 10;
    save.run.hero.hpMax = undefined as never;

    expect(getVillageHeroPower(save)).toBe(170);
  });

  it('saturates hero power before it can invalidate a result save', () => {
    const save = createInitialVillageSave(124);
    save.run.hero.atk = Number.MAX_SAFE_INTEGER;
    save.run.hero.def = Number.MAX_SAFE_INTEGER;
    save.run.hero.hpMax = Number.MAX_SAFE_INTEGER;

    expect(getVillageHeroPower(save)).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('saturates hero power when malformed stats overflow during addition', () => {
    const save = createInitialVillageSave(125);
    save.run.hero.atk = Number.MAX_VALUE;
    save.run.hero.def = Number.MAX_VALUE;

    expect(getVillageHeroPower(save)).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('carries V3 hit variance, crits, and defense mitigation into Village battles', () => {
    const critical = createInitialVillageSave(11);
    critical.run.hero.critRateBase = 1;
    const criticalResult = createVillageHeroRuntime(critical.run.hero).resolveBattle({
      heroAtk: 100, heroDef: 20, heroHp: 500, enemyHp: 100, enemyAtk: 25,
    });
    expect(criticalResult.totalDamageDealt).toBeGreaterThan(100);

    const attrition = createVillageHeroRuntime(critical.run.hero).resolveBattle({
      heroAtk: 1, heroDef: 20, heroHp: 500, enemyHp: 1_000, enemyAtk: 25, maxTurns: 2,
    });
    expect(attrition.totalDamageTaken).toBeGreaterThan(10);
  });

  it('turns the sponsor policy and hero condition into a visible next-action decision', () => {
    const initial = createInitialVillageSave(89);
    expect(getHeroNextAction(initial)).toBe('expedition');
    expect(getHeroNextAction(setVillagePolicy(initial, 'training', initial.createdAt + 1_000))).toBe('train');

    const wounded = {
      ...initial,
      run: { ...initial.run, hero: { ...initial.run.hero, hp: 300 } },
    };
    expect(getHeroNextAction(wounded)).toBe('rest');
  });

  it('waits fifteen seconds and then starts exactly one policy-directed action', () => {
    const initial = createInitialVillageSave(890);

    const waiting = advanceHeroAutonomy(initial, initial.updatedAt + 14_999);
    expect(waiting.started).toBe(false);
    expect(waiting.save).toBe(initial);

    const aggression = advanceHeroAutonomy(initial, initial.updatedAt + 15_000);
    expect(aggression.started).toBe(true);
    expect(aggression.save.run.expedition).toMatchObject({
      realmId: 'sacred_fields',
      policy: 'aggression',
      assignedAgentId: null,
    });
    expect(Object.keys(aggression.save.meta.tasks)).toHaveLength(0);

    const hoarding = createInitialVillageSave(891);
    hoarding.run.policy = 'hoarding';
    hoarding.meta.unlockedRealms.push('deep_forest', 'underworld');
    const safest = advanceHeroAutonomy(hoarding, hoarding.updatedAt + 15_000);
    expect(safest.started).toBe(true);
    expect(safest.save.run.expedition?.realmId).toBe('sacred_fields');

    const training = createInitialVillageSave(892);
    training.run.policy = 'training';
    const trained = advanceHeroAutonomy(training, training.updatedAt + 15_000);
    expect(trained.started).toBe(true);
    expect(Object.values(trained.save.meta.tasks)).toHaveLength(1);
    expect(Object.values(trained.save.meta.tasks)[0]?.facilityId).toBe('training');
  });

  it('prioritizes a recovery task when the hero is below thirty-five percent HP', () => {
    const wounded = createInitialVillageSave(893);
    wounded.run.hero.hp = 1;

    const result = advanceHeroAutonomy(wounded, wounded.updatedAt + 15_000);

    expect(result.started).toBe(true);
    expect(Object.values(result.save.meta.tasks)[0]?.facilityId).toBe('recovery');
    expect(result.save.run.expedition).toBeNull();
  });

  it('blocks autonomy while work, results, unlocks, or resources need player confirmation', () => {
    const withWork = createInitialVillageSave(894);
    const task = startFacilityTask(withWork, 'temple', withWork.updatedAt);
    expect(task.ok).toBe(true);
    if (!task.ok) return;
    expect(advanceHeroAutonomy(task.save, task.save.updatedAt + 15_000).started).toBe(false);

    const withResult = createInitialVillageSave(895);
    withResult.run.lastExpeditionResult = {
      id: 'pending-result', realmId: 'sacred_fields', outcome: 'victory', completedAt: withResult.updatedAt,
      reward: {}, heroPower: 120, recommendedPower: 120, turns: 1, totalDamageDealt: 1,
      totalDamageTaken: 0, heroRemainingHp: 1_000, weaknessKR: '없음', recommendedFacilityId: 'blacksmith',
      recommendedEquipmentId: null, retryAfterSeconds: 0,
    };
    expect(advanceHeroAutonomy(withResult, withResult.updatedAt + 15_000).started).toBe(false);

    const withoutCost = createInitialVillageSave(896);
    withoutCost.meta.currencies.spirit = 0;
    expect(advanceHeroAutonomy(withoutCost, withoutCost.updatedAt + 15_000).started).toBe(false);
  });

  it('uses a zero displayed chance when deterministic battle cannot win and separates solo and guide forecasts', () => {
    const impossible = createInitialVillageSave(897);
    impossible.run.hero.atk = 0;
    impossible.run.hero.def = 0;
    impossible.run.hero.hp = 1;

    const blocked = getExpeditionForecast(impossible, 'sacred_fields', 2, null, 'forecast-impossible');
    expect(blocked.battle.won).toBe(false);
    expect(blocked.successChance).toBe(0);
    expect(blocked.soloSuccessChance).toBe(0);
    expect(blocked.guideSuccessChance).toBe(0);

    const ready = createInitialVillageSave(898);
    ready.run.hero.atk = 100;
    const solo = getExpeditionForecast(ready, 'sacred_fields', 2, null, 'forecast-ready');
    const guide = getExpeditionForecast(ready, 'sacred_fields', 2, 'guide', 'forecast-ready');
    expect(solo.battle.won).toBe(true);
    expect(guide.successChance).toBeGreaterThan(solo.successChance);
    expect(guide.soloSuccessChance).toBe(solo.successChance);
  });

  it('updates only the Village audio settings through an isolated save copy', () => {
    const initial = createInitialVillageSave(91);
    const updated = updateVillageSettings(initial, { music: 0, sfx: 0.35, muted: true }, initial.createdAt + 1_000);

    expect(updated.meta.settings).toEqual({ music: 0, sfx: 0.35, muted: true });
    expect(updated.meta.currencies).toEqual(initial.meta.currencies);
    expect(updated.run.hero).toEqual(initial.run.hero);
    expect(initial.meta.settings).toEqual({ music: 0.7, sfx: 0.8, muted: false });
  });

  it('keeps runtime policy and audio settings valid when callers pass unknown values', () => {
    const initial = createInitialVillageSave(106);
    const policy = setVillagePolicy(initial, 'unsafe' as never, initial.updatedAt + 1_000);
    const settings = updateVillageSettings(initial, {
      music: 'broken' as never,
      sfx: Number.NaN,
      muted: 'yes' as never,
    }, initial.updatedAt + 1_000);

    expect(policy).toBe(initial);
    expect(settings.meta.settings).toEqual(initial.meta.settings);
  });

  it('keeps audio settings valid when the settings patch itself is malformed', () => {
    const initial = createInitialVillageSave(130);

    expect(() => updateVillageSettings(initial, null as never, initial.updatedAt + 1_000)).not.toThrow();
    expect(() => updateVillageSettings(initial, [] as never, initial.updatedAt + 1_000)).not.toThrow();
    expect(updateVillageSettings(initial, null as never, initial.updatedAt + 1_000).meta.settings)
      .toEqual(initial.meta.settings);
  });

  it('rejects an unknown expedition policy before charging or dispatching', () => {
    const initial = createInitialVillageSave(107);
    const result = startExpedition(initial, 'sacred_fields', initial.updatedAt + 1_000, 'unsafe' as never, null);

    expect(result.ok).toBe(false);
    expect(result.save).toBe(initial);
    expect(initial.run.expedition).toBeNull();
    expect(initial.meta.currencies).toEqual({ spirit: 100, gold: 100, materials: 12, rift: 0 });
  });

  it('rejects inherited definition keys at public domain boundaries', () => {
    const initial = createInitialVillageSave(113);
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
    const initial = createInitialVillageSave(112);
    const result = startExpedition(initial, 'unknown_realm' as never, initial.updatedAt + 1_000, 'aggression', null);

    expect(result.ok).toBe(false);
    expect(result.save).toBe(initial);
    if (result.ok) return;
    expect(result.error).toContain('알 수 없는 영역');
    expect(initial.run.expedition).toBeNull();
  });

  it('rejects an unknown intervention before consuming a charge or retreating', () => {
    const initial = createInitialVillageSave(108);
    const started = startExpedition(initial, 'sacred_fields', initial.updatedAt + 1_000, 'aggression', null);
    if (!started.ok) throw new Error(started.error);

    const result = useIntervention(started.save, 'teleport' as never, started.save.updatedAt + 1_000);

    expect(result.ok).toBe(false);
    expect(result.save).toBe(started.save);
    expect(started.save.run.expedition).not.toBeNull();
    expect(started.save.run.interventionCharges).toBe(initial.run.interventionCharges);
  });

  it('ignores non-finite, negative, and unknown offline bonus values', () => {
    const initial = createInitialVillageSave(94);
    const updated = grantOfflineResourceBonus(initial, {
      spirit: Number.NaN,
      gold: Number.POSITIVE_INFINITY,
      materials: 3,
      rift: -10,
      unknown: 999,
    } as never, initial.createdAt + 1_000);

    expect(updated.meta.currencies).toEqual({ spirit: 100, gold: 100, materials: 15, rift: 0 });
  });

  it.each([
    ['fractional', 100.5],
    ['not-a-number', Number.NaN],
    ['infinite', Number.POSITIVE_INFINITY],
    ['unsafe', Number.MAX_VALUE],
  ])('does not settle an offline bonus over a malformed %s balance', (_label, gold) => {
    const malformed = createInitialVillageSave(135);
    malformed.meta.currencies.gold = gold;

    const updated = grantOfflineResourceBonus(malformed, { gold: 10 }, malformed.updatedAt + 1_000);

    expect(updated).toBe(malformed);
    expect(malformed.meta.currencies.gold).toBe(gold);
    expect(malformed.updatedAt).toBe(malformed.createdAt);
  });

  it('does not advance the save clock when an offline bonus has no valid gains', () => {
    const initial = createInitialVillageSave(121);
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
    const initial = createInitialVillageSave(109);
    const started = startFacilityTask(initial, 'temple', initial.updatedAt);
    if (!started.ok) throw new Error(started.error);

    started.save.meta.currencies.gold = 1e308;
    started.save.meta.tasks[started.task.id].outputPreview = { gold: 1e308 };
    const completed = completeFacilityTasks(started.save, started.task.completesAt + 1_000);

    expect(Number.isFinite(completed.meta.currencies.gold)).toBe(true);
    expect(completed.meta.currencies.gold).toBe(1e308);
  });

  it.each([
    ['fractional', 100.5],
    ['not-a-number', Number.NaN],
    ['infinite', Number.POSITIVE_INFINITY],
    ['unsafe', Number.MAX_VALUE],
  ])('does not settle a refund over a malformed %s spirit balance', (_label, spirit) => {
    const taskSource = createInitialVillageSave(136);
    const startedTask = startFacilityTask(taskSource, 'recovery', taskSource.updatedAt);
    expect(startedTask.ok).toBe(true);
    if (!startedTask.ok) return;
    startedTask.save.meta.currencies.spirit = spirit;

    const canceled = cancelFacilityTask(startedTask.save, 'recovery', startedTask.save.updatedAt + 1_000);

    const expeditionSource = createInitialVillageSave(137);
    const startedExpedition = startExpedition(expeditionSource, 'sacred_fields', expeditionSource.updatedAt, 'aggression', null);
    expect(startedExpedition.ok).toBe(true);
    if (!startedExpedition.ok) return;
    startedExpedition.save.meta.currencies.spirit = spirit;

    const retreated = useIntervention(startedExpedition.save, 'retreat', startedExpedition.save.updatedAt + 1_000);

    expect(canceled.ok).toBe(false);
    expect(canceled.save).toBe(startedTask.save);
    expect(startedTask.save.meta.tasks[startedTask.task.id]).toBeDefined();
    expect(retreated.ok).toBe(false);
    expect(retreated.save).toBe(startedExpedition.save);
    expect(startedExpedition.save.run.expedition).not.toBeNull();
  });

  it.each([
    ['fractional', 100.5],
    ['not-a-number', Number.NaN],
    ['infinite', Number.POSITIVE_INFINITY],
    ['unsafe', Number.MAX_VALUE],
  ])('does not settle facility output over a malformed %s balance', (_label, spirit) => {
    const malformed = createInitialVillageSave(138);
    const started = startFacilityTask(malformed, 'temple', malformed.updatedAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.meta.currencies.spirit = spirit;

    const completed = completeFacilityTasks(started.save, started.task.completesAt);

    expect(completed).toBe(started.save);
    expect(started.save.meta.currencies.spirit).toBe(spirit);
    expect(started.save.meta.tasks[started.task.id]).toBeDefined();

    const instant = completeFacilityTaskNow(
      started.save,
      'temple',
      started.task.completesAt + 1_000,
    );
    expect(instant.ok).toBe(false);
    expect(instant.save).toBe(started.save);
    expect(started.save.meta.tasks[started.task.id]).toBeDefined();
  });

  it.each([
    ['fractional', 100.5],
    ['not-a-number', Number.NaN],
    ['infinite', Number.POSITIVE_INFINITY],
    ['unsafe', Number.MAX_VALUE],
  ])('does not settle an expedition reward over a malformed %s balance', (_label, gold) => {
    const malformed = createInitialVillageSave(139);
    const started = startExpedition(malformed, 'sacred_fields', malformed.updatedAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.run.expedition!.id = 'e2e-victory-4';
    started.save.run.expedition!.encounterIndex = 2;
    started.save.run.expedition!.completesAt = started.save.run.expedition!.startedAt;
    started.save.meta.currencies.gold = gold;

    const settled = completeFacilityTasks(started.save, started.save.run.expedition!.completesAt);

    expect(settled).toBe(started.save);
    expect(started.save.meta.currencies.gold).toBe(gold);
    expect(started.save.run.expedition).not.toBeNull();
  });

  it('saturates a currency bonus at the persistable ceiling', () => {
    const nearLimit = createInitialVillageSave(122);
    nearLimit.meta.currencies.gold = Number.MAX_SAFE_INTEGER - 1;

    const updated = grantOfflineResourceBonus(nearLimit, { gold: 10 }, nearLimit.updatedAt + 1_000);

    expect(updated.meta.currencies.gold).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('saturates hero action history at the persistable ceiling', () => {
    const nearLimit = createInitialVillageSave(123);
    nearLimit.run.hero.actionCount = Number.MAX_SAFE_INTEGER;
    nearLimit.run.hero.age = HeroLifecycle.ageFromActions(Number.MAX_SAFE_INTEGER);

    const advanced = advanceHeroActions(nearLimit, 1, nearLimit.updatedAt + 1_000);

    expect(advanced.run.hero.actionCount).toBe(Number.MAX_SAFE_INTEGER);
    expect(Number.isSafeInteger(advanced.run.hero.actionCount)).toBe(true);
  });

  it('does not upgrade a facility beyond the persistable level ceiling', () => {
    const capped = createInitialVillageSave(120);
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
    const initial = createInitialVillageSave(96);
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
    const initial = createInitialVillageSave(124);
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
    const initial = createInitialVillageSave(125);
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

    const startedExpedition = startExpedition(initial, 'sacred_fields', initial.updatedAt, 'aggression', null);
    expect(startedExpedition.ok).toBe(true);
    if (!startedExpedition.ok) return;
    const pending = startedExpedition.save.run.expedition!;
    pending.status = 'awaiting_confirmation';
    pending.encounterIndex = 2;
    pending.completesAt = startedExpedition.save.updatedAt;
    expect(confirmPendingExpedition(startedExpedition.save, unsafeClock)).toBe(startedExpedition.save);
  });

  it('does not schedule work past the persistable clock ceiling', () => {
    const initial = createInitialVillageSave(126);
    initial.lastProcessedAt = Number.MAX_SAFE_INTEGER;
    initial.updatedAt = Number.MAX_SAFE_INTEGER;

    const task = startFacilityTask(initial, 'temple', initial.updatedAt, null);
    const expedition = startExpedition(initial, 'sacred_fields', initial.updatedAt, 'aggression', null);

    expect(task.ok).toBe(false);
    expect(task.save).toBe(initial);
    expect(expedition.ok).toBe(false);
    expect(expedition.save).toBe(initial);
  });

  it('does not overflow the clock when a staged expedition reaches the next encounter', () => {
    const initial = createInitialVillageSave(127);
    const started = startExpedition(initial, 'sacred_fields', initial.updatedAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const expedition = started.save.run.expedition;
    if (!expedition) throw new Error('expedition was not started');
    expedition.id = 'staged-clock-overflow';
    expedition.startedAt = Number.MAX_SAFE_INTEGER - 1_000;
    expedition.completesAt = Number.MAX_SAFE_INTEGER - 1;
    started.save.run.hero.atk = Number.MAX_SAFE_INTEGER;
    started.save.run.hero.def = Number.MAX_SAFE_INTEGER;
    started.save.run.hero.hp = Number.MAX_SAFE_INTEGER;
    started.save.run.hero.hpMax = Number.MAX_SAFE_INTEGER;

    const settled = completeFacilityTasks(started.save, expedition.completesAt);
    const storage = new Map<string, string>();
    const fakeStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    } as unknown as Storage;

    expect(settled.run.expedition).toMatchObject({
      encounterIndex: 0,
      startedAt: Number.MAX_SAFE_INTEGER - 1_000,
      completesAt: Number.MAX_SAFE_INTEGER - 1,
    });
    expect(persistVillageSave(settled, fakeStorage)).toBe(true);
    expect(loadVillageSave(fakeStorage)).not.toBeNull();
  });

  it('saturates malformed expedition totals before writing a result save', () => {
    const initial = createInitialVillageSave(128);
    const started = startExpedition(initial, 'sacred_fields', initial.updatedAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const expedition = started.save.run.expedition;
    if (!expedition) throw new Error('expedition was not started');
    expedition.id = 'malformed-expedition-totals';
    expedition.encounterIndex = 2;
    expedition.startedAt = started.save.updatedAt;
    expedition.completesAt = started.save.updatedAt;
    expedition.encountersCleared = Number.MAX_VALUE;
    expedition.totalTurns = Number.MAX_VALUE;
    expedition.totalDamageDealt = Number.MAX_VALUE;
    expedition.totalDamageTaken = Number.MAX_VALUE;

    const settled = completeFacilityTasks(started.save, expedition.completesAt);
    const storage = new Map<string, string>();
    const fakeStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    } as unknown as Storage;
    const result = settled.run.lastExpeditionResult;

    expect(result).not.toBeNull();
    expect(result?.encountersCleared).toBe(3);
    expect(result?.turns).toBe(Number.MAX_SAFE_INTEGER);
    expect(result?.totalDamageDealt).toBe(Number.MAX_SAFE_INTEGER);
    expect(result?.totalDamageTaken).toBe(Number.MAX_SAFE_INTEGER);
    expect(persistVillageSave(settled, fakeStorage)).toBe(true);
    expect(loadVillageSave(fakeStorage)).not.toBeNull();
  });

  it('saturates malformed expedition rewards before writing a result save', () => {
    const initial = createInitialVillageSave(129);
    const started = startExpedition(initial, 'sacred_fields', initial.updatedAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const expedition = started.save.run.expedition;
    if (!expedition) throw new Error('expedition was not started');
    expedition.id = 'e2e-victory-clock-guard';
    expedition.encounterIndex = 2;
    expedition.completesAt = expedition.startedAt;

    const realm = REALM_DEFINITIONS.sacred_fields;
    const originalReward = realm.reward;
    realm.reward = { gold: Number.MAX_VALUE };
    try {
      const settled = completeFacilityTasks(started.save, expedition.completesAt);
      const storage = new Map<string, string>();
      const fakeStorage = {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      } as unknown as Storage;

      expect(settled.run.lastExpeditionResult?.outcome).toBe('victory');
      expect(settled.run.lastExpeditionResult?.reward.gold).toBe(Number.MAX_SAFE_INTEGER);
      expect(persistVillageSave(settled, fakeStorage)).toBe(true);
      expect(loadVillageSave(fakeStorage)).not.toBeNull();
    } finally {
      realm.reward = originalReward;
    }
  });

  it('does not mutate a full intervention reserve', () => {
    const full = createInitialVillageSave(97);
    full.run.interventionCharges = 3;

    expect(grantInterventionCharge(full, full.updatedAt + 1_000)).toBe(full);
  });

  it('records one deterministic realm entrance and victory beat for each realm', () => {
    const initial = createInitialVillageSave(130);
    const started = startExpedition(initial, 'sacred_fields', initial.updatedAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(started.save.meta.sagaEntries.some((entry) => entry.id === 'saga-realm-intro-sacred_fields')).toBe(true);

    started.save.run.hero.atk = 10_000;
    started.save.run.hero.def = 10_000;
    started.save.run.hero.defBase = 10_000;
    started.save.run.hero.hp = started.save.run.hero.hpMax;
    started.save.run.expedition!.encounterIndex = 2;
    started.save.run.expedition!.completesAt = started.save.run.expedition!.startedAt;
    const completed = completeFacilityTasks(started.save, started.save.run.expedition!.completesAt);

    expect(completed.meta.sagaEntries.some((entry) => entry.id === 'saga-realm-victory-sacred_fields')).toBe(true);
    expect(completed.meta.sagaEntries.filter((entry) => entry.id === 'saga-realm-intro-sacred_fields')).toHaveLength(1);
    expect(completed.meta.sagaEntries.filter((entry) => entry.id === 'saga-realm-victory-sacred_fields')).toHaveLength(1);
  });

  it('records the underworld epilogue once while allowing another expedition afterward', () => {
    const initial = createInitialVillageSave(131);
    initial.meta.unlockedRealms.push('deep_forest', 'underworld');
    initial.run.hero.atk = 10_000;
    initial.run.hero.def = 10_000;
    initial.run.hero.defBase = 10_000;
    initial.run.hero.hp = initial.run.hero.hpMax;

    const first = startExpedition(initial, 'underworld', initial.updatedAt, 'aggression', null);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    first.save.run.expedition!.encounterIndex = 2;
    first.save.run.expedition!.completesAt = first.save.run.expedition!.startedAt;
    const firstCompleted = completeFacilityTasks(first.save, first.save.run.expedition!.completesAt);
    expect(firstCompleted.meta.sagaEntries.filter((entry) => entry.id === 'saga-epilogue-first-journey')).toHaveLength(1);

    const second = startExpedition(firstCompleted, 'underworld', firstCompleted.updatedAt + 1_000, 'aggression', null);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    second.save.run.expedition!.encounterIndex = 2;
    second.save.run.expedition!.completesAt = second.save.run.expedition!.startedAt;
    const secondCompleted = completeFacilityTasks(second.save, second.save.run.expedition!.completesAt);
    expect(secondCompleted.meta.sagaEntries.filter((entry) => entry.id === 'saga-epilogue-first-journey')).toHaveLength(1);
  });

  it('records the first trust-50 relationship beat once per agent', () => {
    const initial = createInitialVillageSave(132);
    const mudang = initial.meta.agents.find((agent) => agent.id === 'mudang');
    if (!mudang) throw new Error('mudang fixture missing');
    mudang.trust = 49;

    const first = startFacilityTask(initial, 'mudang', initial.updatedAt, 'mudang');
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const firstCompleted = completeFacilityTasks(first.save, first.task.completesAt);
    expect(firstCompleted.meta.agents.find((agent) => agent.id === 'mudang')?.trust).toBe(50);
    expect(firstCompleted.meta.sagaEntries.filter((entry) => entry.id === 'saga-agent-trust-mudang-50')).toHaveLength(1);

    const second = startFacilityTask(firstCompleted, 'mudang', firstCompleted.updatedAt + 1_000, 'mudang');
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    const secondCompleted = completeFacilityTasks(second.save, second.task.completesAt);
    expect(secondCompleted.meta.sagaEntries.filter((entry) => entry.id === 'saga-agent-trust-mudang-50')).toHaveLength(1);
  });

  it('updates guide level and records the trust-50 milestone once after expedition settlement', () => {
    const initial = createInitialVillageSave(133);
    initial.run.hero.atk = 10_000;
    initial.run.hero.def = 10_000;
    initial.run.hero.defBase = 10_000;
    initial.run.hero.hp = initial.run.hero.hpMax;
    const guide = initial.meta.agents.find((agent) => agent.id === 'guide');
    if (!guide) throw new Error('guide fixture missing');
    guide.trust = 49;
    guide.level = 1;

    const first = startExpedition(initial, 'sacred_fields', initial.updatedAt, 'aggression', 'guide');
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    first.save.run.expedition!.encounterIndex = 2;
    first.save.run.expedition!.completesAt = first.save.run.expedition!.startedAt;
    const firstCompleted = completeFacilityTasks(first.save, first.save.run.expedition!.completesAt);

    expect(firstCompleted.meta.agents.find((agent) => agent.id === 'guide')).toMatchObject({
      trust: 51,
      level: 2,
    });
    expect(firstCompleted.meta.sagaEntries.filter((entry) => entry.id === 'saga-agent-trust-guide-50')).toHaveLength(1);

    const second = startExpedition(firstCompleted, 'sacred_fields', firstCompleted.updatedAt + 1_000, 'aggression', 'guide');
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    second.save.run.expedition!.encounterIndex = 2;
    second.save.run.expedition!.completesAt = second.save.run.expedition!.startedAt;
    const secondCompleted = completeFacilityTasks(second.save, second.save.run.expedition!.completesAt);
    expect(secondCompleted.meta.sagaEntries.filter((entry) => entry.id === 'saga-agent-trust-guide-50')).toHaveLength(1);
  });
});
