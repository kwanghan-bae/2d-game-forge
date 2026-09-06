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
  grantInterventionCharge,
  grantOfflineResourceBonus,
  rejuvenateHero,
  startExpedition,
  startFacilityTask,
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
    expect(canceled.save.meta.currencies).toEqual(initial.meta.currencies);
    expect(canceled.save.meta.facilities.blacksmith.activeTaskId).toBeNull();
    expect(canceled.save.meta.tasks).toEqual({});
    expect(canceled.save.meta.agents.find((agent) => agent.id === 'blacksmith')?.activeTaskId).toBeNull();
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
