import { describe, it, expect } from 'vitest';
import { CycleControllerV2 } from '../CycleControllerV2';

describe('CycleControllerV2', () => {
  it('constructs without crashing', () => {
    const ctrl = new CycleControllerV2({
      seed: 42,
      traits: [],
      bpMax: 30,
      heroHpMax: 100,
      heroAtkBase: 100000,
    });
    expect(ctrl.getHero().name.length).toBeGreaterThan(0);
    expect(ctrl.getHero().dead).toBe(false);
  });

  it('handleArrival on enemy → at least one event emitted', () => {
    const ctrl = new CycleControllerV2({
      seed: 42,
      traits: [],
      bpMax: 30,
      heroHpMax: 100,
      heroAtkBase: 100000,
    });
    const events = ctrl.handleArrival('enemy', 'wolf_1');
    expect(events.length).toBeGreaterThan(0);
  });

  it('handleArrival drains BP across many encounters → hero dies → cycle ends', () => {
    const ctrl = new CycleControllerV2({
      seed: 42,
      traits: [],
      bpMax: 3,
      heroHpMax: 100,
      heroAtkBase: 100000,
    });
    for (let i = 0; i < 10; i++) ctrl.handleArrival('enemy', `wolf_${i}`);
    expect(ctrl.getHero().dead).toBe(true);
  });

  it('finalize produces a CycleSaga with events recorded', () => {
    const ctrl = new CycleControllerV2({
      seed: 42,
      traits: [],
      bpMax: 5,
      heroHpMax: 100,
      heroAtkBase: 100000,
    });
    for (let i = 0; i < 10 && !ctrl.getHero().dead; i++) {
      ctrl.handleArrival('enemy', `wolf_${i}`);
    }
    const saga = ctrl.finalize();
    expect(saga.hero.name.length).toBeGreaterThan(0);
    expect(saga.chapters.flatMap(c => c.events).length).toBeGreaterThan(0);
  });
});
