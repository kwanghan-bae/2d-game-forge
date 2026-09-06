/**
 * zodiacPetResonance.test.ts — C1061: Zodiac & Divine Beast Resonance Unit Tests.
 */

import { describe, it, expect } from 'vitest';
import {
  ZODIAC_PET_RESONANCES,
  getActiveZodiacPetResonances,
  computeZodiacPetResonanceBonus,
} from './zodiacPetResonance';

describe('C1061 [system]: Zodiac & Pet Cross-System Resonance Engine', () => {
  describe('1. Resonance Schema & Synergy Pairs', () => {
    it('defines exactly 4 divine beast astrological synergies', () => {
      expect(ZODIAC_PET_RESONANCES).toHaveLength(4);

      const pairs = ZODIAC_PET_RESONANCES.map(r => ({ pet: r.petId, zodiac: r.requiredZodiac }));
      expect(pairs).toEqual([
        { pet: 'white_tiger', zodiac: 'tiger' },
        { pet: 'azure_dragon', zodiac: 'dragon' },
        { pet: 'vermilion_bird', zodiac: 'horse' },
        { pet: 'black_tortoise', zodiac: 'snake' },
      ]);
    });
  });

  describe('2. Active Resonance Resolution', () => {
    it('returns empty array when no active pet or no zodiacs unlocked', () => {
      expect(getActiveZodiacPetResonances(null, ['tiger'])).toHaveLength(0);
      expect(getActiveZodiacPetResonances('white_tiger', [])).toHaveLength(0);
      expect(getActiveZodiacPetResonances('white_tiger', ['rat', 'ox'])).toHaveLength(0);
    });

    it('activates White Tiger synergy when Tiger constellation is unlocked', () => {
      const active = getActiveZodiacPetResonances('white_tiger', ['tiger', 'rat']);
      expect(active).toHaveLength(1);
      expect(active[0].nameKR).toBe('호랑이의 영험한 포효');
    });

    it('activates Azure Dragon synergy when Dragon constellation is unlocked', () => {
      const active = getActiveZodiacPetResonances('azure_dragon', ['dragon', 'ox']);
      expect(active).toHaveLength(1);
      expect(active[0].nameKR).toBe('푸른 용의 천벌');
    });

    it('activates Vermilion Bird synergy when Horse constellation is unlocked', () => {
      const active = getActiveZodiacPetResonances('vermilion_bird', ['horse', 'tiger']);
      expect(active).toHaveLength(1);
      expect(active[0].nameKR).toBe('불사조의 태양 비상');
    });

    it('activates Black Tortoise synergy when Snake constellation is unlocked', () => {
      const active = getActiveZodiacPetResonances('black_tortoise', ['snake', 'dragon']);
      expect(active).toHaveLength(1);
      expect(active[0].nameKR).toBe('현무의 귀사합일');
    });
  });

  describe('3. Computing Resonance Stat Multipliers', () => {
    it('calculates White Tiger + Tiger bonuses (+10% ATK, +5% Crit Rate)', () => {
      const bonus = computeZodiacPetResonanceBonus('white_tiger', ['tiger']);
      expect(bonus.atkPercent).toBe(10);
      expect(bonus.critRate).toBeCloseTo(0.05);
      expect(bonus.defPercent).toBe(0);
      expect(bonus.activeResonances).toHaveLength(1);
    });

    it('calculates Azure Dragon + Dragon bonuses (+12% Lightning DMG, +6% SPD)', () => {
      const bonus = computeZodiacPetResonanceBonus('azure_dragon', ['dragon']);
      expect(bonus.elementalDmgPercent).toBe(12);
      expect(bonus.spdPercent).toBe(6);
      expect(bonus.activeResonances).toHaveLength(1);
    });

    it('calculates Vermilion Bird + Horse bonuses (+10% Fire DMG, +5% HP)', () => {
      const bonus = computeZodiacPetResonanceBonus('vermilion_bird', ['horse']);
      expect(bonus.elementalDmgPercent).toBe(10);
      expect(bonus.hpPercent).toBe(5);
      expect(bonus.activeResonances).toHaveLength(1);
    });

    it('calculates Black Tortoise + Snake bonuses (+10% DEF, +3% DR)', () => {
      const bonus = computeZodiacPetResonanceBonus('black_tortoise', ['snake']);
      expect(bonus.defPercent).toBe(10);
      expect(bonus.damageReduction).toBeCloseTo(0.03);
      expect(bonus.activeResonances).toHaveLength(1);
    });

    it('returns zeroes when active pet does not match unlocked constellations', () => {
      const bonus = computeZodiacPetResonanceBonus('white_dragon' as any, ['tiger']);
      expect(bonus.atkPercent).toBe(0);
      expect(bonus.activeResonances).toHaveLength(0);
    });
  });
});
