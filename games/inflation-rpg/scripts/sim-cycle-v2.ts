#!/usr/bin/env tsx
/**
 * V1a/V1b headless cycle driver — replays the actual game flow (Overworld + AI
 * + Encounter) without Phaser. Used for Sim-G inflation curve tuning + V1b
 * variety validation + multi-scenario runs.
 *
 * Logging — two-file split per directive:
 *   runs/<date>/c<seed>.jsonl   — every event raw + stamped (AI-friendly)
 *   runs/<date>/c<seed>.md      — narrative summary (sampled every Nth cycle)
 *   runs/<date>/summary.json    — aggregate stats across the batch
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { CycleControllerV2 } from '../src/overworld/CycleControllerV2';
import { generateMapLayout } from '../src/overworld/mapLayout';
import { landmarkToCandidate, type PlacedLandmark } from '../src/overworld/Landmark';
import { LANDMARK_TYPES } from '../src/data/landmarks';
import { SeededRng } from '../src/cycle/SeededRng';
import type { TraitId } from '../src/cycle/traits';
import type { OverworldEvent } from '../src/overworld/OverworldEvents';
import type { CycleSaga } from '../src/saga/SagaTypes';

const ENEMY_ZONE_RANGES = [
  { xMin: 3,  xMax: 7  },
  { xMin: 8,  xMax: 11 },
  { xMin: 12, xMax: 16 },
];
const ENEMY_TYPE_IDS = ['wolf', 'goblin', 'bandit'];
const GRID_H = 12;

export interface SimV2Options {
  count: number;
  seedStart: number;
  bpMax: number;
  heroHpMax: number;
  heroAtkBase: number;
  traits?: TraitId[];
  maxArrivals?: number;
  /** Output directory. JSONL + sampled MD + summary all land here. */
  outDir?: string;
  /** Sample every Nth cycle for the MD narrative. 0 = none. */
  mdSampleEvery?: number;
  /** Optional bonus stats from meta progression (applied to base before curve). */
  atkBonus?: number;
  hpBonus?: number;
}

export interface StampedEvent {
  cycleSeed: number;
  arrival: number;
  heroAge: number;
  heroLevel: number;
  heroHp: number;
  heroBp: number;
  ev: OverworldEvent;
}

export interface SimV2CycleResult {
  seed: number;
  maxLevel: number;
  finalAge: number;
  endCause: string;
  arrivals: number;
  kills: number;
  bossKills: number;
  drops: number;
  bpRemaining: number;
  hp: number;
  hpMax: number;
  warnings: string[];
  // V1b counters
  jobUnlocks: number;
  skillsLearned: number;
  shrineVisits: number;
  moralChoices: number;
  finalJobId: string | null;
  learnedSkills: string[];
  // Personality at end (numeric snapshot)
  personality: Record<string, number>;
  // Lineage support
  startAtkBase: number;
  startHpBase: number;
}

export interface SimV2Summary {
  cycleCount: number;
  maxLevel: Percentiles;
  arrivals: Percentiles;
  kills: Percentiles;
  bpRemaining: Percentiles;
  jobUnlocks: Percentiles;
  skillsLearned: Percentiles;
  shrineVisits: Percentiles;
  moralChoices: Percentiles;
  drops: Percentiles;
  endCauses: Record<string, number>;
  jobsUnlocked: Record<string, number>;
  skillsLearnedCount: Record<string, number>;
}

export interface Percentiles { min: number; max: number; avg: number; p50: number; p90: number; }

export interface SimV2Output { results: SimV2CycleResult[]; summary: SimV2Summary; }

export function runSimV2(opts: SimV2Options): SimV2Output {
  const results: SimV2CycleResult[] = [];
  const maxArrivals = opts.maxArrivals ?? 500;
  const outDir = opts.outDir;
  const mdSampleEvery = opts.mdSampleEvery ?? 0;

  if (outDir) mkdirSync(outDir, { recursive: true });

  for (let i = 0; i < opts.count; i++) {
    const seed = opts.seedStart + i;
    const { result, events, saga } = runOneCycle(seed, opts, maxArrivals);
    results.push(result);

    if (outDir) {
      const jsonlPath = join(outDir, `c${seed}.jsonl`);
      writeFileSync(jsonlPath, events.map(e => JSON.stringify(e)).join('\n') + '\n', 'utf-8');

      if (mdSampleEvery > 0 && i % mdSampleEvery === 0) {
        const mdPath = join(outDir, `c${seed}.md`);
        writeFileSync(mdPath, renderMd(result, saga, events), 'utf-8');
      }
    }
  }

  const summary = buildSummary(results);

  if (outDir) {
    writeFileSync(join(outDir, 'summary.json'), JSON.stringify(summary, null, 2), 'utf-8');
  }

  return { results, summary };
}

function runOneCycle(
  seed: number,
  opts: SimV2Options,
  maxArrivals: number,
): { result: SimV2CycleResult; events: StampedEvent[]; saga: CycleSaga } {
  const startAtkBase = opts.heroAtkBase + (opts.atkBonus ?? 0);
  const startHpBase = opts.heroHpMax + (opts.hpBonus ?? 0);
  const ctrl = new CycleControllerV2({
    seed,
    traits: opts.traits ?? [],
    bpMax: opts.bpMax,
    heroHpMax: startHpBase,
    heroAtkBase: startAtkBase,
  });
  const hero = ctrl.getHero();
  const ai = ctrl.getDecisionAI();
  const layout = generateMapLayout(seed);
  const respawnRng = new SeededRng(seed ^ 0xabcd1234);

  let respawnCounter = 0;
  let arrivals = 0;
  let kills = 0;
  let bossKills = 0;
  let drops = 0;
  let jobUnlocks = 0;
  let skillsLearned = 0;
  let shrineVisits = 0;
  let moralChoices = 0;
  let maxLevel = hero.level;
  const warnings: string[] = [];
  const stamped: StampedEvent[] = [];
  let lastTypeId: string | null = null;
  let sameTypeStreak = 0;
  let endCause = 'unknown';

  while (arrivals < maxArrivals && !hero.dead && hero.bp > 0) {
    const candidates = layout.landmarks.filter(l => !l.consumed);
    if (candidates.length === 0) { endCause = 'no_landmarks'; break; }
    const chosenCandidate = ai.chooseDestination(candidates.map(landmarkToCandidate));
    if (!chosenCandidate) { endCause = 'no_choice'; break; }
    const target = candidates.find(c => c.instanceId === chosenCandidate.id);
    if (!target) { endCause = 'target_not_found'; break; }

    const typeId = target.type.id;
    if (lastTypeId === typeId) {
      sameTypeStreak += 1;
      if (sameTypeStreak === 10) warnings.push(`AI picked ${typeId} 10+ in a row at arrival ${arrivals}`);
    } else { sameTypeStreak = 1; lastTypeId = typeId; }

    const arrivalEv: OverworldEvent = { type: 'arrived_at', landmarkId: target.instanceId, landmarkKind: target.type.kind };
    stamped.push({ cycleSeed: seed, arrival: arrivals, heroAge: hero.age, heroLevel: hero.level, heroHp: hero.hp, heroBp: hero.bp, ev: arrivalEv });

    const events = ctrl.handleArrival(target.type.kind, target.instanceId);
    arrivals += 1;
    target.consumed = true;

    for (const ev of events) {
      stamped.push({ cycleSeed: seed, arrival: arrivals, heroAge: hero.age, heroLevel: hero.level, heroHp: hero.hp, heroBp: hero.bp, ev });
      if (ev.type === 'battle_won') {
        if (target.type.kind === 'boss') bossKills += 1; else kills += 1;
        if (ev.dropId) drops += 1;
      } else if (ev.type === 'level_up' && ev.to > maxLevel) {
        maxLevel = ev.to;
      } else if (ev.type === 'hero_died') {
        endCause = ev.cause;
      } else if ((ev as { type: string }).type === 'job_unlocked') {
        jobUnlocks += 1;
      } else if ((ev as { type: string }).type === 'skill_learned') {
        skillsLearned += 1;
      } else if ((ev as { type: string }).type === 'shrine_visited') {
        shrineVisits += 1;
      } else if ((ev as { type: string }).type === 'moral_choice') {
        moralChoices += 1;
      }
    }

    if (target.type.kind === 'enemy' && !hero.dead && hero.bp > 0) {
      respawnEnemy(layout.landmarks, respawnRng, target, ++respawnCounter);
    }
  }

  if (endCause === 'unknown') {
    if (hero.dead && hero.hp <= 0 && hero.bp > 0) endCause = '전사';
    else if (hero.bp <= 0) endCause = '자연사';
    else if (arrivals >= maxArrivals) endCause = 'max_arrivals';
  }

  const saga = ctrl.finalize();

  const finalJobId = (hero as unknown as { unlockedJobId?: string | null }).unlockedJobId ?? null;
  const learnedSkills = Array.from(((hero as unknown as { learnedSkillIds?: Set<string> }).learnedSkillIds) ?? []);

  const result: SimV2CycleResult = {
    seed, maxLevel, finalAge: hero.age, endCause,
    arrivals, kills, bossKills, drops,
    bpRemaining: hero.bp, hp: hero.hp, hpMax: hero.hpMax,
    warnings,
    jobUnlocks, skillsLearned, shrineVisits, moralChoices,
    finalJobId, learnedSkills,
    personality: hero.personality.snapshot(),
    startAtkBase, startHpBase,
  };

  return { result, events: stamped, saga };
}

function respawnEnemy(
  landmarks: PlacedLandmark[],
  rng: SeededRng,
  consumed: PlacedLandmark,
  counter: number,
): void {
  let range = ENEMY_ZONE_RANGES.find(r => consumed.gridX >= r.xMin && consumed.gridX <= r.xMax);
  if (!range) range = ENEMY_ZONE_RANGES[rng.int(ENEMY_ZONE_RANGES.length)];
  const typeId = ENEMY_TYPE_IDS[rng.int(ENEMY_TYPE_IDS.length)];
  const landmarkType = LANDMARK_TYPES.find(t => t.id === typeId);
  if (!landmarkType) return;
  const x = range!.xMin + rng.int(range!.xMax - range!.xMin + 1);
  const y = rng.int(GRID_H);
  landmarks.push({ instanceId: `${typeId}_respawn_${counter}`, type: landmarkType, gridX: x, gridY: y, consumed: false });
}

function buildSummary(results: SimV2CycleResult[]): SimV2Summary {
  const endCauses: Record<string, number> = {};
  const jobsUnlocked: Record<string, number> = {};
  const skillsLearnedCount: Record<string, number> = {};
  for (const r of results) {
    endCauses[r.endCause] = (endCauses[r.endCause] ?? 0) + 1;
    if (r.finalJobId) jobsUnlocked[r.finalJobId] = (jobsUnlocked[r.finalJobId] ?? 0) + 1;
    for (const s of r.learnedSkills) skillsLearnedCount[s] = (skillsLearnedCount[s] ?? 0) + 1;
  }
  return {
    cycleCount: results.length,
    maxLevel:        stat(results.map(r => r.maxLevel)),
    arrivals:        stat(results.map(r => r.arrivals)),
    kills:           stat(results.map(r => r.kills + r.bossKills)),
    bpRemaining:     stat(results.map(r => r.bpRemaining)),
    jobUnlocks:      stat(results.map(r => r.jobUnlocks)),
    skillsLearned:   stat(results.map(r => r.skillsLearned)),
    shrineVisits:    stat(results.map(r => r.shrineVisits)),
    moralChoices:    stat(results.map(r => r.moralChoices)),
    drops:           stat(results.map(r => r.drops)),
    endCauses, jobsUnlocked, skillsLearnedCount,
  };
}

function stat(values: number[]): Percentiles {
  if (values.length === 0) return { min: 0, max: 0, avg: 0, p50: 0, p90: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  return { min: sorted[0]!, max: sorted[sorted.length - 1]!, avg: sum / sorted.length, p50: sorted[Math.floor(sorted.length * 0.5)]!, p90: sorted[Math.floor(sorted.length * 0.9)]! };
}

function renderMd(result: SimV2CycleResult, saga: CycleSaga, events: StampedEvent[]): string {
  const lines: string[] = [];
  lines.push(`# ${saga.hero.name}의 일대기 (seed=${result.seed})`);
  lines.push('');
  lines.push(`- **최종 직업:** ${saga.hero.finalJob}`);
  lines.push(`- **최종 레벨:** Lv ${result.maxLevel.toLocaleString()}`);
  lines.push(`- **최종 나이:** ${result.finalAge}세 (${result.endCause})`);
  lines.push(`- **여정:** ${result.arrivals} arrivals, ${result.kills + result.bossKills} kills (boss ${result.bossKills}), ${result.drops} drops`);
  lines.push(`- **사건 요약:** 직업 unlock ${result.jobUnlocks} · 스킬 ${result.skillsLearned} · 사당 ${result.shrineVisits} · 도덕 ${result.moralChoices}`);
  lines.push(`- **성향:** ${Object.entries(result.personality).map(([k, v]) => `${k}:${v}`).join(' / ')}`);
  if (result.learnedSkills.length > 0) lines.push(`- **배운 스킬:** ${result.learnedSkills.join(', ')}`);
  lines.push('');
  const CHAPTER_RANGES_LABEL: Record<string, string> = {
    '어린시절': '5-14세',
    '청년기':   '15-29세',
    '장년기':   '30-49세',
    '노년기':   '50-69세',
    '마지막':   '70세+',
  };
  for (const ch of saga.chapters) {
    if (ch.events.length === 0) continue;
    lines.push(`## ${ch.name} (${CHAPTER_RANGES_LABEL[ch.name] ?? ''})`);
    lines.push('');
    for (const e of ch.events) {
      lines.push(`- (${e.age}세) ${e.narrativeText}`);
    }
    lines.push('');
  }
  lines.push(`---`);
  lines.push(`*총 ${events.length} stamped events. JSONL: \`c${result.seed}.jsonl\`.*`);
  return lines.join('\n');
}

if (process.argv[1]?.endsWith('sim-cycle-v2.ts')) {
  const argv = process.argv.slice(2);
  const parseArg = (name: string, fallback: string): string => {
    const idx = argv.findIndex(a => a === `--${name}`);
    return idx >= 0 && idx + 1 < argv.length ? argv[idx + 1]! : fallback;
  };
  const count = parseInt(parseArg('count', '10'), 10);
  const seedStart = parseInt(parseArg('seed', '42'), 10);
  const bpMax = parseInt(parseArg('bp', '100'), 10);
  const hp = parseInt(parseArg('hp', '100'), 10);
  const atk = parseInt(parseArg('atk', '50'), 10);
  const atkBonus = parseInt(parseArg('atk-bonus', '0'), 10);
  const hpBonus = parseInt(parseArg('hp-bonus', '0'), 10);
  const outDir = parseArg('out-dir', `runs/${new Date().toISOString().slice(0, 10)}`);
  const traitsRaw = parseArg('traits', '');
  const traits = traitsRaw ? (traitsRaw.split(',').map(s => s.trim()) as TraitId[]) : undefined;
  const maxArrivals = parseInt(parseArg('max-arrivals', '500'), 10);
  const mdSampleEvery = parseInt(parseArg('md-every', '25'), 10);

  const result = runSimV2({
    count, seedStart, bpMax,
    heroHpMax: hp, heroAtkBase: atk,
    atkBonus, hpBonus,
    traits, maxArrivals, outDir, mdSampleEvery,
  });

  console.log(`Wrote ${result.results.length} cycle results to ${outDir}/`);
  console.log(`Summary:`, JSON.stringify(result.summary, null, 2));
}
