#!/usr/bin/env tsx
/**
 * Cycle 1 F1 sim guards — Task 3 의 sim 검증 7 케이스를 한 번에 실행한다.
 * Task 7 (Phase F merge gate) 의 sim regression check 가 호출.
 *
 * 사용:
 *   pnpm --filter @forge/game-inflation-rpg sim:v3 -- --count 50 --seed 1024 --out-dir /tmp/cycle-1-post-sim
 *   tsx games/inflation-rpg/scripts/cycle-1-sim-guards.ts /tmp/cycle-1-post-sim/summary.json
 */
import { readFileSync } from 'node:fs';

const summaryPath = process.argv[2] ?? '/tmp/cycle-1-post-sim/summary.json';
const s = JSON.parse(readFileSync(summaryPath, 'utf-8'));

const fails: string[] = [];
const check = (cond: boolean, msg: string) => { if (!cond) fails.push(msg); };

// F1.11/F1.12 — skillsLearned
check(s.skillsLearned.p50 <= 14, `F1.11 skillsLearned.p50 ${s.skillsLearned.p50} > 14 (PRD primary)`);
check(s.skillsLearned.p50 <= 18, `F1.12 skillsLearned.p50 ${s.skillsLearned.p50} > 18 (regression floor)`);

// F1.13 — Tier 2 single-job share
const jobs = s.jobsUnlocked ?? {};
const total = Object.values(jobs).reduce((a: number, b) => a + (b as number), 0) as number;
const maxShare = total > 0 ? Math.max(...Object.values(jobs).map(v => (v as number) / total)) : 0;
check(maxShare <= 0.35, `F1.13 Tier 2 maxShare ${maxShare.toFixed(3)} > 0.35`);

// F1.14 — monk + ranger
const monkRanger = (jobs.monk ?? 0) + (jobs.ranger ?? 0);
check(monkRanger >= 1, `F1.14 monk+ranger ${monkRanger} < 1`);

// F1.15 — moralChoices p50 (cycle 1 baseline 재조정: 측정값 ~55 floor 기반)
check(s.moralChoices.p50 >= 50 && s.moralChoices.p50 <= 80, `F1.15 moralChoices.p50 ${s.moralChoices.p50} not in [50,80]`);

// F1.16 — maxLevel curve guard
check(s.maxLevel.p50 >= 746000 && s.maxLevel.p50 <= 1078000, `F1.16 maxLevel.p50 ${s.maxLevel.p50} not in [746k,1078k]`);

// F1.17 — death rate
const dead = (s.endCauses?.['전사'] ?? 0) + (s.endCauses?.['dead'] ?? 0);
const deathRate = dead / s.cycleCount;
check(deathRate <= 0.05, `F1.17 deathRate ${deathRate.toFixed(3)} > 0.05`);

if (fails.length > 0) {
  console.error('SIM GUARD FAIL:');
  for (const f of fails) console.error('  -', f);
  process.exit(1);
}
console.log('Cycle 1 sim guards PASS');
