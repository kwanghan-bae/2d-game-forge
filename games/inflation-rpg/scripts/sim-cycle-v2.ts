#!/usr/bin/env tsx
/**
 * V1a headless cycle driver — replays the actual game flow (Overworld + AI + Encounter)
 * without Phaser. Used for Sim-G inflation curve tuning.
 *
 * Mirrors OverworldScene.pickNextDestination + arriveAtTarget + respawnEnemyNear.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { CycleControllerV2 } from '../src/overworld/CycleControllerV2';
import { generateMapLayout } from '../src/overworld/mapLayout';
import { landmarkToCandidate, type PlacedLandmark } from '../src/overworld/Landmark';
import { LANDMARK_TYPES } from '../src/data/landmarks';
import { SeededRng } from '../src/cycle/SeededRng';
import type { TraitId } from '../src/cycle/traits';

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
  /** Hard cap to avoid infinite loops. */
  maxArrivals?: number;
  out?: string;
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
}

export interface SimV2Summary {
  cycleCount: number;
  maxLevel: Percentiles;
  arrivals: Percentiles;
  kills: Percentiles;
  bpRemaining: Percentiles;
  endCauses: Record<string, number>;
}

export interface Percentiles {
  min: number;
  max: number;
  avg: number;
  p50: number;
  p90: number;
}

export interface SimV2Output {
  results: SimV2CycleResult[];
  summary: SimV2Summary;
}

export function runSimV2(opts: SimV2Options): SimV2Output {
  const results: SimV2CycleResult[] = [];
  const maxArrivals = opts.maxArrivals ?? 500;

  for (let i = 0; i < opts.count; i++) {
    const seed = opts.seedStart + i;
    results.push(runOneCycle(seed, opts, maxArrivals));
  }

  const summary = buildSummary(results);

  if (opts.out) {
    mkdirSync(dirname(opts.out), { recursive: true });
    const jsonl = results.map(r => JSON.stringify(r)).join('\n');
    writeFileSync(opts.out, jsonl + '\n', 'utf-8');
    const summaryPath = opts.out.replace(/\.jsonl?$/, '') + '.summary.json';
    writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf-8');
  }

  return { results, summary };
}

function runOneCycle(seed: number, opts: SimV2Options, maxArrivals: number): SimV2CycleResult {
  const ctrl = new CycleControllerV2({
    seed,
    traits: opts.traits ?? [],
    bpMax: opts.bpMax,
    heroHpMax: opts.heroHpMax,
    heroAtkBase: opts.heroAtkBase,
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
  let maxLevel = hero.level;
  const warnings: string[] = [];
  let lastInstanceId: string | null = null;
  let sameLandmarkStreak = 0;
  let endCause = 'unknown';

  while (arrivals < maxArrivals && !hero.dead && hero.bp > 0) {
    const candidates = layout.landmarks.filter(l => !l.consumed);
    if (candidates.length === 0) {
      endCause = 'no_landmarks';
      break;
    }
    const chosenCandidate = ai.chooseDestination(candidates.map(landmarkToCandidate));
    if (!chosenCandidate) {
      endCause = 'no_choice';
      break;
    }
    const target = candidates.find(c => c.instanceId === chosenCandidate.id);
    if (!target) {
      endCause = 'target_not_found';
      break;
    }

    // Same-landmark-instance streak is impossible (consumed),
    // but same-TYPE streak via respawn is possible — flag it.
    const typeId = target.type.id;
    if (lastInstanceId === typeId) {
      sameLandmarkStreak += 1;
      if (sameLandmarkStreak === 10) {
        warnings.push(`AI picked same type ${typeId} 10+ times in a row at arrival ${arrivals}`);
      }
    } else {
      sameLandmarkStreak = 1;
      lastInstanceId = typeId;
    }

    const events = ctrl.handleArrival(target.type.kind, target.instanceId);
    arrivals += 1;
    target.consumed = true;

    for (const ev of events) {
      if (ev.type === 'battle_won') {
        if (target.type.kind === 'boss') bossKills += 1;
        else kills += 1;
        if (ev.dropId) drops += 1;
      } else if (ev.type === 'level_up') {
        if (ev.to > maxLevel) maxLevel = ev.to;
      } else if (ev.type === 'hero_died') {
        endCause = ev.cause; // '전사' | '자연사'
      }
    }

    // Mimic OverworldScene: enemies respawn after defeat (bosses do not).
    if (target.type.kind === 'enemy' && !hero.dead && hero.bp > 0) {
      respawnEnemy(layout.landmarks, respawnRng, target, ++respawnCounter);
    }
  }

  if (endCause === 'unknown') {
    if (hero.dead && hero.hp <= 0 && hero.bp > 0) endCause = '전사';
    else if (hero.bp <= 0) endCause = '자연사';
    else if (arrivals >= maxArrivals) endCause = 'max_arrivals';
  }

  return {
    seed,
    maxLevel,
    finalAge: hero.age,
    endCause,
    arrivals,
    kills,
    bossKills,
    drops,
    bpRemaining: hero.bp,
    hp: hero.hp,
    hpMax: hero.hpMax,
    warnings,
  };
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
  landmarks.push({
    instanceId: `${typeId}_respawn_${counter}`,
    type: landmarkType,
    gridX: x,
    gridY: y,
    consumed: false,
  });
}

function buildSummary(results: SimV2CycleResult[]): SimV2Summary {
  const endCauses: Record<string, number> = {};
  for (const r of results) {
    endCauses[r.endCause] = (endCauses[r.endCause] ?? 0) + 1;
  }
  return {
    cycleCount: results.length,
    maxLevel:     stat(results.map(r => r.maxLevel)),
    arrivals:     stat(results.map(r => r.arrivals)),
    kills:        stat(results.map(r => r.kills + r.bossKills)),
    bpRemaining:  stat(results.map(r => r.bpRemaining)),
    endCauses,
  };
}

function stat(values: number[]): Percentiles {
  if (values.length === 0) {
    return { min: 0, max: 0, avg: 0, p50: 0, p90: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    min: sorted[0]!,
    max: sorted[sorted.length - 1]!,
    avg: sum / sorted.length,
    p50: sorted[Math.floor(sorted.length * 0.5)]!,
    p90: sorted[Math.floor(sorted.length * 0.9)]!,
  };
}

if (process.argv[1]?.endsWith('sim-cycle-v2.ts')) {
  const argv = process.argv.slice(2);
  const parseArg = (name: string, fallback: string): string => {
    const idx = argv.findIndex(a => a === `--${name}`);
    return idx >= 0 && idx + 1 < argv.length ? argv[idx + 1]! : fallback;
  };
  const count = parseInt(parseArg('count', '10'), 10);
  const seedStart = parseInt(parseArg('seed', '42'), 10);
  const bpMax = parseInt(parseArg('bp', '30'), 10);
  const hp = parseInt(parseArg('hp', '100'), 10);
  const atk = parseInt(parseArg('atk', '50'), 10);
  const out = parseArg('out', `runs/${new Date().toISOString().slice(0, 10)}-sim-v2.jsonl`);
  const traitsRaw = parseArg('traits', '');
  const traits = traitsRaw ? (traitsRaw.split(',').map(s => s.trim()) as TraitId[]) : undefined;
  const maxArrivals = parseInt(parseArg('max-arrivals', '500'), 10);

  const result = runSimV2({
    count,
    seedStart,
    bpMax,
    heroHpMax: hp,
    heroAtkBase: atk,
    traits,
    maxArrivals,
    out,
  });

  console.log(`Wrote ${result.results.length} cycle results to ${out}`);
  console.log(`Summary:`, JSON.stringify(result.summary, null, 2));
}
