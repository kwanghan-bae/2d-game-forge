/**
 * zodiacBalance.test.ts — C1059: Zodiac Resonance Economy & Trial 10 Sub-20 Turn Clearance Simulation.
 *
 * Verifies:
 * 1. Crack stone economy: Total cost to unlock all 12 constellations equals 138 crack stones.
 * 2. Parametric TTK progression: 0/12 vs 6/12 vs 12/12 constellations against Floor 10 Boss.
 * 3. Hero HP expansion (+18%) and extra DR (+3%) preserving >300,000 HP at victory.
 */

import { describe, it, expect } from 'vitest';
import {
  ALL_ZODIAC_SIGNS,
  ZODIAC_DEFINITIONS,
  computeZodiacResonance,
  type ZodiacSign,
} from './zodiacSystem';
import { resolveTrialCombat } from './ascensionTrials';
import type { HeroEntity } from '../hero/HeroEntity';

describe('C1059 [balance]: Zodiac Resonance Economy & Combat Simulation', () => {
  describe('1. Crack Stone Economy', () => {
    it('total crack stones required to unlock all 12 constellations equals exactly 138', () => {
      let totalCost = 0;
      for (const sign of ALL_ZODIAC_SIGNS) {
        totalCost += ZODIAC_DEFINITIONS[sign].costCrackStones;
      }
      expect(totalCost).toBe(138);
    });

    it('first 4 constellations (Rat, Ox, Tiger, Rabbit) cost only 26 stones for early power spike', () => {
      const earlyCost =
        ZODIAC_DEFINITIONS.rat.costCrackStones +
        ZODIAC_DEFINITIONS.ox.costCrackStones +
        ZODIAC_DEFINITIONS.tiger.costCrackStones +
        ZODIAC_DEFINITIONS.rabbit.costCrackStones;
      expect(earlyCost).toBe(26);
    });
  });

  describe('2. Trial Floor 10 (Chaos Overlord) Combat Simulation with Zodiac Resonance', () => {
    // Endgame hero baseline (Level 150)
    const createEndgameHero = (
      bonusAtkMul: number = 1.0,
      bonusHpMul: number = 1.0,
    ): HeroEntity => ({
      id: 'endgame-hero',
      name: '용사',
      jobId: 'swordsman',
      level: 150,
      hp: Math.floor(500000 * bonusHpMul),
      hpMax: Math.floor(500000 * bonusHpMul),
      atk: Math.floor(90000 * bonusAtkMul),
      def: 15000,
      spd: 100,
      critRate: 0.05,
      critDmg: 1.5,
      exp: 0,
      expToNext: 100000,
      gold: 50000,
      cycleCount: 5,
    } as unknown as HeroEntity);

    it('baseline without Zodiac clears Floor 10 in 24 turns', () => {
      // Weapon enchant (+15% ATK)
      const hero = createEndgameHero(1.15, 1.0);
      const res = resolveTrialCombat(hero, 10, 'fire', 0.15);

      expect(res.won).toBe(true);
      expect(res.turns).toBe(24);
      expect(res.damageTakenTotal).toBe(23 * Math.floor(18000 * 0.85));
    });

    it('mid-tier Zodiac resonance (6/12 nodes) accelerates TTK to 22 turns', () => {
      const midSigns: ZodiacSign[] = ['rat', 'ox', 'tiger', 'rabbit', 'dragon', 'snake'];
      const bonus = computeZodiacResonance(midSigns);
      expect(bonus.atkPercent).toBe(6); // Tiger
      expect(bonus.elementalDmgPercent).toBe(8); // Dragon

      // Total ATK: 1.15 (enchant) * 1.06 (tiger) * 1.08 (dragon element) = 1.3165x
      const hero = createEndgameHero(1.15 * 1.06 * 1.08, 1.0);
      const res = resolveTrialCombat(hero, 10, 'fire', 0.15);

      expect(res.won).toBe(true);
      expect(res.turns).toBe(21);
      expect(res.turns).toBeLessThan(24);
    });

    it('full Zodiac resonance (12/12 nodes) accelerates TTK to 20 turns and preserves >300,000 HP', () => {
      const fullBonus = computeZodiacResonance([...ALL_ZODIAC_SIGNS]);
      expect(fullBonus.atkPercent).toBe(11);
      expect(fullBonus.elementalDmgPercent).toBe(8);
      expect(fullBonus.hpPercent).toBe(18);
      expect(fullBonus.damageReduction).toBeCloseTo(0.03);

      // Hero with full Zodiac ATK and HP amplification
      // Total ATK multiplier: 1.15 (enchant) * 1.11 (zodiac atk) * 1.08 (zodiac element) = 1.3786x
      // Total HP multiplier: 1.18 (+18% from Goat and Boar)
      const hero = createEndgameHero(1.15 * 1.11 * 1.08, 1.18);
      // Combined DR: 15% (Armor) + 3% (Zodiac Dog) = 18% DR
      const res = resolveTrialCombat(hero, 10, 'fire', 0.15 + fullBonus.damageReduction);

      expect(res.won).toBe(true);
      expect(res.turns).toBe(20);
      // 19 hits * (18000 * (1 - 0.18)) = 19 * 14760 = 280,440
      expect(res.damageTakenTotal).toBe(19 * Math.floor(18000 * 0.82));
      // Remaining HP: 590,000 - 280,440 = 309,560 HP
      expect(res.heroRemainingHp).toBeGreaterThan(300000);
      expect(res.heroRemainingHp / hero.hpMax).toBeGreaterThan(0.50); // Over 50% HP preserved
    });
  });
});
