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

  // Cycle 10 P0 / Cycle 11 C10-B: MAX_ARRIVALS default raised 500 → 1000
  // (cycle 10) → 1200 (cycle 11). With ageFromActions = floor(5 + 65 ×
  // actions/1000), 1200 arrivals lets a 2-rejuv hero (2 × 5y = ~154 extra
  // actions) still reach age 70 → '자연사' inside the window. The previous
  // 1000 cap clamped finalAge at ~64 for rejuv-active cycles and produced
  // 0% '자연사' regardless of the emit path. This regression guard pins
  // finalAge ≥ 65 (well above the cycle 10 cap of 37 and a no-op for
  // post-cycle-11 runs that target age 70+).
  it('default maxArrivals allows ageEnd ≥ 65 (cycle 10+11 lifecycle activation)', () => {
    const out = runSimV2({
      count: 1, seedStart: 7777,
      heroHpMax: 100, heroAtkBase: 50,
      // no maxArrivals → uses default
    });
    const r = out.results[0]!;
    expect(r.finalAge).toBeGreaterThanOrEqual(65);
  }, 30_000);
});
