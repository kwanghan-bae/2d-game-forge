#!/usr/bin/env tsx
/**
 * Cycle-16 — one-shot measurement script for chained sim store state.
 *
 * Runs `runSimV2Chained` and prints the *post-cycle* store snapshot
 * (sagaHistory.length, unlockedRealms, atk/hp bonus, sponsorGold) plus
 * the start-realm distribution from the result array.
 *
 * Not a permanent driver — tracked under /scripts/ so it can be inspected
 * later if cycle 16's measurements are questioned. Safe to delete in a
 * cleanup pass; sim-cycle-v2.smoke.test.ts unit tests carry the regression.
 */
import { runSimV2Chained } from './sim-cycle-v2';
import { useGameStore } from '../src/store/gameStore';

const argv = process.argv.slice(2);
const arg = (name: string, fallback: string): string => {
  const idx = argv.findIndex(a => a === `--${name}`);
  return idx >= 0 && idx + 1 < argv.length ? argv[idx + 1]! : fallback;
};
const count = parseInt(arg('count', '50'), 10);
const seedStart = parseInt(arg('seed', '100'), 10);
const maxArrivals = parseInt(arg('max-arrivals', '400'), 10);

const out = runSimV2Chained({
  count, seedStart,
  heroHpMax: 100, heroAtkBase: 50,
  maxArrivals,
});

const meta = useGameStore.getState().meta;
const startRealms = out.results.map(r => r.startRealm);
const realmCounts: Record<string, number> = {};
for (const r of startRealms) realmCounts[r] = (realmCounts[r] ?? 0) + 1;

const realmsArr = Object.values(realmCounts);
const mean = realmsArr.reduce((a, b) => a + b, 0) / realmsArr.length;
const variance = realmsArr.reduce((a, b) => a + (b - mean) ** 2, 0) / realmsArr.length;
const stddev = Math.sqrt(variance);

console.log(JSON.stringify({
  cycleCount: out.results.length,
  sagaHistoryLength: meta.sagaHistory?.length ?? 0,
  unlockedRealmsAtEnd: meta.unlockedRealms,
  unlockedCountAtEnd: meta.unlockedRealms.length,
  atkBaseBonus: meta.atkBaseBonus,
  hpBaseBonus: meta.hpBaseBonus,
  sponsorGold: meta.sponsorGold,
  startRealmDistribution: realmCounts,
  startRealmMean: mean,
  startRealmStddev: stddev,
  startRealmStddevPctOfMean: ((stddev / mean) * 100).toFixed(2) + '%',
  maxLevel_p50: out.summary.maxLevel.p50,
  maxLevel_max: out.summary.maxLevel.max,
  maxLevel_min: out.summary.maxLevel.min,
  bossKillsTotal: out.results.reduce((a, b) => a + b.bossKills, 0),
}, null, 2));
