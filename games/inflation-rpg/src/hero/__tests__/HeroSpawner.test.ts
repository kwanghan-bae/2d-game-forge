import { describe, it, expect } from 'vitest';
import { HeroSpawner } from '../HeroSpawner';
import { SeededRng } from '../../cycle/SeededRng';
import { PERSONALITY_DIMS } from '../PersonalityState';

describe('HeroSpawner', () => {
  it('spawns a hero with non-empty name', () => {
    const rng = new SeededRng(42);
    const hero = HeroSpawner.spawn(rng);
    expect(hero.name).toBeTruthy();
    expect(hero.name.length).toBeGreaterThan(0);
  });

  it('same seed produces same name', () => {
    const a = HeroSpawner.spawn(new SeededRng(42));
    const b = HeroSpawner.spawn(new SeededRng(42));
    expect(a.name).toBe(b.name);
  });

  it('different seeds usually produce different names', () => {
    const a = HeroSpawner.spawn(new SeededRng(1));
    const b = HeroSpawner.spawn(new SeededRng(999));
    expect(a.name).not.toBe(b.name);
  });

  it('default starting state: age 5, job 평민, lv 1', () => {
    const hero = HeroSpawner.spawn(new SeededRng(7));
    expect(hero.age).toBe(5);
    expect(hero.job).toBe('평민');
    expect(hero.level).toBe(1);
    expect(hero.emoji).toBe('🧒');
  });

  it('personalityPriors has exactly 2 entries from PERSONALITY_DIMS', () => {
    const hero = HeroSpawner.spawn(new SeededRng(42));
    const entries = Object.entries(hero.personalityPriors);
    expect(entries.length).toBe(2);
    for (const [dim] of entries) {
      expect(PERSONALITY_DIMS).toContain(dim);
    }
  });

  it('personalityPriors values are non-zero integers in [-5, +5]', () => {
    const hero = HeroSpawner.spawn(new SeededRng(42));
    for (const [, val] of Object.entries(hero.personalityPriors)) {
      expect(val).not.toBe(0);
      expect(val).toBeGreaterThanOrEqual(-5);
      expect(val).toBeLessThanOrEqual(5);
    }
  });

  it('same seed produces same personalityPriors', () => {
    const a = HeroSpawner.spawn(new SeededRng(99));
    const b = HeroSpawner.spawn(new SeededRng(99));
    expect(a.personalityPriors).toEqual(b.personalityPriors);
  });
});
