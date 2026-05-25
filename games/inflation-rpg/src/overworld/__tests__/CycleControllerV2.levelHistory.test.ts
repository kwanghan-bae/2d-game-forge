/**
 * Cycle 111 F1+F3 — CycleControllerV2 ↔ LevelHistoryBuffer integration tests.
 *
 *  C3 controller integration — push at every handleArrival/resolve path
 *  C4 last-entry invariant — last sample matches hero state after push
 *  C10 finalize() attaches levelHistory to the CycleSaga
 */

import { describe, it, expect } from 'vitest';
import { CycleControllerV2 } from '../CycleControllerV2';

describe('CycleControllerV2 level history (cycle 111 F1)', () => {
  it('starts with empty levelHistory', () => {
    const ctrl = new CycleControllerV2({ seed: 1, traits: [], heroHpMax: 100, heroAtkBase: 100 });
    expect(ctrl.getLevelHistory()).toEqual([]);
  });

  it('pushes a snapshot for every handleArrival call (C3)', () => {
    const ctrl = new CycleControllerV2({ seed: 1, traits: [], heroHpMax: 100, heroAtkBase: 100_000 });
    const before = ctrl.getLevelHistory().length;
    for (let i = 0; i < 10; i++) {
      ctrl.handleArrival('enemy', `e${i}`);
    }
    const after = ctrl.getLevelHistory().length;
    // Each handleArrival pushes 1 snapshot (no decimation < 60).
    expect(after - before).toBe(10);
  });

  it('last entry reflects most recent hero level + age (C4)', () => {
    const ctrl = new CycleControllerV2({ seed: 7, traits: [], heroHpMax: 100, heroAtkBase: 100_000 });
    ctrl.handleArrival('enemy', 'e1');
    ctrl.handleArrival('enemy', 'e2');
    const hero = ctrl.getHero();
    const samples = ctrl.getLevelHistory();
    const last = samples[samples.length - 1]!;
    expect(last.level).toBe(hero.level);
    expect(last.age).toBe(hero.age);
  });

  it('arrivalIndex increases monotonically (C4)', () => {
    const ctrl = new CycleControllerV2({ seed: 7, traits: [], heroHpMax: 100, heroAtkBase: 100_000 });
    for (let i = 0; i < 20; i++) {
      ctrl.handleArrival('enemy', `e${i}`);
    }
    const samples = ctrl.getLevelHistory();
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]!.arrivalIndex).toBeGreaterThan(samples[i - 1]!.arrivalIndex);
    }
  });

  it('decimates when arrivals exceed capacity (long cycle) (C3)', () => {
    const ctrl = new CycleControllerV2({ seed: 7, traits: [], heroHpMax: 100, heroAtkBase: 100_000 });
    for (let i = 0; i < 150; i++) {
      ctrl.handleArrival('enemy', `e${i}`);
    }
    const samples = ctrl.getLevelHistory();
    // After 150 pushes: stride 1 → 60, decimate to 30, stride 2; pushes
    // 61-120 add 30 more (stride 2 → 60), decimate to 30, stride 4; pushes
    // 121-150 add (150-120)/4 = 7-8 more entries → 37-38.
    expect(samples.length).toBeGreaterThanOrEqual(30);
    expect(samples.length).toBeLessThanOrEqual(60);
  });

  it('finalize() attaches levelHistory to CycleSaga (F3)', () => {
    const ctrl = new CycleControllerV2({ seed: 1, traits: [], heroHpMax: 100, heroAtkBase: 100_000 });
    for (let i = 0; i < 5; i++) {
      ctrl.handleArrival('enemy', `e${i}`);
    }
    const saga = ctrl.finalize();
    expect(saga.levelHistory).toBeDefined();
    expect(saga.levelHistory!.length).toBe(5);
    // Last entry of finalized saga = last entry of controller's buffer.
    expect(saga.levelHistory![saga.levelHistory!.length - 1]).toEqual(
      ctrl.getLevelHistory()[ctrl.getLevelHistory().length - 1],
    );
  });
});
