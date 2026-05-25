import { describe, it, expect } from 'vitest';
import { CycleControllerV2 } from '../CycleControllerV2';
import type { CycleSaga } from '../../saga/SagaTypes';
import type { LandmarkKind } from '../../data/landmarks';

// Realistic V1a stats (mirrors CyclePrepV2). Sim-G's inflation curve carries
// the load — no godmode atkBase. If you raise atkBase here just to make a
// test pass, you are masking a curve regression instead of catching it.
const REAL_ATK_BASE = 50;
const REAL_HP_BASE = 100;

function driveCycle(
  seed: number,
  maxEvents = 200,
): { saga: CycleSaga; iterations: number } {
  const ctrl = new CycleControllerV2({
    seed,
    traits: [],
    heroHpMax: REAL_HP_BASE,
    heroAtkBase: REAL_ATK_BASE,
  });
  let i = 0;
  // Alternate encounter kinds that cover enemy + boss + village patterns
  const kinds: LandmarkKind[] = ['enemy', 'enemy', 'enemy', 'boss', 'enemy', 'village', 'enemy', 'enemy'];
  while (i < maxEvents) {
    const kind = kinds[i % kinds.length];
    const evs = ctrl.handleArrival(kind, `${kind}_${i}`);
    // Cycle 109 F1: when boss_intro_offered emits, this driver picks cards[0]
    // (matches sim-cycle-v2.ts auto-choice policy). Without this, the boss
    // intro pause leaves the controller stuck for the rest of the loop.
    if (evs.some(e => e.type === 'boss_intro_offered')) {
      ctrl.resolveBossIntro(0);
    }
    i++;
  }
  return { saga: ctrl.finalize(), iterations: i };
}

describe('CycleControllerV2 headless driver', () => {
  it('hero age advances across 200 arrivals (action-time aging)', () => {
    const ctrl = new CycleControllerV2({
      seed: 42, traits: [],
      heroHpMax: REAL_HP_BASE, heroAtkBase: REAL_ATK_BASE,
    });
    const startAge = ctrl.getHero().age;
    for (let i = 0; i < 200; i++) ctrl.handleArrival('enemy', `wolf_${i}`);
    expect(ctrl.getHero().age).toBeGreaterThan(startAge);
  });

  it('saga covers multiple chapters after a full run', () => {
    const { saga } = driveCycle(42);
    const nonEmpty = saga.chapters.filter(c => c.events.length > 0);
    expect(nonEmpty.length).toBeGreaterThanOrEqual(2);
  });

  it('same seed produces same final maxLevel', () => {
    const a = driveCycle(99);
    const b = driveCycle(99);
    expect(a.saga.hero.finalLevel).toBe(b.saga.hero.finalLevel);
  });

  it('cycle ends with a known cause set in saga', () => {
    const { saga } = driveCycle(123);
    // cause is set — cycle ended with a known cause
    expect(saga.hero.cause).toBeTruthy();
  });

  it('saga has hero name matching controller hero name', () => {
    const ctrl = new CycleControllerV2({
      seed: 77, traits: [],
      heroHpMax: REAL_HP_BASE, heroAtkBase: REAL_ATK_BASE,
    });
    for (let i = 0; i < 20; i++) {
      ctrl.handleArrival('enemy', `enemy_${i}`);
    }
    const saga = ctrl.finalize();
    expect(saga.hero.name).toBe(ctrl.getHero().name);
  });

  it('reaches inflation territory (Sim-G regression guard)', () => {
    // Sim-G's success bar requires maxLevel ≥ 1,000 at P50 in the open-world
    // sim. The hardcoded `kinds[]` driver here is harsher (no enemy respawn,
    // forced boss encounters), but should still clear at least 100 with the
    // tuned curve. If this drops below 100, the inflation curve regressed.
    const { saga } = driveCycle(42);
    expect(saga.hero.finalLevel).toBeGreaterThanOrEqual(100);
  });

  it('ends via natural death (old age), not combat death', () => {
    // Sim-G's success bar requires ≥ 80% cycles end in 자연사. If a routine
    // run dies in 전사 with realistic stats, the curve regressed (hero ATK
    // can no longer outpace enemy HP).
    const { saga } = driveCycle(42);
    expect(saga.hero.cause).toBe('자연사');
  });
});
