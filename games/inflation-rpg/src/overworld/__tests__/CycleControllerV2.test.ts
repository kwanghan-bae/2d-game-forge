import { describe, it, expect } from 'vitest';
import { CycleControllerV2 } from '../CycleControllerV2';
import { PERSONALITY_DIMS } from '../../hero/PersonalityState';

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

  it('getSeed() returns the input seed', () => {
    const ctrl = new CycleControllerV2({ seed: 12345, traits: [], bpMax: 30, heroHpMax: 100, heroAtkBase: 100000 });
    expect(ctrl.getSeed()).toBe(12345);
  });

  it('same seed produces same personality (determinism)', () => {
    const makeCtrl = (seed: number) => new CycleControllerV2({ seed, traits: [], bpMax: 30, heroHpMax: 100, heroAtkBase: 100000 });
    const a = makeCtrl(77);
    const b = makeCtrl(77);
    const snapA = a.getHero().personality.snapshot();
    const snapB = b.getHero().personality.snapshot();
    expect(snapA).toEqual(snapB);
    // At least 2 dims must be non-zero (personality engaged)
    const nonZero = PERSONALITY_DIMS.filter(d => snapA[d] !== 0);
    expect(nonZero.length).toBeGreaterThanOrEqual(2);
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

describe('CycleControllerV2 chapter_transition', () => {
  it('emits chapter_transition when hero crosses 어린시절 → 청년기 boundary', () => {
    const ctrl = new CycleControllerV2({
      seed: 42,
      traits: [],
      bpMax: 30,
      heroHpMax: 100,
      heroAtkBase: 100000,
    });
    // Hero starts at age 5 (어린시절). With bpMax=30 each enemy arrival drains
    // some BP and the age advances. Run arrivals until the hero reaches 청년기
    // (age >= 15) or dies, collecting all events.
    const collected: Array<ReturnType<typeof ctrl.handleArrival>[number]> = [];
    for (let i = 0; i < 20; i++) {
      const evs = ctrl.handleArrival('enemy', `wolf_${i}`);
      collected.push(...evs);
      if (ctrl.getHero().dead) break;
      if (ctrl.getHero().chapter === '청년기' || ctrl.getHero().chapter !== '어린시절') break;
    }
    const transitions = collected.filter(e => e.type === 'chapter_transition');
    expect(transitions.length).toBeGreaterThanOrEqual(1);
    const first = transitions[0]!;
    if (first.type !== 'chapter_transition') throw new Error('narrowing'); // type-narrow
    expect(first.fromChapter).toBe('어린시절');
    expect(first.toChapter).toBe('청년기');
    expect(first.atAge).toBeGreaterThanOrEqual(15);
  });

  it('emits no chapter_transition when hero stays in 어린시절', () => {
    const ctrl = new CycleControllerV2({
      seed: 42,
      traits: [],
      bpMax: 30,
      heroHpMax: 100,
      heroAtkBase: 100000,
    });
    // Single arrival — age moves a small amount, chapter unchanged.
    const events = ctrl.handleArrival('enemy', 'wolf_1');
    const transitions = events.filter(e => e.type === 'chapter_transition');
    expect(transitions).toHaveLength(0);
    expect(ctrl.getHero().chapter).toBe('어린시절');
  });
});
