#!/usr/bin/env tsx
/**
 * Multi-scenario lineage simulator.
 *
 * Runs N cycles per strategy, accumulating sponsorGold across cycles and
 * spending it on persistent atkBaseBonus / hpBaseBonus per the chosen strategy.
 * Each strategy is its own "playthrough" — useful for comparing how different
 * meta-progression spending shapes the hero arc over many cycles.
 *
 * Usage:
 *   pnpm --filter @forge/game-inflation-rpg exec npx tsx scripts/sim-scenarios.ts \
 *     --cycles 30 --strategies balanced,atk-focus,hp-focus,personality \
 *     --out-dir runs/2026-05-21-scenarios
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { runSimV2, type SimV2CycleResult } from './sim-cycle-v2';
import {
  goldFromCycle,
  spend,
  type SpendStrategy,
} from '../src/meta/MetaProgression';
import { SeededRng } from '../src/cycle/SeededRng';

export interface ScenarioOpts {
  strategy: SpendStrategy;
  cycles: number;
  seedStart: number;
  bpMax: number;
  heroHpMax: number;
  heroAtkBase: number;
  outDir?: string;
}

export interface CycleSnapshot {
  cycleIndex: number;
  seed: number;
  atkBaseBonus: number;
  hpBaseBonus: number;
  sponsorGoldBefore: number;
  goldEarned: number;
  sponsorGoldAfter: number;
  result: SimV2CycleResult;
}

export interface ScenarioResult {
  strategy: SpendStrategy;
  cycles: CycleSnapshot[];
  finalAtkBonus: number;
  finalHpBonus: number;
  finalSponsorGold: number;
  totalKills: number;
  totalDrops: number;
  totalJobsUnlocked: number;
  totalSkillsLearned: number;
  totalMoralChoices: number;
  totalShrineVisits: number;
  maxLevelByCycle: number[];
}

export function runScenario(opts: ScenarioOpts): ScenarioResult {
  const cycles: CycleSnapshot[] = [];
  let atkBonus = 0;
  let hpBonus = 0;
  let sponsorGold = 0;
  // Per-strategy RNG for 'random' / 'personality' tiebreaks.
  const strategyRng = new SeededRng(opts.seedStart ^ 0xc0de);

  for (let i = 0; i < opts.cycles; i++) {
    const seed = opts.seedStart + i;
    const { results } = runSimV2({
      count: 1,
      seedStart: seed,
      bpMax: opts.bpMax,
      heroHpMax: opts.heroHpMax,
      heroAtkBase: opts.heroAtkBase,
      atkBonus,
      hpBonus,
      maxArrivals: 1000,
      // Per-strategy logs land under outDir/<strategy>/cN.jsonl if outDir set.
      outDir: opts.outDir ? join(opts.outDir, opts.strategy, `c${i}`) : undefined,
      mdSampleEvery: 0,
    });
    const r = results[0]!;
    const goldEarned = goldFromCycle({
      maxLevel: r.maxLevel,
      kills: r.kills,
      bossKills: r.bossKills,
      drops: r.drops,
    });
    const goldBefore = sponsorGold;
    sponsorGold += goldEarned;
    const spendOut = spend({
      gold: sponsorGold,
      atkBaseBonus: atkBonus,
      hpBaseBonus: hpBonus,
      strategy: opts.strategy,
      rngNext: () => strategyRng.next(),
      personality: { heroic: r.personality.heroic ?? 0, prudent: r.personality.prudent ?? 0 },
    });
    sponsorGold = spendOut.goldRemaining;
    atkBonus = spendOut.atkBaseBonus;
    hpBonus = spendOut.hpBaseBonus;
    cycles.push({
      cycleIndex: i,
      seed,
      atkBaseBonus: atkBonus,
      hpBaseBonus: hpBonus,
      sponsorGoldBefore: goldBefore,
      goldEarned,
      sponsorGoldAfter: sponsorGold,
      result: r,
    });
  }

  return {
    strategy: opts.strategy,
    cycles,
    finalAtkBonus: atkBonus,
    finalHpBonus: hpBonus,
    finalSponsorGold: sponsorGold,
    totalKills:         cycles.reduce((a, c) => a + c.result.kills + c.result.bossKills, 0),
    totalDrops:         cycles.reduce((a, c) => a + c.result.drops, 0),
    totalJobsUnlocked:  cycles.reduce((a, c) => a + c.result.jobUnlocks, 0),
    totalSkillsLearned: cycles.reduce((a, c) => a + c.result.skillsLearned, 0),
    totalMoralChoices:  cycles.reduce((a, c) => a + c.result.moralChoices, 0),
    totalShrineVisits:  cycles.reduce((a, c) => a + c.result.shrineVisits, 0),
    maxLevelByCycle:    cycles.map(c => c.result.maxLevel),
  };
}

function renderComparison(results: ScenarioResult[]): string {
  const lines: string[] = [];
  lines.push('# Multi-Scenario Sim Comparison');
  lines.push('');
  lines.push(`총 ${results[0]?.cycles.length ?? 0} cycle 누적, ${results.length} strategy.`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Strategy | Final ATK+ | Final HP+ | Gold Remaining | Max Lv (last) | Max Lv (avg) | Total Kills | Skills | Jobs | Moral |');
  lines.push('|----------|-----------:|----------:|---------------:|--------------:|-------------:|------------:|-------:|-----:|------:|');
  for (const r of results) {
    const lastLv = r.maxLevelByCycle[r.maxLevelByCycle.length - 1] ?? 0;
    const avgLv = Math.floor(r.maxLevelByCycle.reduce((a, b) => a + b, 0) / r.maxLevelByCycle.length);
    lines.push(`| ${r.strategy} | ${r.finalAtkBonus} | ${r.finalHpBonus} | ${r.finalSponsorGold.toLocaleString()} | ${lastLv.toLocaleString()} | ${avgLv.toLocaleString()} | ${r.totalKills.toLocaleString()} | ${r.totalSkillsLearned} | ${r.totalJobsUnlocked} | ${r.totalMoralChoices} |`);
  }
  lines.push('');
  for (const r of results) {
    lines.push(`## ${r.strategy} — maxLevel trajectory`);
    lines.push('');
    lines.push('| Cycle | maxLev | ATK+ | HP+ | Gold Earned | Final Job | Skills | Moral | Personality |');
    lines.push('|------:|-------:|-----:|----:|------------:|-----------|-------:|------:|-------------|');
    for (const c of r.cycles) {
      const p = c.result.personality;
      const pers = Object.entries(p).map(([k, v]) => `${k.slice(0, 4)}:${v}`).join(' ');
      lines.push(`| ${c.cycleIndex} | ${c.result.maxLevel.toLocaleString()} | ${c.atkBaseBonus} | ${c.hpBaseBonus} | ${c.goldEarned} | ${c.result.finalJobId ?? '평민'} | ${c.result.skillsLearned} | ${c.result.moralChoices} | ${pers} |`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

if (process.argv[1]?.endsWith('sim-scenarios.ts')) {
  const argv = process.argv.slice(2);
  const parseArg = (name: string, fallback: string): string => {
    const idx = argv.findIndex(a => a === `--${name}`);
    return idx >= 0 && idx + 1 < argv.length ? argv[idx + 1]! : fallback;
  };
  const cycles = parseInt(parseArg('cycles', '20'), 10);
  const seedStart = parseInt(parseArg('seed', '1'), 10);
  const bpMax = parseInt(parseArg('bp', '100'), 10);
  const hp = parseInt(parseArg('hp', '100'), 10);
  const atk = parseInt(parseArg('atk', '50'), 10);
  const outDir = parseArg('out-dir', `runs/${new Date().toISOString().slice(0, 10)}-scenarios`);
  const stratsRaw = parseArg('strategies', 'balanced,atk-focus,hp-focus,random,personality');
  const strategies = stratsRaw.split(',').map(s => s.trim()) as SpendStrategy[];

  mkdirSync(outDir, { recursive: true });

  const results: ScenarioResult[] = [];
  for (const strategy of strategies) {
    console.log(`Running scenario: ${strategy}`);
    const r = runScenario({
      strategy,
      cycles,
      seedStart,
      bpMax,
      heroHpMax: hp,
      heroAtkBase: atk,
      outDir,
    });
    results.push(r);
  }

  const compMd = renderComparison(results);
  writeFileSync(join(outDir, 'comparison.md'), compMd, 'utf-8');
  writeFileSync(join(outDir, 'comparison.json'), JSON.stringify(results, null, 2), 'utf-8');

  console.log(`\nWrote comparison to ${outDir}/comparison.md`);
  console.log(`\nSummary:`);
  for (const r of results) {
    const lastLv = r.maxLevelByCycle[r.maxLevelByCycle.length - 1] ?? 0;
    console.log(`  ${r.strategy.padEnd(14)} → final ATK+${r.finalAtkBonus} HP+${r.finalHpBonus}, last cycle maxLv ${lastLv.toLocaleString()}`);
  }
}
