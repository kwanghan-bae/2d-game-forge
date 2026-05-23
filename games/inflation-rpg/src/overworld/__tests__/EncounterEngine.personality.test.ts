import { describe, it, expect } from 'vitest';
import { EncounterEngine } from '../EncounterEngine';
import { HeroEntity } from '../../hero/HeroEntity';
import { SeededRng } from '../../cycle/SeededRng';
import type { OverworldEvent } from '../OverworldEvents';

const baseOpts = { seed: 1, heroHpMax: 100, heroAtkBase: 50 };

function makeEngine(seed = 1): EncounterEngine {
  return new EncounterEngine(new SeededRng(seed));
}

function moralChoices(events: OverworldEvent[]): Extract<OverworldEvent, { type: 'moral_choice' }>[] {
  return events.filter(e => e.type === 'moral_choice') as Extract<OverworldEvent, { type: 'moral_choice' }>[];
}

describe('EncounterEngine — V1c-1 personality drift landmarks', () => {
  it.each([
    ['watchtower',    'heroic'],
    ['treasure_cave', 'prudent'],
    ['holy_ruin',     'pious'],
    ['crossroads',    'moral'],
  ] as const)('%s emits a moral_choice on the %s dim with delta ±3', (kind, dim) => {
    const hero = HeroEntity.create(baseOpts);
    const engine = makeEngine();
    const events = engine.resolveEncounter(hero, kind, `${kind}_1`);
    const choices = moralChoices(events);
    expect(choices).toHaveLength(1);
    const c = choices[0]!;
    expect(c.dim).toBe(dim);
    expect(Math.abs(c.delta)).toBe(3);
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

  it('procs sometimes on regular enemy kills (probabilistic, > 0 and < N over 60 seeds)', () => {
    const fires = killCount(100, 60, 'enemy');
    expect(fires).toBeGreaterThan(0);
    expect(fires).toBeLessThan(60);
  });

  it('never procs on boss kills', () => {
    const fires = killCount(200, 60, 'boss');
    expect(fires).toBe(0);
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
    expect(sparing.delta).toBe(3);
    expect(sparing.choice).toBe('spare_enemy');

    const heroExecuting = HeroEntity.create({ ...baseOpts, heroAtkBase: 9999 });
    heroExecuting.personality.adjust('merciful', -4);
    const eventsExecuting = makeEngine(firingSeed).resolveEncounter(heroExecuting, 'enemy', 'e_2');
    const executing = moralChoices(eventsExecuting).find(c => c.dim === 'merciful')!;
    expect(executing.delta).toBe(-3);
    expect(executing.choice).toBe('execute_enemy');
  });
});
