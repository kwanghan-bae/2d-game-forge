import { describe, expect, it, vi } from 'vitest';
import type { HeroSnapshot } from '../../hero/HeroEntity';
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
  grantInterventionCharge,
  grantOfflineResourceBonus,
  rejuvenateHero,
  restAgent,
  confirmPendingExpedition,
  startExpedition,
  startFacilityTask,
  upgradeFacility,
  useIntervention,
} from '../domain';
import { createV4HeroRuntime } from '../heroRuntime';

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
  });

  it('keeps gameplay alive when local persistence is unavailable', () => {
    const brokenStorage = {
      setItem: () => { throw new Error('quota'); },
    } as unknown as Storage;

    expect(() => persistV4Save(createInitialV4Save(15), brokenStorage)).not.toThrow();
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

    const imported = importV3HeroSnapshot(createInitialV4Save(1), source, 1234);
    expect(imported.run.hero.name).toBe('홍길동');
    expect(imported.meta.sagaEntries[0]?.title).toBe('V3 영웅 가져오기');
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
    expect(completed.run.hero.hpMax).toBeGreaterThan(initial.run.hero.hpMax);
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

  it('does not auto-confirm a risky Realm boss during offline processing', () => {
    const initial = createInitialV4Save(19);
    initial.meta.unlockedRealms.push('deep_forest');
    const started = startExpedition(initial, 'deep_forest', initial.lastProcessedAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const offline = simulateOfflineProgress(started.save, started.save.run.expedition!.completesAt);

    expect(offline.summary.completedExpedition).toBe(false);
    expect(offline.save.run.expedition?.realmId).toBe('deep_forest');
    expect(offline.save.run.expedition?.status).toBe('awaiting_confirmation');

    const refreshed = completeFacilityTasks(offline.save, offline.save.lastProcessedAt + 1_000);
    expect(refreshed.run.expedition?.status).toBe('awaiting_confirmation');

    const confirmed = confirmPendingExpedition(refreshed, refreshed.lastProcessedAt + 1_000);
    expect(confirmed.run.expedition).toBeNull();
    expect(confirmed.run.lastExpeditionResult?.realmId).toBe('deep_forest');
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

    const completed = completeFacilityTasks(started.save, started.save.run.expedition!.completesAt);
    expect(completed.run.expedition).toBeNull();
    expect(completed.meta.sagaEntries[0]?.kind).toBe('expedition');
    expect(completed.run.lastExpeditionResult).toMatchObject({
      realmId: 'joseon_plains', outcome: 'victory', retryAfterSeconds: 0,
    });
  });

  it('uses the V4 hero battle adapter instead of power alone', () => {
    const initial = createInitialV4Save(11);
    initial.run.hero.atk = 300;
    initial.run.hero.hp = 1;
    const started = startExpedition(initial, 'joseon_plains', initial.createdAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const completed = completeFacilityTasks(started.save, started.save.run.expedition!.completesAt);
    expect(completed.meta.sagaEntries[0]?.title).toBe('조선 평야 원정 중단');
    expect(completed.meta.currencies.gold).toBe(initial.meta.currencies.gold);
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
});
