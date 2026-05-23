import { describe, it, expect } from 'vitest';
import { runSimV2 } from '../sim-cycle-v2';

// V3-B: hero is eternal (no BP / death). Keep maxArrivals small so tests
// finish within vitest's default timeout.
describe('sim-cycle-v2 (V1a CycleControllerV2 headless driver)', () => {
  it('runs N cycles and returns results array', () => {
    const out = runSimV2({
      count: 3,
      seedStart: 100,
      heroHpMax: 100,
      heroAtkBase: 50,
      maxArrivals: 50,
    });
    expect(out.results).toHaveLength(3);
    for (const r of out.results) {
      expect(r.arrivals).toBeGreaterThan(0);
      expect(r.maxLevel).toBeGreaterThanOrEqual(1);
      expect(typeof r.endCause).toBe('string');
    }
  });

  it('same seed produces same maxLevel (determinism)', () => {
    const a = runSimV2({
      count: 1, seedStart: 42,
      heroHpMax: 100, heroAtkBase: 50, maxArrivals: 50,
    });
    const b = runSimV2({
      count: 1, seedStart: 42,
      heroHpMax: 100, heroAtkBase: 50, maxArrivals: 50,
    });
    expect(a.results[0]!.maxLevel).toBe(b.results[0]!.maxLevel);
    expect(a.results[0]!.arrivals).toBe(b.results[0]!.arrivals);
  });

  it('summary has cycleCount, maxLevel percentiles, endCauses', () => {
    const out = runSimV2({
      count: 5, seedStart: 200,
      heroHpMax: 100, heroAtkBase: 50, maxArrivals: 50,
    });
    expect(out.summary.cycleCount).toBe(5);
    expect(out.summary.maxLevel.p50).toBeGreaterThan(0);
    expect(out.summary.arrivals.p50).toBeGreaterThan(0);
    expect(typeof out.summary.endCauses).toBe('object');
  });
});
