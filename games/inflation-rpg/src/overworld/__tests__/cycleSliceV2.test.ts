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
      bpMax: 30,
      heroHpMax: 100,
      heroAtkBase: 100,
    });
    expect(useCycleStoreV2.getState().status).toBe('running');
    expect(useCycleStoreV2.getState().controller).not.toBeNull();
  });

  it('endCycle finalizes saga and persists', () => {
    useCycleStoreV2.getState().start({
      seed: 42, traits: [], bpMax: 3, heroHpMax: 100, heroAtkBase: 100000,
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
    useCycleStoreV2.getState().start({ seed: 1, traits: [], bpMax: 30, heroHpMax: 100, heroAtkBase: 100 });
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
        seed: 1, traits: [], bpMax: 3, heroHpMax: 100, heroAtkBase: 100,
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
        seed: 1, traits: [], bpMax: 3, heroHpMax: 100, heroAtkBase: 100,
      });
      useCycleStoreV2.getState().endCycle();
      const meta = useGameStore.getState().meta;
      expect(meta.atkBaseBonus).toBeGreaterThanOrEqual(2);
      expect(meta.hpBaseBonus).toBeGreaterThanOrEqual(3);
    });
  });
});
