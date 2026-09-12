import {
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { HeroLifecycle } from '../../../hero/HeroLifecycle';
import { createInitialVillageSave } from '../../save';
import {
  advanceHeroActions,
  advanceHeroAutonomy,
  getHeroNextAction,
} from '../hero/autonomy';
import { getVillageHeroPower, rejuvenateHero } from '../hero/progression';
import { startFacilityTask } from '../facility/tasks';
import { setVillagePolicy } from '../settings/commands';
import { createVillageHeroRuntime } from '../../heroRuntime';

beforeAll(() => {
  vi.setSystemTime(new Date('2026-09-06T00:00:00.000Z'));
});

describe('Village hero domain', () => {
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

  it('keeps Village hero decisions and battle independent from the retired cycle controller', () => {
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
    expect(runtime.getSnapshot().equipmentLevels).toEqual({});
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

  it('carries hit variance, crits, and defense mitigation into Village battles', () => {
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
      successChance: 0.9, encountersCleared: 3, totalEncounterCount: 3,
    };
    expect(advanceHeroAutonomy(withResult, withResult.updatedAt + 15_000).started).toBe(false);

    const withoutCost = createInitialVillageSave(896);
    withoutCost.meta.currencies.spirit = 0;
    expect(advanceHeroAutonomy(withoutCost, withoutCost.updatedAt + 15_000).started).toBe(false);
  });

  it('saturates hero action history at the persistable ceiling', () => {
    const nearLimit = createInitialVillageSave(123);
    nearLimit.run.hero.actionCount = Number.MAX_SAFE_INTEGER;
    nearLimit.run.hero.age = HeroLifecycle.ageFromActions(Number.MAX_SAFE_INTEGER);

    const advanced = advanceHeroActions(nearLimit, 1, nearLimit.updatedAt + 1_000);

    expect(advanced.run.hero.actionCount).toBe(Number.MAX_SAFE_INTEGER);
    expect(Number.isSafeInteger(advanced.run.hero.actionCount)).toBe(true);
  });
});
