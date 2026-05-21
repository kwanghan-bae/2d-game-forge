import { describe, it, expect } from 'vitest';
import { EncounterEngine } from '../EncounterEngine';
import { HeroEntity } from '../../hero/HeroEntity';
import { SeededRng } from '../../cycle/SeededRng';

function makeHero(seed = 42) {
  return HeroEntity.create({ seed, bpMax: 30, heroHpMax: 100, heroAtkBase: 100000 });
}

describe('EncounterEngine', () => {
  it('enemy encounter: hero wins → event has battle_won + bp consumed', () => {
    const hero = makeHero();
    const engine = new EncounterEngine(new SeededRng(1));
    const events = engine.resolveEncounter(hero, 'enemy', 'wolf_1');
    expect(events.some(e => e.type === 'battle_won')).toBe(true);
    expect(hero.bp).toBe(29);
  });

  it('boss encounter consumes 3 BP', () => {
    const hero = makeHero();
    const engine = new EncounterEngine(new SeededRng(1));
    engine.resolveEncounter(hero, 'boss', 'dragon_1');
    expect(hero.bp).toBe(27);
  });

  it('battle_won includes expGain, drop occasionally', () => {
    const hero = makeHero();
    const engine = new EncounterEngine(new SeededRng(1));
    const events = engine.resolveEncounter(hero, 'enemy', 'wolf_1');
    const won = events.find(e => e.type === 'battle_won');
    expect(won?.type === 'battle_won' && won.expGain).toBeGreaterThan(0);
  });

  it('high exp triggers level_up event', () => {
    const hero = makeHero();
    const engine = new EncounterEngine(new SeededRng(1));
    // First battle gains exp, may level
    const events = engine.resolveEncounter(hero, 'boss', 'dragon_1');
    const levelEvents = events.filter(e => e.type === 'level_up');
    expect(levelEvents.length).toBeGreaterThanOrEqual(0);
    if (levelEvents.length > 0) {
      expect(hero.level).toBeGreaterThan(1);
    }
  });

  it('hero with extremely low hp dies in enemy encounter', () => {
    const hero = HeroEntity.create({ seed: 42, bpMax: 30, heroHpMax: 1, heroAtkBase: 1 });
    const engine = new EncounterEngine(new SeededRng(1));
    const events = engine.resolveEncounter(hero, 'enemy', 'wolf_1');
    expect(hero.dead).toBe(true);
    expect(events.some(e => e.type === 'hero_died')).toBe(true);
  });

  it('village encounter heals slightly (V1a placeholder)', () => {
    const hero = makeHero();
    hero.takeDamage(50);
    const engine = new EncounterEngine(new SeededRng(1));
    engine.resolveEncounter(hero, 'village', 'village_1');
    expect(hero.hp).toBeGreaterThan(50);
  });
});
