import { describe, it, expect } from 'vitest';
import { runSim } from '../sim-cycle';

describe('sim-cycle CLI — runSim()', () => {
  it('runs a single cycle and returns at least one CycleResult', () => {
    const out = runSim({
      count: 1,
      seedStart: 42,
      loadout: { characterId: 'K01', bpMax: 3, heroHpMax: 100, heroAtkBase: 10000 },
      maxTickMs: 60_000,
    });
    expect(out.results.length).toBe(1);
    expect(out.results[0].reason).toBe('bp_exhausted');
    expect(out.results[0].maxLevel).toBeGreaterThanOrEqual(1);
  });

  it('10 cycles complete with summary aggregation', () => {
    const out = runSim({
      count: 10,
      seedStart: 1,
      loadout: { characterId: 'K01', bpMax: 3, heroHpMax: 100, heroAtkBase: 10000 },
      maxTickMs: 60_000,
    });
    // All 10 cycles should complete and be aggregated into summary.
    expect(out.summary.cycleCount).toBe(10);
    expect(out.results.length).toBe(10);
  });

  it('summary aggregates max/min/avg of maxLevel across cycles', () => {
    const out = runSim({
      count: 5,
      seedStart: 100,
      loadout: { characterId: 'K01', bpMax: 3, heroHpMax: 100, heroAtkBase: 10000 },
      maxTickMs: 60_000,
    });
    expect(out.summary.maxLevel.min).toBeLessThanOrEqual(out.summary.maxLevel.avg);
    expect(out.summary.maxLevel.avg).toBeLessThanOrEqual(out.summary.maxLevel.max);
  });
});
