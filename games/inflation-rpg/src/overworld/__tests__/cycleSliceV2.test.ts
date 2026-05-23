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
});
