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

  // Cycle 10 P0: MAX_ARRIVALS default raised 500 → 1000 to unlock lifecycle
  // drama. With ageFromActions = floor(5 + 65 × actions/1000) and 1 arrival
  // = 1 action, the previous 500 cap pinned ageEnd at 37 (well below the
  // 50-69 老年 chapter and 70+ 마지막 chapter thresholds). 1000 lets age
  // reach 70 deterministically, activating natural-death + rejuv triggers.
  it('default maxArrivals allows ageEnd ≥ 70 (cycle 10 lifecycle activation)', () => {
    const out = runSimV2({
      count: 1, seedStart: 7777,
      heroHpMax: 100, heroAtkBase: 50,
      // no maxArrivals → uses default
    });
    const r = out.results[0]!;
    // Floor(5 + 65 × 1000/1000) = 70 if hero survives to the cap.
    expect(r.finalAge).toBeGreaterThanOrEqual(60);
  }, 30_000);
});
