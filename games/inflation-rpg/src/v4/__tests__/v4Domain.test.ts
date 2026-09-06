import { describe, expect, it, vi } from 'vitest';
import type { HeroSnapshot } from '../../hero/HeroEntity';
import {
  createInitialV4Save,
  importV3HeroSnapshot,
  migrateV3HeroSnapshot,
  simulateOfflineProgress,
} from '../save';
import {
  cancelFacilityTask,
  completeFacilityTasks,
  startExpedition,
  startFacilityTask,
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

  it('keeps V4 hero decisions and battle independent from the V3 cycle controller', () => {
    const save = createInitialV4Save(10);
    const runtime = createV4HeroRuntime(save.run.hero);
    expect(runtime.chooseAction({ hp: 1_000, hpMax: 1_000, policy: 'aggression', expeditionAvailable: true })).toBe('expedition');
    expect(runtime.resolveBattle({ heroAtk: 100, heroDef: 20, heroHp: 100, enemyHp: 250, enemyAtk: 25 }).won).toBe(true);
    expect(runtime.rejuvenate(3).yearsReduced).toBe(3);
  });
});
