/**
 * awakeningBalance.test.ts — C1077: Nine-Star Awakening Economy & Multi-Million Damage Inflation Simulation.
 *
 * Verifies:
 * 1. Total 9-tier resource investment: 2,080 Starlight Shards + 232 Crack Stones (~8-9 Boss Rush clears).
 * 2. Cumulative stat inflation scaling: +130% ATK, +145% HP, +85% DEF, +65% Elemental DMG, +18% DR, and 2.0x Final Dmg Multiplier.
 * 3. Pinnacle combat simulation: Slashes Floor 10 Boss clearance down to 2 turns, unleashing >1.5M damage per turn.
 */

import { describe, it, expect } from 'vitest';
import {
  AWAKENING_TIERS,
  MAX_AWAKENING_TIER,
  computeCumulativeAwakeningStats,
} from './celestialAwakening';
import { TOTAL_RUSH_REWARDS } from './ascendantBossRush';
import { ALL_ZODIAC_SIGNS, computeZodiacResonance } from './zodiacSystem';
import { computeElixirStatBonuses } from './astralAlchemy';
import { resolveTrialCombat } from './ascensionTrials';
import type { HeroEntity } from '../hero/HeroEntity';

describe('C1077 [balance]: Nine-Star Awakening Economy & Combat Simulation', () => {
  describe('1. 9-Tier Ascension Economy & Boss Rush Loop', () => {
    it('total resources to reach Tier 9 equals 2,080 shards and 232 crack stones', () => {
      let totalShards = 0;
      let totalStones = 0;

      for (const t of AWAKENING_TIERS) {
        totalShards += t.costShards;
        totalStones += t.costCrackStones;
      }

      expect(totalShards).toBe(2080);
      expect(totalStones).toBe(232);
    });

    it('approximately 8-9 full Boss Rush clears provide all required shards and stones', () => {
      // 1 Boss Rush clear = 240 shards, 33 crack stones
      const clearsNeededForShards = Math.ceil(2080 / TOTAL_RUSH_REWARDS.shards);
      const clearsNeededForStones = Math.ceil(232 / TOTAL_RUSH_REWARDS.crackStones);

      expect(clearsNeededForShards).toBe(9); // 9 * 240 = 2,160 shards >= 2,080
      expect(clearsNeededForStones).toBe(8); // 8 * 33 = 264 crack stones >= 232
      expect(Math.max(clearsNeededForShards, clearsNeededForStones)).toBeLessThanOrEqual(9);
    });
  });

  describe('2. Cumulative Stat Growth from Tier 0 to Tier 9', () => {
    it('demonstrates progressive power scaling across stages', () => {
      // Tier 3 (삼성경): ATK +15%, HP +15%, DEF +20%, Elemental +25%, DR +2%
      const t3 = computeCumulativeAwakeningStats(3);
      expect(t3.atkPercent).toBe(15);
      expect(t3.defPercent).toBe(20);
      expect(t3.elementalDmgPercent).toBe(25);
      expect(t3.damageReduction).toBeCloseTo(0.02);

      // Tier 6 (육성경): Single-hit burst + speed acceleration
      const t6 = computeCumulativeAwakeningStats(6);
      expect(t6.atkPercent).toBe(40); // 15 + 25
      expect(t6.critDmg).toBe(0.30);
      expect(t6.spdFlat).toBe(15);
      expect(t6.damageReduction).toBeCloseTo(0.05);

      // Tier 9 (천외천): Hyper-transcendence
      const t9 = computeCumulativeAwakeningStats(9);
      expect(t9.finalDmgMultiplier).toBe(2.0);
      expect(t9.atkPercent).toBe(130);
      expect(t9.hpPercent).toBe(145);
      expect(t9.defPercent).toBe(85);
      expect(t9.damageReduction).toBeCloseTo(0.18);
    });
  });

  describe('3. Trial Floor 10 Sub-3 Turn Annihilation Simulation', () => {
    const createEndgameHero = (
      bonusAtkMul: number = 1.0,
      bonusHpMul: number = 1.0,
    ): HeroEntity => ({
      id: 'celestial-overlord-hero',
      name: '무극의 천존',
      jobId: 'swordsman',
      level: 150,
      hp: Math.floor(500000 * bonusHpMul),
      hpMax: Math.floor(500000 * bonusHpMul),
      atk: Math.floor(90000 * bonusAtkMul),
      def: 25000,
      spd: 120,
      critRate: 0.15,
      critDmg: 1.8,
      exp: 0,
      expToNext: 100000,
      gold: 50000,
      cycleCount: 5,
    } as unknown as HeroEntity);

    it('proves Tier 9 Zenith hero obliterates Floor 10 Chaos Overlord in 2 turns', () => {
      const zodiac = computeZodiacResonance([...ALL_ZODIAC_SIGNS]);
      const alchemy = computeElixirStatBonuses({
        solar_pill: 10, lunar_elixir: 10, lightning_crystal: 10, abyssal_essence: 10,
      });
      const awakening = computeCumulativeAwakeningStats(9);

      // Combined Multipliers:
      // Baseline Gear + Enchant: 1.15
      // Zodiac: 1.11 (ATK) * 1.08 (Element)
      // Alchemy: 1.20 (ATK) * 1.20 (Element)
      // Relics: 1.06 (ATK) * 1.25 (Element)
      // Awakening (Tier 9): (1 + 1.30) (ATK) * (1 + 0.65) (Element) * 2.0 (Final Dmg Multiplier)
      const previousAtkMul = 1.15 * 1.11 * 1.08 * 1.20 * 1.20 * 1.06 * 1.25; // 2.63x
      const awakeningAtkMul = (1 + awakening.atkPercent / 100) * (1 + awakening.elementalDmgPercent / 100) * awakening.finalDmgMultiplier;
      // 2.30 * 1.65 * 2.0 = 7.59x
      const totalAtkMul = previousAtkMul * awakeningAtkMul; // 2.63 * 7.59 = 19.96x!

      // HP Multiplier:
      // 1.18 (Zodiac) * 1.20 (Alchemy) * 1.08 (Relics) * (1 + 1.45 Awakening HP) = 1.529 * 2.45 = 3.746x
      const totalHpMul = 1.18 * 1.20 * 1.08 * (1 + awakening.hpPercent / 100);

      // Combined DR:
      // 15% (Armor) + 3% (Zodiac) + 5% (Alchemy) + 3% (Relics) + 18% (Awakening) = 44% DR
      const totalDR = 0.15 + zodiac.damageReduction + alchemy.damageReduction + 0.03 + awakening.damageReduction;

      const hero = createEndgameHero(totalAtkMul, totalHpMul);
      const res = resolveTrialCombat(hero, 10, 'fire', totalDR);

      expect(res.won).toBe(true);
      // Floor 10 Boss HP 3M is disintegrated in just 2 turns!
      expect(res.turns).toBe(2);
      expect(res.turns).toBeLessThanOrEqual(2);

      // Hero dealt total 3,000,000 HP to finish the boss; hero effective ATK is over 1.7M!
      expect(res.damageDealtTotal).toBe(3000000);
      expect(hero.atk).toBeGreaterThan(1700000);

      // Damage taken is only 1 hit * (18000 * 0.50 [DR cap at 0.50]) = 9,000 damage
      expect(res.damageTakenTotal).toBeLessThan(15000);
      // Over 98% HP preserved!
      expect(res.heroRemainingHp / hero.hpMax).toBeGreaterThan(0.98);
    });
  });
});
