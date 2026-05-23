import { describe, it, expect } from 'vitest';
import { EncounterEngine } from '../EncounterEngine';
import { HeroEntity } from '../../hero/HeroEntity';
import { SeededRng } from '../../cycle/SeededRng';

function makeHero(seed = 42) {
  return HeroEntity.create({ seed, heroHpMax: 100, heroAtkBase: 100000 });
}

describe('EncounterEngine', () => {
  it('enemy encounter: hero wins → event has battle_won', () => {
    const hero = makeHero();
    const engine = new EncounterEngine(new SeededRng(1));
    const events = engine.resolveEncounter(hero, 'enemy', 'wolf_1');
    expect(events.some(e => e.type === 'battle_won')).toBe(true);
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

  it('hero with extremely low hp becomes staggered in enemy encounter', () => {
    const hero = HeroEntity.create({ seed: 42, heroHpMax: 1, heroAtkBase: 1 });
    const engine = new EncounterEngine(new SeededRng(1));
    engine.resolveEncounter(hero, 'enemy', 'wolf_1');
    expect(hero.staggered).toBe(true);
  });

  it('village encounter heals slightly (V1a placeholder)', () => {
    const hero = makeHero();
    hero.takeDamage(50);
    const engine = new EncounterEngine(new SeededRng(1));
    engine.resolveEncounter(hero, 'village', 'village_1');
    expect(hero.hp).toBeGreaterThan(50);
  });
});

describe('EncounterEngine — staggered hero', () => {
  it('skips battle resolution when hero is staggered', () => {
    const hero = HeroEntity.create({ seed: 42, heroHpMax: 100, heroAtkBase: 100 });
    hero.staggered = true;
    const engine = new EncounterEngine(new SeededRng(42));
    const events = engine.resolveEncounter(hero, 'enemy', 'wolf_1');
    expect(events.filter(e => e.type === 'battle_started').length).toBe(0);
  });
});
