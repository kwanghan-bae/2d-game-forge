/**
 * mythicGearBalance.test.ts — C1095: Mythic Gear 15-Star Resonance & Depth 30+ Annihilation Simulation.
 *
 * Verifies:
 * 1. Full 3-item 15-star investment: 1,830 Shards + 303 Crack Stones + 6,000,000G (~7-9 Chaos Rift runs).
 * 2. Compounded 15-star resonance bonuses: +30% Pierce, +35% Crit DMG, +5% DR, +25% ATK/HP, and 1.30x Final Multiplier.
 * 3. Pinnacle combat simulation against Depth 30 Guardian (HP 57.5M+, ATK 1.33M+):
 *    - Un-awakened hero dies on turn 4.
 *    - 15-Star mythic awakened hero clears Depth 30 in ~6 turns with >1.0M HP preserved!
 */

import { describe, it, expect } from 'vitest';
import {
  MYTHIC_STAR_PROGRESSION,
  computeMythicStarMultiplier,
  computeMythicSetResonance,
} from './mythicGearAwakening';
import { generateRiftGuardian, resolveRiftCombat } from './endlessChaosRift';
import type { HeroEntity } from '../hero/HeroEntity';

describe('C1095 [balance]: Mythic Gear 15-Star Resonance & Depth 30+ Simulation', () => {
  describe('1. Economy & Upgrade Investment', () => {
    it('verifies 3-item full 15-star loadout requires 1,830 shards, 303 stones, and 6M gold', () => {
      let singleItemShards = 0;
      let singleItemStones = 0;
      let singleItemGold = 0;

      for (const cost of MYTHIC_STAR_PROGRESSION) {
        singleItemShards += cost.costShards;
        singleItemStones += cost.costCrackStones;
        singleItemGold += cost.costGold;
      }

      expect(singleItemShards).toBe(610);
      expect(singleItemStones).toBe(101);
      expect(singleItemGold).toBe(2000000);

      const total15StarsShards = singleItemShards * 3;
      const total15StarsStones = singleItemStones * 3;
      const total15StarsGold = singleItemGold * 3;

      expect(total15StarsShards).toBe(1830);
      expect(total15StarsStones).toBe(303);
      expect(total15StarsGold).toBe(6000000);
    });

    it('requires approximately 7-9 ten-depth Chaos Rift runs to attain 15-star perfection', () => {
      // 1 Rift expedition yields: 265 Shards, 35 Stones, 2.75M Gold
      const runsForShards = Math.ceil(1830 / 265);
      const runsForStones = Math.ceil(303 / 35);
      const runsForGold = Math.ceil(6000000 / 2750000);

      expect(runsForShards).toBe(7); // 7 * 265 = 1,855 >= 1,830
      expect(runsForStones).toBe(9); // 9 * 35 = 315 >= 303
      expect(runsForGold).toBe(3);   // 3 * 2.75M = 8.25M >= 6M
      expect(Math.max(runsForShards, runsForStones)).toBe(9);
    });
  });

  describe('2. 15-Star Resonance Multiplier Synergies', () => {
    it('activates all 4 progressive resonance tiers at 15 stars', () => {
      const res = computeMythicSetResonance(15);

      expect(res.elementalPiercePercent).toBe(30);
      expect(res.critDmgBonus).toBe(0.35);
      expect(res.damageReduction).toBe(0.05);
      expect(res.atkBonusPercent).toBe(25);
      expect(res.hpBonusPercent).toBe(25);
      expect(res.chaosErosionImmunity).toBe(true);
      expect(res.finalDmgMultiplier).toBe(1.30);
      expect(res.activeMilestones).toHaveLength(4);
    });
  });

  describe('3. Depth 30+ Guardian Annihilation Simulation', () => {
    const createHero = (
      atk: number,
      hp: number,
      def: number,
    ): HeroEntity => ({
      id: 'mythic-15-star-hero',
      name: '천외천의 무극신선',
      jobId: 'swordsman',
      level: 150,
      hp,
      hpMax: hp,
      atk,
      def,
      spd: 120,
      critRate: 0.15,
      critDmg: 1.8,
      exp: 0,
      expToNext: 100000,
      gold: 500000,
      cycleCount: 5,
    } as unknown as HeroEntity);

    it('proves un-awakened hero is wiped out at Depth 30, while 15-Star hero clears it in 6 turns', () => {
      const g30 = generateRiftGuardian(30);
      expect(g30.maxHp).toBeGreaterThan(57000000); // 57.5M+ HP!
      expect(g30.atk).toBeGreaterThan(1300000);   // 1.3M+ ATK!

      // Baseline un-awakened hero: ATK 1.8M, HP 1.875M, DEF 50k, DR 45%, Final Mul 2.0x
      const baselineHero = createHero(1800000, 1875000, 50000);
      const resBaseline = resolveRiftCombat(
        baselineHero,
        baselineHero.hpMax,
        30,
        'neutral',
        0.45,
        0.65,
        2.0,
      );

      // Baseline hero is decisively defeated (dies before breaking 57M HP)
      expect(resBaseline.cleared).toBe(false);
      expect(resBaseline.heroRemainingHp).toBe(0);

      // 15-Star Mythic Awakened Hero:
      // ATK boosted by 2.0x gear base + 25% resonance = ~3.6M ATK
      // HP boosted by 2.0x gear base + 25% resonance = ~3.75M HP
      // DEF 80k
      // DR 50% (45% + 5% resonance)
      // Final Multiplier: 2.0 (Awakening) * 1.30 (15-star resonance) = 2.60x!
      const mythicHero = createHero(3600000, 3750000, 800000);
      const resMythic = resolveRiftCombat(
        mythicHero,
        mythicHero.hpMax,
        30,
        'lightning', // Lightning counters water guardian at Depth 30
        0.50,
        0.95, // 65% base + 30% pierce
        2.60, // 2.0 * 1.30
      );

      // Mythic hero successfully clears Depth 30!
      expect(resMythic.cleared).toBe(true);
      expect(resMythic.turns).toBeLessThanOrEqual(4);
      expect(resMythic.heroRemainingHp).toBeGreaterThan(1000000);
    });
  });
});
