#!/usr/bin/env tsx
/**
 * V1c-1 criterion #4 analyzer — count heroes that reach |value| >= 6 on each
 * personality dim. Re-runs the sim in-process for determinism instead of
 * round-tripping through the JSONL stamped events.
 */
import { runSimV2 } from './sim-cycle-v2';
import { PERSONALITY_DIMS } from '../src/hero/PersonalityState';

const THRESHOLD = 6;
const REQUIRED_COUNT = 5;

const opts = {
  count: 200,
  seedStart: 1,
  bpMax: 100,
  heroHpMax: 100,
  heroAtkBase: 50,
};

const { results } = runSimV2(opts);

console.log(`# V1c-1 Criterion #4 — Personality drift coverage`);
console.log(`Cycles: ${results.length}  |  Threshold: |value| >= ${THRESHOLD}  |  Required: >= ${REQUIRED_COUNT} heroes per dim`);
console.log();

const verdict: Record<string, { positive: number; negative: number; threshold: number; pass: boolean }> = {};
for (const dim of PERSONALITY_DIMS) {
  const positive = results.filter(r => (r.personality[dim] ?? 0) >= THRESHOLD).length;
  const negative = results.filter(r => (r.personality[dim] ?? 0) <= -THRESHOLD).length;
  const threshold = positive + negative;
  const pass = threshold >= REQUIRED_COUNT;
  verdict[dim] = { positive, negative, threshold, pass };
}

console.log('| dim       | +>=6 | -<=-6 | total | criterion |');
console.log('|-----------|-----:|------:|------:|:----------|');
for (const dim of PERSONALITY_DIMS) {
  const v = verdict[dim]!;
  console.log(`| ${dim.padEnd(9)} | ${String(v.positive).padStart(4)} | ${String(v.negative).padStart(5)} | ${String(v.threshold).padStart(5)} | ${v.pass ? '✅ PASS' : '❌ FAIL'} |`);
}

const allPass = PERSONALITY_DIMS.every(d => verdict[d]!.pass);
console.log();
console.log(`Overall: ${allPass ? '✅ all 5 dims pass criterion #4' : '❌ FAIL — one or more dims short'}`);

// Also print job distribution for #1 cross-check
const jobsCount: Record<string, number> = {};
for (const r of results) {
  const j = r.finalJobId ?? '(none)';
  jobsCount[j] = (jobsCount[j] ?? 0) + 1;
}
const jobsSorted = Object.entries(jobsCount).sort((a, b) => b[1] - a[1]);
console.log();
console.log(`# Criterion #1 cross-check — final job distribution`);
for (const [job, count] of jobsSorted) {
  const pct = (count / results.length * 100).toFixed(1);
  console.log(`  ${job.padEnd(15)} ${String(count).padStart(3)} (${pct}%)`);
}
const sagePct = (jobsCount['sage'] ?? 0) / results.length * 100;
const distinctJobs = jobsSorted.filter(([j]) => j !== '(none)').length;
console.log();
console.log(`sage 비율: ${sagePct.toFixed(1)}%  ${sagePct < 50 ? '✅ < 50%' : '❌ >= 50%'}`);
console.log(`distinct jobs: ${distinctJobs}  ${distinctJobs >= 6 ? '✅ >= 6' : '❌ < 6'}`);

process.exit(allPass && sagePct < 50 && distinctJobs >= 6 ? 0 : 1);
