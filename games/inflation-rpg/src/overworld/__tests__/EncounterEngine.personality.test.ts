import { describe, it, expect } from 'vitest';
import { EncounterEngine, MERCIFUL_PROC_RATE } from '../EncounterEngine';
import { HeroEntity } from '../../hero/HeroEntity';
import { PersonalityState } from '../../hero/PersonalityState';
import { SeededRng } from '../../cycle/SeededRng';
import type { OverworldEvent } from '../OverworldEvents';

const baseOpts = { seed: 1, heroHpMax: 100, heroAtkBase: 50 };

function makeHero(): HeroEntity {
  const hero = HeroEntity.create(baseOpts);
  // HeroSpawner seeds random priors; reset to neutral for deterministic branch
  // tests below.
  hero.personality = new PersonalityState();
  return hero;
}

function makeEngine(seed = 1): EncounterEngine {
  return new EncounterEngine(new SeededRng(seed));
}

function moralChoices(events: OverworldEvent[]): Extract<OverworldEvent, { type: 'moral_choice' }>[] {
  return events.filter(e => e.type === 'moral_choice') as Extract<OverworldEvent, { type: 'moral_choice' }>[];
}

describe('EncounterEngine — V1c-1 personality drift landmarks', () => {
  // cycle 1 F1: holy_ruin positive delta 가 3 → 2 로 약화됨 (mage saturation 완화).
  // 다른 landmark 와 negative 분기는 ±3 유지.
  it.each([
    ['watchtower',    'heroic',  3, 3],
    ['treasure_cave', 'prudent', 4, 3], // cycle 27 D2: positive 3 → 4
    ['holy_ruin',     'pious',   2, 3], // positive 2, negative 3 (asymmetric)
    ['crossroads',    'moral',   3, 3],
  ] as const)('%s emits a moral_choice on the %s dim with expected ±delta', (kind, dim, posDelta, negDelta) => {
    const hero = makeHero();
    const engine = makeEngine();
    const events = engine.resolveEncounter(hero, kind, `${kind}_1`);
    const choices = moralChoices(events);
    expect(choices).toHaveLength(1);
    const c = choices[0]!;
    expect(c.dim).toBe(dim);
    // Prior=0 selects positive branch (current >= 0).
    expect(c.delta).toBe(posDelta);
    void negDelta; // negative branch covered by the dedicated branch test below.
  });

  it('selects positive branch when current >= 0 and negative when current < 0', () => {
    const heroPositive = HeroEntity.create(baseOpts);
    heroPositive.personality.adjust('heroic', 4); // > 0
    const engine = makeEngine();
    const positiveEvents = engine.resolveEncounter(heroPositive, 'watchtower', 'wt_pos');
    const positive = moralChoices(positiveEvents)[0]!;
    expect(positive.delta).toBe(3);

    const heroNegative = HeroEntity.create(baseOpts);
    heroNegative.personality.adjust('heroic', -4); // < 0
    const negativeEvents = engine.resolveEncounter(heroNegative, 'watchtower', 'wt_neg');
    const negative = moralChoices(negativeEvents)[0]!;
    expect(negative.delta).toBe(-3);
  });

  it('drift landmarks do not damage hp and leave hero uninjured', () => {
    const hero = HeroEntity.create(baseOpts);
    const startHp = hero.hp;
    const engine = makeEngine();
    engine.resolveEncounter(hero, 'watchtower', 'wt_1');
    engine.resolveEncounter(hero, 'treasure_cave', 'tc_1');
    engine.resolveEncounter(hero, 'holy_ruin', 'hr_1');
    engine.resolveEncounter(hero, 'crossroads', 'cr_1');
    expect(hero.hp).toBe(startHp);
    expect(hero.staggered).toBe(false);
  });

  it('mutates the hero personality matching the emitted delta', () => {
    const hero = HeroEntity.create(baseOpts);
    const before = hero.personality.get('pious');
    const engine = makeEngine();
    const events = engine.resolveEncounter(hero, 'holy_ruin', 'hr_1');
    const c = moralChoices(events)[0]!;
    expect(hero.personality.get('pious')).toBe(before + c.delta);
  });

  // cycle 1 F1: holy_ruin asymmetric delta — positive +2 (약화), negative -3 (그대로).
  // 의도: mage saturation 완화 (pious 누적 source 약화) 와 cliff 방어 (pious 음수 절벽은
  // priest/apprentice 로 흡수되어 mage 와 무관) 의 분리.
  it('holy_ruin negative branch keeps delta=-3 (asymmetric)', () => {
    const hero = makeHero();
    hero.personality.adjust('pious', -4); // < 0 → negative
    const engine = makeEngine();
    const events = engine.resolveEncounter(hero, 'holy_ruin', 'hr_neg');
    const c = moralChoices(events)[0]!;
    expect(c.delta).toBe(-3);
  });
});

describe('EncounterEngine — V1c-1 merciful battle_won proc', () => {
  function killCount(seedStart: number, n: number, kind: 'enemy' | 'boss') {
    let mercifulEvents = 0;
    for (let i = 0; i < n; i++) {
      const hero = HeroEntity.create({ ...baseOpts, heroAtkBase: 9999 }); // one-hit guarantee
      const engine = makeEngine(seedStart + i);
      const events = engine.resolveEncounter(hero, kind, `${kind}_${i}`);
      if (moralChoices(events).some(c => c.dim === 'merciful')) mercifulEvents += 1;
    }
    return mercifulEvents;
  }

  it('procs sometimes on regular enemy kills (probabilistic, > 0 and < N over 200 seeds)', () => {
    const fires = killCount(100, 200, 'enemy');
    expect(fires).toBeGreaterThan(0);
    expect(fires).toBeLessThan(200);
  });

  it('never procs on boss kills', () => {
    const fires = killCount(200, 60, 'boss');
    expect(fires).toBe(0);
  });

  it('F1.4: MERCIFUL_PROC_RATE 1000회 chance → 평균 40 ± 30% (28-52) (cycle 321 lever 5)', () => {
    // cycle 321: rate 0.07 → 0.04. expected mean 40 ± 30% range (wider noise band).
    const rng = new SeededRng(42);
    let fires = 0;
    for (let i = 0; i < 1000; i++) {
      if (rng.chance(MERCIFUL_PROC_RATE)) fires += 1;
    }
    expect(fires).toBeGreaterThanOrEqual(28);
    expect(fires).toBeLessThanOrEqual(52);
  });

  it('positive branch when merciful >= 0, negative when < 0', () => {
    // Hunt a seed that actually procs the merciful event end-to-end. The
    // engine's RNG schedule isn't just chance(0.15) — drop roll, drop pick,
    // then merciful chance — so probe via the real resolveEncounter path.
    let firingSeed = -1;
    for (let s = 0; s < 500 && firingSeed === -1; s++) {
      const probe = HeroEntity.create({ ...baseOpts, heroAtkBase: 9999 });
      probe.personality.adjust('merciful', 4);
      const events = makeEngine(s).resolveEncounter(probe, 'enemy', 'probe');
      if (moralChoices(events).some(c => c.dim === 'merciful')) firingSeed = s;
    }
    expect(firingSeed).toBeGreaterThanOrEqual(0);

    const heroSparing = HeroEntity.create({ ...baseOpts, heroAtkBase: 9999 });
    heroSparing.personality.adjust('merciful', 4);
    const eventsSparing = makeEngine(firingSeed).resolveEncounter(heroSparing, 'enemy', 'e_1');
    const sparing = moralChoices(eventsSparing).find(c => c.dim === 'merciful')!;
    expect(sparing.delta).toBe(2);
    expect(sparing.choice).toBe('spare_enemy');

    const heroExecuting = HeroEntity.create({ ...baseOpts, heroAtkBase: 9999 });
    heroExecuting.personality.adjust('merciful', -4);
    const eventsExecuting = makeEngine(firingSeed).resolveEncounter(heroExecuting, 'enemy', 'e_2');
    const executing = moralChoices(eventsExecuting).find(c => c.dim === 'merciful')!;
    expect(executing.delta).toBe(-2);
    expect(executing.choice).toBe('execute_enemy');
  });
});

describe('Cycle 298 — MERCIFUL_DRIFT invariant (cycle 297 lever 정합 가드)', () => {
  it('sparing branch delta = 2 (cycle 297 nerf, 3 → 2)', () => {
    // cycle 297 lever 검증 — 미래 drift 변경 시 자동 fail.
    const hero = HeroEntity.create({ seed: 1, heroHpMax: 100, heroAtkBase: 9999 });
    hero.personality.adjust('merciful', 4); // > 0 → sparing
    // proc seed scan for firing
    for (let s = 0; s < 200; s++) {
      const engine = new EncounterEngine(new SeededRng(s));
      const evs = engine.resolveEncounter(hero, 'enemy', `e_${s}`);
      const c = evs.find(e => e.type === 'moral_choice' && e.dim === 'merciful');
      if (c && c.type === 'moral_choice') {
        expect(c.delta).toBe(2);
        expect(c.choice).toBe('spare_enemy');
        return;
      }
    }
    throw new Error('No merciful proc fired in 200 seeds');
  });
});
