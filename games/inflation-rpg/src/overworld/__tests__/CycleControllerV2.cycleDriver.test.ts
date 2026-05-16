import { describe, it, expect } from 'vitest';
import { CycleControllerV2 } from '../CycleControllerV2';
import type { CycleSaga } from '../../saga/SagaTypes';
import type { LandmarkKind } from '../../data/landmarks';

function driveCycle(
  seed: number,
  maxEvents = 200,
): { saga: CycleSaga; iterations: number } {
  const ctrl = new CycleControllerV2({
    seed,
    traits: [],
    bpMax: 30,
    heroHpMax: 100,
    heroAtkBase: 100000,
  });
  let i = 0;
  // Alternate encounter kinds that cover enemy + boss + village patterns
  const kinds: LandmarkKind[] = ['enemy', 'enemy', 'enemy', 'boss', 'enemy', 'village', 'enemy', 'enemy'];
  while (!ctrl.getHero().dead && i < maxEvents) {
    const kind = kinds[i % kinds.length];
    ctrl.handleArrival(kind, `${kind}_${i}`);
    i++;
  }
  return { saga: ctrl.finalize(), iterations: i };
}

describe('CycleControllerV2 headless driver', () => {
  it('cycle ends within 100 iterations (BP exhaustion)', () => {
    const { iterations } = driveCycle(42);
    expect(iterations).toBeLessThan(100);
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

  it('hero is dead at end of driven cycle', () => {
    const { saga } = driveCycle(123);
    // cause is set — cycle ended with a known cause
    expect(saga.hero.cause).toBeTruthy();
  });

  it('saga has hero name matching controller hero name', () => {
    const ctrl = new CycleControllerV2({ seed: 77, traits: [], bpMax: 10, heroHpMax: 100, heroAtkBase: 100000 });
    for (let i = 0; i < 20 && !ctrl.getHero().dead; i++) {
      ctrl.handleArrival('enemy', `enemy_${i}`);
    }
    const saga = ctrl.finalize();
    expect(saga.hero.name).toBe(ctrl.getHero().name);
  });
});
