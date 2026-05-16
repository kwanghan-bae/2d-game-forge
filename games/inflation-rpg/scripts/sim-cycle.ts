#!/usr/bin/env tsx
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { AutoBattleController, type ControllerLoadout } from '../src/cycle/AutoBattleController';
import type { CycleResult, CycleEvent } from '../src/cycle/cycleEvents';
import type { TraitId } from '../src/cycle/traits';

export interface SimOptions {
  count: number;
  seedStart: number;
  loadout: ControllerLoadout;
  /** Trait IDs applied to every cycle in this sim run. */
  traits?: TraitId[];
  /** Hard cap to avoid infinite loops if BP never drops. */
  maxTickMs: number;
  /** Optional JSONL output path. If omitted, no file is written. */
  out?: string;
}

export interface SimOutput {
  results: CycleResult[];
  summary: SimSummary;
}

export interface SimSummary {
  cycleCount: number;
  durationMs: { min: number; max: number; avg: number; p50: number; p90: number };
  maxLevel: { min: number; max: number; avg: number; p50: number; p90: number };
  reasons: Record<string, number>;
}

const TICK_MS = 100;

export function runSim(opts: SimOptions): SimOutput {
  const results: CycleResult[] = [];
  const allEvents: CycleEvent[][] = [];

  for (let i = 0; i < opts.count; i++) {
    const seed = opts.seedStart + i;
    const ctrl = new AutoBattleController({ loadout: opts.loadout, seed, traits: opts.traits });
    let t = 0;
    while (t < opts.maxTickMs && !ctrl.getState().ended) {
      ctrl.tick(TICK_MS);
      t += TICK_MS;
    }
    if (!ctrl.getState().ended) {
      ctrl.abandon(); // forced timeout
    }
    const result = ctrl.getResult();
    if (result) results.push(result);
    allEvents.push([...ctrl.getEvents()]);
  }

  if (opts.out) {
    mkdirSync(dirname(opts.out), { recursive: true });
    const jsonl = allEvents
      .flatMap((evs, cycleIdx) =>
        evs.map(ev => JSON.stringify({ cycleIdx, ...ev }))
      )
      .join('\n');
    writeFileSync(opts.out, jsonl + '\n', 'utf-8');
  }

  const summary = buildSummary(results);

  if (opts.out) {
    const summaryPath = opts.out.replace(/\.jsonl?$/, '') + '.summary.json';
    writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf-8');
  }

  return { results, summary };
}

function buildSummary(results: CycleResult[]): SimSummary {
  const durationMs = results.map(r => r.durationMs);
  const maxLevel = results.map(r => r.maxLevel);
  const reasons: Record<string, number> = {};
  for (const r of results) {
    reasons[r.reason] = (reasons[r.reason] ?? 0) + 1;
  }
  return {
    cycleCount: results.length,
    durationMs: stat(durationMs),
    maxLevel: stat(maxLevel),
    reasons,
  };
}

function stat(values: number[]): SimSummary['durationMs'] {
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

// CLI entry — runs when invoked via `tsx scripts/sim-cycle.ts`.
if (process.argv[1]?.endsWith('sim-cycle.ts')) {
  const argv = process.argv.slice(2);
  const parseArg = (name: string, fallback: string): string => {
    const idx = argv.findIndex(a => a === `--${name}`);
    return idx >= 0 && idx + 1 < argv.length ? argv[idx + 1]! : fallback;
  };
  const count = parseInt(parseArg('count', '10'), 10);
  const seedStart = parseInt(parseArg('seed', '42'), 10);
  const charId = parseArg('char', 'K01');
  const bpMax = parseInt(parseArg('bp', '30'), 10);
  const out = parseArg('out', `runs/${new Date().toISOString().slice(0, 10)}-sim.jsonl`);
  const traitsRaw = parseArg('traits', '');
  const traits = traitsRaw ? (traitsRaw.split(',').map(s => s.trim()) as TraitId[]) : undefined;

  const result = runSim({
    count,
    seedStart,
    loadout: {
      characterId: charId,
      bpMax,
      heroHpMax: 100,
      heroAtkBase: 50,
    },
    traits,
    maxTickMs: 5 * 60 * 1000, // 5-min cap per cycle
    out,
  });

  console.log(`Wrote ${result.results.length} cycle results.`);
  console.log(`Summary:`, JSON.stringify(result.summary, null, 2));
}
