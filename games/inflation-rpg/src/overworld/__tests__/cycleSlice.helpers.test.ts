/**
 * Cycle-18 — unit tests for the shared end-of-cycle helper. The transform
 * runs in two places (cycleSliceV2.endCycle in the live store and the
 * mirror block in scripts/sim-cycle-v2.ts) and must produce identical
 * state in both. Drift between them was the root cause of cycle 11 false-
 * PASS and cycle 14 gate-stuck.
 */
import { describe, it, expect } from 'vitest';
import { applyEndCycleMeta, type EndCycleStateSlice } from '../cycleSlice.helpers';
import { INITIAL_META, INITIAL_RUN } from '../../store/gameStore';

function seedState(overrides: {
  sponsorGold?: number;
  atkBaseBonus?: number;
  hpBaseBonus?: number;
  currentRealmId?: 'base' | 'sea' | 'volcano' | 'underworld' | 'heaven' | 'chaos';
  npcsCount?: number;
}): EndCycleStateSlice {
  const npcs = Array.from({ length: overrides.npcsCount ?? 0 }, (_, i) => ({
    id: `npc${i}`,
  })) as unknown as EndCycleStateSlice['run']['npcs'];
  return {
    meta: {
      ...INITIAL_META,
      sponsorGold: overrides.sponsorGold ?? 0,
      atkBaseBonus: overrides.atkBaseBonus ?? 0,
      hpBaseBonus: overrides.hpBaseBonus ?? 0,
    },
    run: {
      ...INITIAL_RUN,
      currentRealmId: overrides.currentRealmId ?? 'base',
      npcs,
    },
  };
}

describe('applyEndCycleMeta — Cycle-18 sim/real parity helper', () => {
  it('resets run.currentRealmId to base regardless of prior realm', () => {
    const before = seedState({ currentRealmId: 'sea' });
    const after = applyEndCycleMeta(before, { gold: 0 });
    expect(after.run.currentRealmId).toBe('base');
  });

  it('clears run.npcs', () => {
    const before = seedState({ npcsCount: 4 });
    expect(before.run.npcs).toHaveLength(4);
    const after = applyEndCycleMeta(before, { gold: 0 });
    expect(after.run.npcs).toEqual([]);
  });

  it('spends accrued sponsorGold via balanced strategy', () => {
    // Seed enough gold that spend('balanced') runs through several
    // alternating atk/hp purchases. Tier 1 cost is small; exact count
    // depends on spend internals — we only assert the direction:
    // sponsorGold strictly decreases (or stays at 0 if fully consumed),
    // atkBaseBonus + hpBaseBonus strictly increase.
    const before = seedState({ sponsorGold: 50, atkBaseBonus: 0, hpBaseBonus: 0 });
    const after = applyEndCycleMeta(before, { gold: 100 });

    const totalBonusBefore = before.meta.atkBaseBonus + before.meta.hpBaseBonus;
    const totalBonusAfter = after.meta.atkBaseBonus + after.meta.hpBaseBonus;
    expect(totalBonusAfter).toBeGreaterThan(totalBonusBefore);

    // sponsorGold can't grow — it either drops to leftover < cost or 0.
    expect(after.meta.sponsorGold).toBeLessThanOrEqual(150);
  });

  it('is pure — does not mutate input state', () => {
    const before = seedState({
      sponsorGold: 50,
      atkBaseBonus: 10,
      hpBaseBonus: 5,
      currentRealmId: 'volcano',
      npcsCount: 3,
    });
    const snapshot = JSON.stringify(before);
    applyEndCycleMeta(before, { gold: 100 });
    expect(JSON.stringify(before)).toBe(snapshot);
  });

  it('preserves other meta fields (sagaHistory, light, unlockedRealms, season)', () => {
    const before = seedState({});
    before.meta.sagaHistory = [{ cycle: 1 }] as never;
    before.meta.light = 42;
    before.meta.unlockedRealms = ['base', 'sea'];
    before.meta.season = { current: 'summer', startedAtAge: 10 };

    const after = applyEndCycleMeta(before, { gold: 0 });
    expect(after.meta.sagaHistory).toEqual(before.meta.sagaHistory);
    expect(after.meta.light).toBe(42);
    expect(after.meta.unlockedRealms).toEqual(['base', 'sea']);
    expect(after.meta.season).toEqual({ current: 'summer', startedAtAge: 10 });
  });

  it('parity — applying the helper twice produces stable state on the second call (idempotent when gold=0)', () => {
    // After a cycle ends, the live store and the sim driver may both
    // operate on the resulting state. Calling the helper a second time
    // with gold=0 must not introduce any drift — it's the same
    // single-source transform.
    const before = seedState({ sponsorGold: 50, atkBaseBonus: 5, hpBaseBonus: 5, currentRealmId: 'sea', npcsCount: 2 });
    const once = applyEndCycleMeta(before, { gold: 100 });
    const twice = applyEndCycleMeta(once, { gold: 0 });
    expect(twice.run.currentRealmId).toBe('base');
    expect(twice.run.npcs).toEqual([]);
    expect(twice.meta.atkBaseBonus).toBe(once.meta.atkBaseBonus);
    expect(twice.meta.hpBaseBonus).toBe(once.meta.hpBaseBonus);
    // sponsorGold may shrink further if leftover from first call ≥ next cost.
    expect(twice.meta.sponsorGold).toBeLessThanOrEqual(once.meta.sponsorGold);
  });
});
