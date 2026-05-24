import { describe, it, expect, beforeEach } from 'vitest';
import { useCycleStoreV2 } from '../cycleSliceV2';
import { useGameStore } from '../../store/gameStore';

function seedMeta(sponsorGold: number, atkBaseBonus = 0, hpBaseBonus = 0): void {
  useGameStore.setState(s => ({
    ...s,
    meta: { ...s.meta, sponsorGold, atkBaseBonus, hpBaseBonus },
  }));
}

describe('cycleSliceV2', () => {
  beforeEach(() => useCycleStoreV2.getState().reset());

  it('starts in idle', () => {
    expect(useCycleStoreV2.getState().status).toBe('idle');
    expect(useCycleStoreV2.getState().controller).toBeNull();
  });

  it('start transitions to running with controller', () => {
    useCycleStoreV2.getState().start({
      seed: 42,
      traits: [],
      heroHpMax: 100,
      heroAtkBase: 100,
    });
    expect(useCycleStoreV2.getState().status).toBe('running');
    expect(useCycleStoreV2.getState().controller).not.toBeNull();
  });

  it('endCycle finalizes saga and persists', () => {
    useCycleStoreV2.getState().start({
      seed: 42, traits: [], heroHpMax: 100, heroAtkBase: 100000,
    });
    // force end by exhausting
    for (let i = 0; i < 10; i++) {
      useCycleStoreV2.getState().controller!.handleArrival('enemy', `e${i}`);
    }
    useCycleStoreV2.getState().endCycle();
    expect(useCycleStoreV2.getState().status).toBe('ended');
    expect(useCycleStoreV2.getState().lastSaga).not.toBeNull();
  });

  it('reset clears everything', () => {
    useCycleStoreV2.getState().start({ seed: 1, traits: [], heroHpMax: 100, heroAtkBase: 100 });
    useCycleStoreV2.getState().reset();
    expect(useCycleStoreV2.getState().status).toBe('idle');
    expect(useCycleStoreV2.getState().controller).toBeNull();
    expect(useCycleStoreV2.getState().lastSaga).toBeNull();
  });

  // V1c-1 — auto-spend on endCycle so meta bonuses actually grow.
  describe('V1c-1 sponsorGold auto-spend', () => {
    it('endCycle spends accrued gold via balanced strategy', () => {
      seedMeta(100, 0, 0);
      useCycleStoreV2.getState().start({
        seed: 1, traits: [], heroHpMax: 100, heroAtkBase: 100,
      });
      useCycleStoreV2.getState().endCycle();
      const meta = useGameStore.getState().meta;
      // Initial costs: atk=50, hp=30. With 100 + earned, balanced buys
      // atk first, then hp. Expect both bonuses to land at >= 1.
      expect(meta.atkBaseBonus).toBeGreaterThanOrEqual(1);
      expect(meta.hpBaseBonus).toBeGreaterThanOrEqual(1);
      expect(meta.sponsorGold).toBeLessThan(100); // spend happened
    });

    it('does not regress bonuses when there is not enough gold', () => {
      seedMeta(5, 2, 3);
      useCycleStoreV2.getState().start({
        seed: 1, traits: [], heroHpMax: 100, heroAtkBase: 100,
      });
      useCycleStoreV2.getState().endCycle();
      const meta = useGameStore.getState().meta;
      expect(meta.atkBaseBonus).toBeGreaterThanOrEqual(2);
      expect(meta.hpBaseBonus).toBeGreaterThanOrEqual(3);
    });
  });

  // Cycle-5 F3 — exit_lost ('무위') cause distinguished from '자연사'.
  // OverworldRunner forwards an optional cause from the `cycle_ended` event;
  // endCycle pushes it into the controller before finalize so the resulting
  // saga records the real reason.
  describe('Cycle-5 F3 — endCycle accepts optional cause', () => {
    it("forwards '무위' from cycle_ended payload to saga.hero.cause", () => {
      useCycleStoreV2.getState().start({
        seed: 1, traits: [], heroHpMax: 100, heroAtkBase: 100,
      });
      useCycleStoreV2.getState().endCycle('무위');
      const saga = useCycleStoreV2.getState().lastSaga!;
      expect(saga.hero.cause).toBe('무위');
    });

    it("defaults to '자연사' when no cause supplied (regression)", () => {
      useCycleStoreV2.getState().start({
        seed: 1, traits: [], heroHpMax: 100, heroAtkBase: 100,
      });
      useCycleStoreV2.getState().endCycle();
      const saga = useCycleStoreV2.getState().lastSaga!;
      expect(saga.hero.cause).toBe('자연사');
    });
  });

  // Cycle-5 F1 — stale realm bug. endCycle MUST reset run.currentRealmId to
  // 'base' so the next cycle's hero (which spawns at base village col 1) is
  // not pathfinder-locked out by the previous realm's columnBounds.
  describe('Cycle-5 F1 — endCycle resets run.currentRealmId + npcs', () => {
    it('resets currentRealmId to base when previous run was in sea realm', () => {
      useGameStore.setState(s => ({
        ...s,
        run: {
          ...s.run,
          currentRealmId: 'sea',
          npcs: [
            {
              instanceId: 'n1',
              kind: 'rival',
              nameKR: 'stub',
              emoji: 'X',
              age: 20,
              ageRate: 1,
              isAlive: true,
              bornChapter: '청년기',
              relationship: 0,
              zoneRealmId: 'sea',
            } satisfies import('../../types').NpcEntity,
          ],
        },
      }));
      useCycleStoreV2.getState().start({
        seed: 1, traits: [], heroHpMax: 100, heroAtkBase: 100,
      });
      useCycleStoreV2.getState().endCycle();
      const run = useGameStore.getState().run;
      expect(run.currentRealmId).toBe('base');
      expect(run.npcs).toHaveLength(0);
    });
  });

  describe('rejuvenateHero action', () => {
    it('decreases hero age, spends light, increments rejuvenationCount', () => {
      useGameStore.setState(s => ({ ...s, meta: { ...s.meta, light: 1000 } }));
      const store = useCycleStoreV2.getState();
      store.start({ seed: 42, traits: [], heroHpMax: 100, heroAtkBase: 100 });
      const ctrl = useCycleStoreV2.getState().controller!;
      const hero = ctrl.getHero();
      for (let i = 0; i < 200; i++) hero.tickAge();
      const ageBefore = hero.age;
      const lightBefore = useGameStore.getState().meta.light ?? 0;
      useCycleStoreV2.getState().rejuvenateHero(5);
      expect(hero.age).toBeLessThan(ageBefore);
      expect(hero.rejuvenationCount).toBe(1);
      expect(useGameStore.getState().meta.light).toBeLessThan(lightBefore);
    });

    it('no-op when meta.light < cost', () => {
      useGameStore.setState(s => ({ ...s, meta: { ...s.meta, light: 0 } }));
      const store = useCycleStoreV2.getState();
      store.start({ seed: 42, traits: [], heroHpMax: 100, heroAtkBase: 100 });
      const ctrl = useCycleStoreV2.getState().controller!;
      const hero = ctrl.getHero();
      for (let i = 0; i < 200; i++) hero.tickAge();
      const ageBefore = hero.age;
      useCycleStoreV2.getState().rejuvenateHero(5);
      expect(hero.age).toBe(ageBefore);
      expect(hero.rejuvenationCount).toBe(0);
    });
  });

  describe('rejuvenateHero with discount (V3-C)', () => {
    beforeEach(() => {
      useGameStore.setState(s => ({
        ...s,
        meta: { ...s.meta, light: 10000, buffLevels: {} },
      }));
      useCycleStoreV2.getState().reset();
    });

    it('Lv 0 discount → full cost (no change, regression)', () => {
      useCycleStoreV2.getState().start({
        seed: 42, traits: [], heroHpMax: 100, heroAtkBase: 100,
      });
      const ctrl = useCycleStoreV2.getState().controller!;
      const hero = ctrl.getHero();
      for (let i = 0; i < 200; i++) hero.tickAge();
      const baseCost = (hero.age - 5) * 10;
      const lightBefore = useGameStore.getState().meta.light ?? 0;
      useCycleStoreV2.getState().rejuvenateHero(5);
      expect(useGameStore.getState().meta.light).toBe(lightBefore - baseCost);
    });

    it('Lv 5 discount (0.25) → ceil(baseCost × 0.75)', () => {
      useGameStore.setState(s => ({
        ...s,
        meta: { ...s.meta, light: 10000, buffLevels: { rejuv_discount: 5 } },
      }));
      useCycleStoreV2.getState().start({
        seed: 42, traits: [], heroHpMax: 100, heroAtkBase: 100,
      });
      const ctrl = useCycleStoreV2.getState().controller!;
      const hero = ctrl.getHero();
      for (let i = 0; i < 200; i++) hero.tickAge();
      const baseCost = (hero.age - 5) * 10;
      const expectedCost = Math.ceil(baseCost * 0.75);
      const lightBefore = useGameStore.getState().meta.light ?? 0;
      useCycleStoreV2.getState().rejuvenateHero(5);
      expect(useGameStore.getState().meta.light).toBe(lightBefore - expectedCost);
    });
  });

  // Cycle-15 — realm rotation. start() reads unlockedRealms + sagaHistory.length
  // to pick the cycle's starting realm; hero.gridX is moved in lockstep.
  describe('Cycle-15 — realm rotation on start()', () => {
    beforeEach(() => {
      // Reset to a clean meta with only base unlocked + empty saga.
      useGameStore.setState(s => ({
        ...s,
        meta: { ...s.meta, unlockedRealms: ['base'], sagaHistory: [], light: 0 },
        run: { ...s.run, currentRealmId: 'base', heroSnapshot: null, npcs: [] },
      }));
      useCycleStoreV2.getState().reset();
    });

    it('single unlocked → starts in base, hero.gridX = 1', () => {
      useCycleStoreV2.getState().start({
        seed: 42, traits: [], heroHpMax: 100, heroAtkBase: 100,
      });
      const ctrl = useCycleStoreV2.getState().controller!;
      expect(ctrl.getCurrentRealmId()).toBe('base');
      expect(ctrl.getHero().gridX).toBe(1);
      expect(useGameStore.getState().run.currentRealmId).toBe('base');
    });

    it('two unlocked + cycleNumber=1 → rotates to sea, hero.gridX = 21', () => {
      useGameStore.setState(s => ({
        ...s,
        meta: {
          ...s.meta,
          unlockedRealms: ['base', 'sea'],
          sagaHistory: [{ cycleId: 'c0' } as never],  // length=1 → idx 1 → 'sea'
        },
      }));
      useCycleStoreV2.getState().start({
        seed: 42, traits: [], heroHpMax: 100, heroAtkBase: 100,
      });
      const ctrl = useCycleStoreV2.getState().controller!;
      expect(ctrl.getCurrentRealmId()).toBe('sea');
      expect(ctrl.getHero().gridX).toBe(21);  // sea.columnRange[0]=20 + 1
      expect(useGameStore.getState().run.currentRealmId).toBe('sea');
    });

    it('heroSnapshot resume preserves stored realm (no rotation)', () => {
      // Create a real snapshot by starting a cycle, then resuming.
      useCycleStoreV2.getState().start({
        seed: 42, traits: [], heroHpMax: 100, heroAtkBase: 100,
      });
      const ctrl0 = useCycleStoreV2.getState().controller!;
      const hero0 = ctrl0.getHero();
      hero0.gridX = 30; hero0.gridY = 6;
      const snapshot = hero0.serialize(42);
      // Reset + seed resume scenario: rotation would pick volcano (idx 2),
      // but a non-null heroSnapshot must short-circuit rotation.
      useCycleStoreV2.getState().reset();
      useGameStore.setState(s => ({
        ...s,
        meta: {
          ...s.meta,
          unlockedRealms: ['base', 'sea', 'volcano'],
          sagaHistory: [{ cycleId: 'c0' } as never, { cycleId: 'c1' } as never],
        },
        run: { ...s.run, currentRealmId: 'sea' },
      }));
      useCycleStoreV2.getState().start({
        seed: 42, traits: [], heroHpMax: 100, heroAtkBase: 100,
        heroSnapshot: snapshot,
      });
      const ctrl = useCycleStoreV2.getState().controller!;
      // Resume branch leaves currentRealmId untouched (still 'sea', not rotated to volcano).
      expect(ctrl.getCurrentRealmId()).toBe('sea');
      // hero.gridX preserved from snapshot (30), not overridden to spawn col.
      expect(ctrl.getHero().gridX).toBe(30);
    });

    it('three unlocked + cycleNumber=2 → rotates to volcano, hero.gridX = 41', () => {
      useGameStore.setState(s => ({
        ...s,
        meta: {
          ...s.meta,
          unlockedRealms: ['base', 'sea', 'volcano'],
          sagaHistory: [{ cycleId: 'c0' } as never, { cycleId: 'c1' } as never],
        },
      }));
      useCycleStoreV2.getState().start({
        seed: 42, traits: [], heroHpMax: 100, heroAtkBase: 100,
      });
      const ctrl = useCycleStoreV2.getState().controller!;
      expect(ctrl.getCurrentRealmId()).toBe('volcano');
      expect(ctrl.getHero().gridX).toBe(41);  // volcano.columnRange[0]=40 + 1
    });
  });
});
