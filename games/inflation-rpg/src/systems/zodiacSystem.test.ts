/**
 * zodiacSystem.test.ts — C1057: 12 Zodiac Constellations Unit Tests.
 */

import { describe, it, expect } from 'vitest';
import {
  ALL_ZODIAC_SIGNS,
  ZODIAC_DEFINITIONS,
  canUnlockZodiacNode,
  unlockZodiacNode,
  computeZodiacResonance,
  type ZodiacSign,
} from './zodiacSystem';

describe('C1057 [system]: 12 Zodiac Constellations Resonance Engine', () => {
  describe('1. Definitions & Schema', () => {
    it('defines exactly 12 Eastern Zodiac signs with complete metadata', () => {
      expect(ALL_ZODIAC_SIGNS).toHaveLength(12);
      for (const sign of ALL_ZODIAC_SIGNS) {
        const def = ZODIAC_DEFINITIONS[sign];
        expect(def.nameKR).toBeTruthy();
        expect(def.animalKR).toBeTruthy();
        expect(def.emoji).toBeTruthy();
        expect(def.hanja).toBeTruthy();
        expect(def.costCrackStones).toBeGreaterThan(0);
        expect(def.description).toBeTruthy();
        expect(def.bonuses).toBeDefined();
      }
    });
  });

  describe('2. Unlocking Constellations', () => {
    it('canUnlockZodiacNode checks crackStones and prevents duplicate unlock', () => {
      // Rat costs 5 crackStones
      expect(canUnlockZodiacNode('rat', 5, [])).toBe(true);
      expect(canUnlockZodiacNode('rat', 4, [])).toBe(false);
      expect(canUnlockZodiacNode('rat', 10, ['rat'])).toBe(false); // already unlocked
    });

    it('unlockZodiacNode appends sign and reports stones spent', () => {
      const res = unlockZodiacNode('ox', 10, ['rat']);
      expect(res.success).toBe(true);
      expect(res.newUnlocked).toEqual(['rat', 'ox']);
      expect(res.stonesSpent).toBe(5);
      expect(res.message).toContain('축의 성좌');
    });

    it('unlockZodiacNode rejects duplicate unlock or insufficient stones', () => {
      const dup = unlockZodiacNode('rat', 10, ['rat']);
      expect(dup.success).toBe(false);
      expect(dup.message).toContain('이미 해금된');

      const poor = unlockZodiacNode('tiger', 2, []);
      expect(poor.success).toBe(false);
      expect(poor.message).toContain('차원 균열석이 부족');
    });
  });

  describe('3. Computing Aggregate Resonance Bonuses', () => {
    it('returns empty bonuses when no signs are unlocked', () => {
      const empty = computeZodiacResonance([]);
      expect(empty.unlockedCount).toBe(0);
      expect(empty.atkPercent).toBe(0);
      expect(empty.critRate).toBe(0);
    });

    it('aggregates bonuses across multiple unlocked constellations', () => {
      // Rat (+4% critRate), Ox (+6% DEF), Tiger (+6% ATK)
      const bonus = computeZodiacResonance(['rat', 'ox', 'tiger']);
      expect(bonus.unlockedCount).toBe(3);
      expect(bonus.critRate).toBeCloseTo(0.04);
      expect(bonus.defPercent).toBe(6);
      expect(bonus.atkPercent).toBe(6);
    });

    it('calculates grand total resonance across all 12 constellations', () => {
      const allBonus = computeZodiacResonance([...ALL_ZODIAC_SIGNS]);
      expect(allBonus.unlockedCount).toBe(12);
      expect(allBonus.atkPercent).toBe(11); // Tiger 6 + Horse 5
      expect(allBonus.defPercent).toBe(6); // Ox 6
      expect(allBonus.hpPercent).toBe(18); // Goat 8 + Boar 10
      expect(allBonus.spdPercent).toBe(9); // Rabbit 5 + Horse 4
      expect(allBonus.critRate).toBeCloseTo(0.06); // Rat 0.04 + Rooster 0.02
      expect(allBonus.damageReduction).toBeCloseTo(0.03); // Dog 0.03
      expect(allBonus.elementalDmgPercent).toBe(8); // Dragon 8
      expect(allBonus.goldBonusPercent).toBe(18); // Monkey 10 + Boar 8
    });
  });
});
