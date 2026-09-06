/**
 * alchemyBalance.test.ts — C1065: Astral Alchemy Economy & Elixir Stat Expansion Combat Simulation.
 *
 * Verifies:
 * 1. Resource Economy: 40 elixir doses require 2,300 Starlight Shards (230 crack stones) + 500,000 Gold.
 * 2. Stat Saturation: Complete elixir ingestion grants +20% ATK, +20% HP, +20% DEF, +10 SPD, +10% Crit, +20% Elemental DMG, and +5% DR.
 * 3. Combat TTK Acceleration: Cuts Floor 10 Chaos Overlord combat turns from 24 to sub-15 turns, preserving >500,000 HP.
 */

import { describe, it, expect } from 'vitest';
import {
  ALL_ELIXIRS,
  ELIXIR_DEFINITIONS,
  MAX_ELIXIR_DOSES,
  computeElixirStatBonuses,
  canCraftElixir,
  craftAndConsumeElixir,
  transmuteToShards,
  type ElixirType,
} from './astralAlchemy';
import { ALL_ZODIAC_SIGNS, computeZodiacResonance } from './zodiacSystem';
import { resolveTrialCombat } from './ascensionTrials';
import type { HeroEntity } from '../hero/HeroEntity';

describe('C1065 [balance]: Astral Alchemy Economy & Combat Simulation', () => {
  describe('1. Resource Economy & Transmutation', () => {
    it('total starlight shards required to max all 4 elixirs equals 2,300 shards', () => {
      let totalShards = 0;
      for (const id of ALL_ELIXIRS) {
        totalShards += ELIXIR_DEFINITIONS[id].costShards * MAX_ELIXIR_DOSES;
      }
      expect(totalShards).toBe(2300);
    });

    it('total gold required to max all 4 elixirs equals 500,000G', () => {
      let totalGold = 0;
      for (const id of ALL_ELIXIRS) {
        totalGold += ELIXIR_DEFINITIONS[id].costGold * MAX_ELIXIR_DOSES;
      }
      expect(totalGold).toBe(500000);
    });

    it('transmutation of 230 crack stones provides exactly 2,300 starlight shards', () => {
      const res = transmuteToShards('crackStone', 230);
      expect(res.stonesConsumed).toBe(230);
      expect(res.shardsGained).toBe(2300);
    });

    it('transmutation of 1,150 enhance stones provides exactly 2,300 starlight shards', () => {
      const res = transmuteToShards('enhanceStone', 1150);
      expect(res.stonesConsumed).toBe(1150);
      expect(res.shardsGained).toBe(2300);
    });
  });

  describe('2. Stat Saturation & Soft Caps', () => {
    it('mid-tier saturation (5 doses each) grants exactly half stats', () => {
      const midDoses: Partial<Record<ElixirType, number>> = {
        solar_pill: 5,
        lunar_elixir: 5,
        lightning_crystal: 5,
        abyssal_essence: 5,
      };
      const bonuses = computeElixirStatBonuses(midDoses);

      expect(bonuses.totalDoses).toBe(20);
      expect(bonuses.atkPercent).toBe(10);
      expect(bonuses.hpPercent).toBe(10);
      expect(bonuses.defPercent).toBe(10);
      expect(bonuses.spdFlat).toBe(5);
      expect(bonuses.critRate).toBeCloseTo(0.05);
      expect(bonuses.elementalDmgPercent).toBe(10);
      expect(bonuses.damageReduction).toBeCloseTo(0.025);
    });

    it('full saturation (10 doses each = 40 doses) grants complete celestial power expansion', () => {
      const fullDoses: Partial<Record<ElixirType, number>> = {
        solar_pill: 10,
        lunar_elixir: 10,
        lightning_crystal: 10,
        abyssal_essence: 10,
      };
      const bonuses = computeElixirStatBonuses(fullDoses);

      expect(bonuses.totalDoses).toBe(40);
      expect(bonuses.atkPercent).toBe(20);
      expect(bonuses.hpPercent).toBe(20);
      expect(bonuses.defPercent).toBe(20);
      expect(bonuses.spdFlat).toBe(10);
      expect(bonuses.critRate).toBeCloseTo(0.10);
      expect(bonuses.elementalDmgPercent).toBe(20);
      expect(bonuses.damageReduction).toBeCloseTo(0.05);
    });

    it('enforces maximum dose soft cap (10) and prevents further crafting', () => {
      expect(canCraftElixir('solar_pill', 1000, 1000000, 10)).toBe(false);

      const res = craftAndConsumeElixir('solar_pill', 1000, 1000000, 10);
      expect(res.success).toBe(false);
      expect(res.message).toContain('최대 복용 한도');
      expect(res.shardsSpent).toBe(0);
      expect(res.goldSpent).toBe(0);
    });
  });

  describe('3. Trial Floor 10 Combat Simulation with Zodiac + Alchemy Synergies', () => {
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

    it('baseline without Zodiac/Alchemy clears Floor 10 in 24 turns', () => {
      const hero = createEndgameHero(1.15, 1.0); // 15% weapon enchant
      const res = resolveTrialCombat(hero, 10, 'fire', 0.15);

      expect(res.won).toBe(true);
      expect(res.turns).toBe(24);
    });

    it('full Zodiac resonance (12/12) clears Floor 10 in 20 turns', () => {
      const zodiac = computeZodiacResonance([...ALL_ZODIAC_SIGNS]);
      // ATK multiplier: 1.15 (enchant) * 1.11 (zodiac atk) * 1.08 (zodiac element) = 1.3786x
      // HP multiplier: 1.18 (zodiac hp)
      const hero = createEndgameHero(1.15 * 1.11 * 1.08, 1.18);
      const res = resolveTrialCombat(hero, 10, 'fire', 0.15 + zodiac.damageReduction);

      expect(res.won).toBe(true);
      expect(res.turns).toBe(20);
    });

    it('full Zodiac + full Alchemy acceleration reduces TTK to 14 turns and preserves >500,000 HP', () => {
      const zodiac = computeZodiacResonance([...ALL_ZODIAC_SIGNS]);
      const alchemy = computeElixirStatBonuses({
        solar_pill: 10,
        lunar_elixir: 10,
        lightning_crystal: 10,
        abyssal_essence: 10,
      });

      // Total ATK multiplier:
      // 1.15 (Enchant) * 1.11 (Zodiac ATK) * 1.08 (Zodiac Element) * 1.20 (Alchemy ATK) * 1.20 (Alchemy Element)
      const combinedAtkMul = 1.15 * 1.11 * 1.08 * (1 + alchemy.atkPercent / 100) * (1 + alchemy.elementalDmgPercent / 100);
      // Total HP multiplier:
      // 1.18 (Zodiac HP) * 1.20 (Alchemy HP) = 1.416x -> 708,000 HP
      const combinedHpMul = 1.18 * (1 + alchemy.hpPercent / 100);
      // Combined DR:
      // 15% (Armor) + 3% (Zodiac Dog) + 5% (Alchemy Abyss) = 23% DR
      const combinedDR = 0.15 + zodiac.damageReduction + alchemy.damageReduction;

      const hero = createEndgameHero(combinedAtkMul, combinedHpMul);
      const res = resolveTrialCombat(hero, 10, 'fire', combinedDR);

      expect(res.won).toBe(true);
      expect(res.turns).toBe(14);
      expect(res.turns).toBeLessThan(20); // Substantial speedup over Zodiac alone

      // Hero remaining HP verification:
      // Total damage taken: 13 hits * (18,000 * (1 - 0.23)) = 13 * 13,860 = 180,180 damage
      expect(res.damageTakenTotal).toBe(13 * Math.floor(18000 * (1 - combinedDR)));
      // HP remaining: 708,000 - 180,180 = 527,820 HP
      expect(res.heroRemainingHp).toBeGreaterThan(500000);
      expect(res.heroRemainingHp / hero.hpMax).toBeGreaterThan(0.70); // Over 70% HP preserved!
    });
  });
});
