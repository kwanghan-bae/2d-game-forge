import { describe, expect, it, vi } from 'vitest';
import {
  createInitialVillageSave,
  loadVillageSave,
  persistVillageSave,
  simulateOfflineProgress,
} from '../save';
import {
  completeFacilityTasks,
  setVillagePolicy,
  startExpedition,
  startFacilityTask,
} from '../domain';
import { Village_MAX_SAGA_ENTRIES } from '../types';

const HOUR = 60 * 60 * 1000;

describe('Village save and domain façade', () => {
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

    const { lastExpeditionResult: _removedResult, ...withoutCurrentResult } = save.run;
    void _removedResult;
    storage.set('shin-ui-eternal-sponsor-save-v2', JSON.stringify({ ...save, run: withoutCurrentResult }));
    expect(loadVillageSave(fakeStorage)).toBeNull();

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
});
