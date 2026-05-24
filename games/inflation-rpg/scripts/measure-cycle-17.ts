#!/usr/bin/env tsx
/**
 * Cycle-17 — chained 1200-arrival bonus-growth balance probe.
 *
 * Cycle 16 measured chained @ 400 cap (jsonl shard size constraint when
 * outDir is set). Cycle 17 measures chained @ 1200 cap (full natural-death
 * window) WITHOUT outDir to skip jsonl writes and probe the maxLevel curve
 * for polynomial degree.
 *
 * Acceptance bands (PRD):
 *   - chained_p50 / batch_p50 < 10x → Case 1: balance OK, defer
 *   - 10x – 100x                    → Case 2: diminishing returns rebalance
 *   - > 100x                        → Case 3: cap or cycle-N decay
 *
 * Output: JSON with maxLevel at cycle 0, 4, 9, 14, 19 (or all if N < 20),
 * chained_p50, batch_p50 (atkBonus=0, same arrival cap, same N), ratio,
 * final atk/hp bonus, polynomial-degree estimate via log-linear fit of
 * log(maxLevel) vs log(cycleNumber).
 *
 * Usage:
 *   pnpm tsx scripts/measure-cycle-17.ts --count 20 --seed 100 --max-arrivals 1200
 *
 * Note: no outDir → no jsonl shards → no disk explosion. RSS still peaks
 * inside `stamped[]` per cycle but is GC'd between iterations.
 */
import { runSimV2, runSimV2Chained } from './sim-cycle-v2';
import { useGameStore } from '../src/store/gameStore';

const argv = process.argv.slice(2);
const arg = (name: string, fallback: string): string => {
  const idx = argv.findIndex(a => a === `--${name}`);
  return idx >= 0 && idx + 1 < argv.length ? argv[idx + 1]! : fallback;
};
const count = parseInt(arg('count', '20'), 10);
const seedStart = parseInt(arg('seed', '100'), 10);
const maxArrivals = parseInt(arg('max-arrivals', '1200'), 10);
const batchCount = parseInt(arg('batch-count', '20'), 10);

function p50(xs: number[]): number {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.floor((sorted[mid - 1]! + sorted[mid]!) / 2)
    : sorted[mid]!;
}

// --- Run 1: Batch baseline (atkBonus=0, same maxArrivals, fresh per cycle).
//   Wipe store before to avoid cross-test pollution.
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
}));

const batchOut = runSimV2({
  count: batchCount,
  seedStart,
  heroHpMax: 100,
  heroAtkBase: 50,
  maxArrivals,
});
const batch_p50 = batchOut.summary.maxLevel.p50;
const batch_avg = batchOut.summary.maxLevel.avg;
const batch_max = batchOut.summary.maxLevel.max;

// --- Run 2: Chained run (carries atk/hp bonus across cycles).
const chainedOut = runSimV2Chained({
  count,
  seedStart,
  heroHpMax: 100,
  heroAtkBase: 50,
  maxArrivals,
});
const meta = useGameStore.getState().meta;

const chainedMaxLevels = chainedOut.results.map(r => r.maxLevel);
const chained_p50 = p50(chainedMaxLevels);
const chained_avg = chainedMaxLevels.reduce((a, b) => a + b, 0) / chainedMaxLevels.length;
const chained_max = Math.max(...chainedMaxLevels);

// --- Curve sample at cycle 0, count/4, count/2, count*3/4, count-1.
const sampleIdx = [
  0,
  Math.floor(count * 0.25),
  Math.floor(count * 0.5),
  Math.floor(count * 0.75),
  count - 1,
];
const curve = sampleIdx
  .filter((i, k, arr) => arr.indexOf(i) === k && i < count)
  .map(i => ({
    cycle: i,
    maxLevel: chainedOut.results[i]!.maxLevel,
    startAtkBase: chainedOut.results[i]!.startAtkBase,
    startHpBase: chainedOut.results[i]!.startHpBase,
    endCause: chainedOut.results[i]!.endCause,
    arrivals: chainedOut.results[i]!.arrivals,
  }));

// --- Polynomial-degree estimate: log-log linear fit of (cycle+1, maxLevel).
//   Skip cycle 0 → avoid log(0). Use cycles 1..count-1 (cycle index 0 is
//   pre-bonus baseline; subsequent points have bonus accumulated).
//   degree ≈ slope of log(maxLevel) vs log(cycle+1).
let degree: number | null = null;
if (count >= 5) {
  // Drop the trivial maxLevel=0/1 cases that break log.
  const points = chainedMaxLevels
    .map((y, i) => ({ x: i + 1, y }))
    .filter(p => p.y >= 2 && p.x >= 2);
  if (points.length >= 3) {
    const xs = points.map(p => Math.log(p.x));
    const ys = points.map(p => Math.log(p.y));
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
    const my = ys.reduce((a, b) => a + b, 0) / ys.length;
    let num = 0, den = 0;
    for (let i = 0; i < xs.length; i++) {
      num += (xs[i]! - mx) * (ys[i]! - my);
      den += (xs[i]! - mx) ** 2;
    }
    degree = den > 0 ? num / den : null;
  }
}

const ratio = batch_p50 > 0 ? chained_p50 / batch_p50 : Infinity;
let band: 'Case 1 (< 10x, balance OK)' | 'Case 2 (10x-100x, rebalance)' | 'Case 3 (> 100x, hyperinflation)';
if (ratio < 10) band = 'Case 1 (< 10x, balance OK)';
else if (ratio < 100) band = 'Case 2 (10x-100x, rebalance)';
else band = 'Case 3 (> 100x, hyperinflation)';

console.log(JSON.stringify({
  config: { count, batchCount, seedStart, maxArrivals },
  batch: {
    p50: batch_p50,
    avg: Math.floor(batch_avg),
    max: batch_max,
    endCauses: batchOut.summary.endCauses,
  },
  chained: {
    p50: chained_p50,
    avg: Math.floor(chained_avg),
    max: chained_max,
    endCauses: chainedOut.summary.endCauses,
    finalAtkBonus: meta.atkBaseBonus,
    finalHpBonus: meta.hpBaseBonus,
    finalSagaLength: meta.sagaHistory?.length ?? 0,
    finalUnlockedCount: meta.unlockedRealms.length,
  },
  ratio: Number(ratio.toFixed(2)),
  band,
  polynomialDegree: degree !== null ? Number(degree.toFixed(2)) : null,
  curve,
}, null, 2));
