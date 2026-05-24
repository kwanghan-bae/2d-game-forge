import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runSimV2, runSimV2Chained } from '../sim-cycle-v2';
import { useGameStore } from '../../src/store/gameStore';

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

  // Cycle-12 L2: chunked jsonl write. Pre-fix events.map().join() built one
  // contiguous string per cycle (V8 cap ~512MB → throw on 1200-arrival runs).
  // Post-fix writes each event line via openSync/writeSync. This guard checks
  // the file lands on disk with the correct line count, but does NOT push to
  // the V8 cap (that takes 1200 arrivals × ~60s wall time in vitest).
  it('writes per-cycle jsonl shard with one line per stamped event (L2 chunked write)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cycle-12-l2-'));
    try {
      const out = runSimV2({
        count: 2, seedStart: 555,
        heroHpMax: 100, heroAtkBase: 50, maxArrivals: 40,
        outDir: dir,
      });
      for (const r of out.results) {
        const path = join(dir, `c${r.seed}.jsonl`);
        expect(existsSync(path)).toBe(true);
        const text = readFileSync(path, 'utf-8');
        // every line is valid JSON with cycleSeed === seed
        const lines = text.split('\n').filter(l => l.length > 0);
        expect(lines.length).toBeGreaterThan(0);
        for (const ln of lines) {
          const parsed = JSON.parse(ln) as { cycleSeed: number };
          expect(parsed.cycleSeed).toBe(r.seed);
        }
        // trailing newline so subsequent appends start on a clean line
        expect(text.endsWith('\n')).toBe(true);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// Cycle-16 — chained sim driver. Carries `meta.sagaHistory`,
// `meta.unlockedRealms`, `meta.atkBaseBonus`, `meta.hpBaseBonus`,
// `meta.sponsorGold`, `meta.light` across cycles via the live zustand store,
// mirroring `cycleSliceV2.start()` + `endCycle()` between iterations.
describe('runSimV2Chained — multi-cycle state carry (cycle 16)', () => {
  // Each test resets the store so a polluted vitest worker doesn't leak
  // state in. runSimV2Chained itself also resets at entry, but explicit
  // reset here keeps each `it` independent.
  beforeEach(() => {
    useGameStore.setState(s => ({
      ...s,
      meta: {
        ...s.meta,
        sagaHistory: [],
        unlockedRealms: ['base'],
        sponsorGold: 0,
        atkBaseBonus: 0,
        hpBaseBonus: 0,
        light: 0,
      },
      run: { ...s.run, currentRealmId: 'base', npcs: [] },
    }));
  });

  it('appends one sagaHistory entry per chained cycle (N=5)', () => {
    const out = runSimV2Chained({
      count: 5, seedStart: 1000,
      heroHpMax: 100, heroAtkBase: 50,
      maxArrivals: 60,
    });
    expect(out.results).toHaveLength(5);
    const stored = useGameStore.getState().meta.sagaHistory ?? [];
    expect(stored.length).toBe(5);
    // saga.hero.seed sequence matches the chained iteration order (seedStart..+4)
    expect(stored.map(s => s.hero.seed)).toEqual([1000, 1001, 1002, 1003, 1004]);
  });

  it('rotates starting realm round-robin over the initial unlocked set (first 3 cycles)', () => {
    // Pre-seed 3 unlocked realms. Note: chained mode also onBossKill-unlocks
    // organically, so we only assert the first N=initial_unlocked_length
    // cycles deterministically. After that the pool can grow (which is the
    // exact behavior we *want* — that's tested separately below).
    useGameStore.setState(s => ({
      ...s,
      meta: { ...s.meta, unlockedRealms: ['base', 'sea', 'volcano'] },
    }));
    // Use very small maxArrivals so a cycle can't unlock the next realm via
    // boss kill before its rotation slot — keeps the first 3-cycle assertion
    // stable. (Boss spawn at ~col 8+; 20 arrivals is below that for tier 0.)
    const out = runSimV2Chained({
      count: 3, seedStart: 2000,
      heroHpMax: 100, heroAtkBase: 50,
      maxArrivals: 20,
    });
    expect(out.results).toHaveLength(3);
    // Cycle-16 — result.startRealm carries the realm picked by pickStartingRealm
    // at the start of each chained iteration. pickStartingRealm reads
    // sagaHistory.length right before each cycle, so the rotation is
    // deterministic for the first len(unlockedRealms) cycles.
    const realms = out.results.map(r => r.startRealm);
    expect(realms).toEqual(['base', 'sea', 'volcano']);
  });

  it('organically grows unlockedRealms via boss kills across chained cycles', () => {
    // Start with only base; let the chained sim discover realms through
    // actual boss kills. This is the carry that batch mode CANNOT measure.
    // Acceptance: by the end of N cycles, unlockedRealms.length > 1
    // (proves the onBossKill → store.unlockRealm wire is live).
    runSimV2Chained({
      count: 8, seedStart: 5000,
      heroHpMax: 100, heroAtkBase: 50,
      maxArrivals: 80,
    });
    const meta = useGameStore.getState().meta;
    expect(meta.unlockedRealms.length).toBeGreaterThanOrEqual(2);
    expect(meta.unlockedRealms[0]).toBe('base');
  }, 30_000);

  it('accumulates atk/hp bonus across cycles via spend("balanced")', () => {
    // Run 5 chained cycles. With the balanced spend strategy, sponsorGold
    // earned each cycle is auto-spent into atk/hp bonus, so the final
    // bonus should be > 0. (10-cycle run timed out in vitest's 5s; 5 cycles
    // × 40 arrivals gives ~3-4 levels per cycle which is enough goldFromCycle
    // to trigger at least one spend tick.)
    runSimV2Chained({
      count: 5, seedStart: 3000,
      heroHpMax: 100, heroAtkBase: 50,
      maxArrivals: 40,
    });
    const meta = useGameStore.getState().meta;
    // At least one of the two stat bonuses should have grown (balanced
    // spend distributes between atk and hp).
    expect((meta.atkBaseBonus ?? 0) + (meta.hpBaseBonus ?? 0)).toBeGreaterThan(0);
  }, 15_000);

  it('batch mode is unaffected — sagaHistory not mutated (regression guard)', () => {
    // Baseline: store sagaHistory was 0 from beforeEach.
    const before = useGameStore.getState().meta.sagaHistory.length;
    runSimV2({
      count: 3, seedStart: 4000,
      heroHpMax: 100, heroAtkBase: 50, maxArrivals: 40,
    });
    const after = useGameStore.getState().meta.sagaHistory.length;
    // Batch mode constructs CycleControllerV2 directly and does NOT touch
    // SagaStorage/store sagaHistory. Cycle-16 must not regress this.
    expect(after).toBe(before);
  });
});
