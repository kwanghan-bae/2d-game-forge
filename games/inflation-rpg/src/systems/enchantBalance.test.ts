/**
 * enchantBalance.test.ts — C1048: Elemental Rune Enchanting Economy & Trial Floor 10 Clearance Simulation.
 *
 * Verifies:
 * 1. Enchanting economy: Trial early floor rewards vs rune cost thresholds.
 * 2. Dismantling yield economy: Spare gears to craft runes.
 * 3. Trial Floor 10 (Chaos Overlord, Dark) boss TTK:
 *    - Neutral un-enchanted weapon fails (hero falls under continuous assault before 34 turns).
 *    - Elemental rune enchanted weapon (1.25x clash + 15% resonance) decisively clears in 24 turns.
 *    - Dark rune enchanted weapon (1.0x neutral + 15% resonance) clears in 29 turns with 15% DR.
 * 4. Reforged Armor DR mitigation against Floor 10 heavy boss swings.
 * 5. Full 3-way elemental wheel TTK divergence across elemental trial bosses.
 */

import { describe, it, expect } from 'vitest';
import {
  ELEMENTAL_RUNES,
  ALL_RUNES,
  getRuneDef,
  canEnchantWithRune,
  applyRuneEnchant,
  getEffectiveElement,
  getEnchantDamageBonus,
  getEquippedEnchantBonus,
} from './enchantSystem';
import {
  TRIAL_FLOORS,
  getTrialFloor,
  resolveTrialCombat,
  MAX_TRIAL_FLOOR,
} from './ascensionTrials';
import { computeElementalMultiplier } from './elementalSystem';
import { getDismantleYield } from './reforgeSystem';
import type { HeroEntity } from '../hero/HeroEntity';
import type { EquipmentInstance } from '../types';

describe('C1048 [balance]: Elemental Rune Enchanting Economy & Trial Simulation', () => {
  describe('1. Enchant Economy & Progression Thresholds', () => {
    it('standard runes (Fire, Water, Lightning) have identical accessible pricing', () => {
      const standard = ['rune_fire', 'rune_water', 'rune_lightning'] as const;
      for (const r of standard) {
        const def = getRuneDef(r);
        expect(def.costGold).toBe(5000);
        expect(def.costStones).toBe(10);
        expect(def.elementalBonusPercent).toBe(15);
      }
    });

    it('dark rune requires premium investment matching endgame power', () => {
      const dark = getRuneDef('rune_dark');
      expect(dark.costGold).toBe(10000);
      expect(dark.costStones).toBe(15);
      expect(dark.elementalBonusPercent).toBe(15);
    });

    it('trial floors 1-2 cumulative rewards are sufficient to fund a standard rune', () => {
      const f1 = getTrialFloor(1)!;
      const f2 = getTrialFloor(2)!;
      const totalGold = f1.rewards.gold + f2.rewards.gold; // 3000 + 6000 = 9000
      const totalStones = f1.rewards.enhanceStones + f2.rewards.enhanceStones; // 5 + 8 = 13

      expect(totalGold).toBeGreaterThanOrEqual(5000);
      expect(totalStones).toBeGreaterThanOrEqual(10);
      expect(canEnchantWithRune('rune_fire', totalGold, totalStones)).toBe(true);
    });

    it('trial floors 1-3 cumulative rewards are sufficient to fund the Dark rune', () => {
      let cumulativeGold = 0;
      let cumulativeStones = 0;
      for (let f = 1; f <= 3; f++) {
        const tf = getTrialFloor(f)!;
        cumulativeGold += tf.rewards.gold;
        cumulativeStones += tf.rewards.enhanceStones;
      }
      // 3000 + 6000 + 12000 = 21000 gold, 5 + 8 + 12 = 25 stones
      expect(cumulativeGold).toBe(21000);
      expect(cumulativeStones).toBe(25);
      expect(canEnchantWithRune('rune_dark', cumulativeGold, cumulativeStones)).toBe(true);
    });

    it('dismantling 2 rare items yields sufficient stones to enchant a standard rune', () => {
      const rareItem: EquipmentInstance = {
        instanceId: 'rare-sword-1',
        baseId: 'w-bluedragon',
        enhanceLv: 0,
      };
      const yieldData = getDismantleYield(rareItem)!;
      expect(yieldData).not.toBeNull();
      expect(yieldData.stones).toBe(5);
      expect(yieldData.stones * 2).toBe(10); // 10 stones == standard rune cost
      expect(canEnchantWithRune('rune_fire', 10000, yieldData.stones * 2)).toBe(true);
    });

    it('dismantling 3 rare items yields sufficient stones to enchant the dark rune', () => {
      const rareItem: EquipmentInstance = {
        instanceId: 'rare-sword-1',
        baseId: 'w-bluedragon',
        enhanceLv: 0,
      };
      const yieldData = getDismantleYield(rareItem)!;
      expect(yieldData.stones * 3).toBe(15); // 15 stones == dark rune cost
      expect(canEnchantWithRune('rune_dark', 15000, yieldData.stones * 3)).toBe(true);
    });
  });

  describe('2. Trial Floor 10 (Chaos Overlord) Combat Simulation', () => {
    // Endgame hero baseline (Level 150, 500k HP, 90k ATK)
    const createEndgameHero = (bonusAtkMultiplier: number = 1.0): HeroEntity => ({
      id: 'endgame-hero',
      name: '용사',
      jobId: 'swordsman',
      level: 150,
      hp: 500000,
      hpMax: 500000,
      atk: Math.floor(90000 * bonusAtkMultiplier),
      def: 15000,
      spd: 100,
      critRate: 0.05,
      critDmg: 1.5,
      exp: 0,
      expToNext: 100000,
      gold: 50000,
      cycleCount: 5,
    } as unknown as HeroEntity);

    it('neutral weapon fails to defeat Floor 10 boss as hero falls before 34 turns', () => {
      const hero = createEndgameHero(1.0);
      // Floor 10: 3,000,000 HP. 90,000 ATK * 1.0 = 90,000 / turn -> 34 turns needed.
      // Boss deals 15,300 / turn (with 15% DR). Hero falls at turn 33 (33 * 15,300 = 504,900 > 500,000).
      const result = resolveTrialCombat(hero, 10, 'neutral', 0.15);

      expect(result.won).toBe(false);
      expect(result.enemyRemainingHp).toBeGreaterThan(0);
      expect(result.elementalMultiplier).toBe(1.0);
    });

    it('elemental rune enchanted weapon achieves decisive victory in 24 turns against Floor 10 boss', () => {
      // Elemental vs Dark = 1.25x clash.
      // Rune enchant resonance = +15% ATK -> 90,000 * 1.15 = 103,500.
      // Damage per turn = 103,500 * 1.25 = 129,375.
      // 3,000,000 / 129,375 = 24 turns!
      // Boss hits 23 times = 23 * 15,300 = 351,900 < 500,000 HP.
      const heroWithEnchant = createEndgameHero(1.15);
      const result = resolveTrialCombat(heroWithEnchant, 10, 'fire', 0.15);

      expect(result.won).toBe(true);
      expect(result.turns).toBe(24);
      expect(result.enemyRemainingHp).toBe(0);
      expect(result.elementalMultiplier).toBe(1.25);
      expect(result.heroRemainingHp).toBe(500000 - 23 * Math.floor(18000 * 0.85));
      expect(result.heroRemainingHp).toBeGreaterThan(0);
    });

    it('dark rune weapon clears Floor 10 boss in 29 turns with 15% armor DR', () => {
      // Dark vs Dark = 1.0x neutral affinity.
      // Rune enchant resonance = +15% ATK -> 90,000 * 1.15 = 103,500.
      // Damage per turn = 103,500 * 1.0 = 103,500.
      // 3,000,000 / 103,500 = 29 turns.
      // 28 boss hits * 15,300 = 428,400 < 500,000 HP.
      const heroWithEnchant = createEndgameHero(1.15);
      const result = resolveTrialCombat(heroWithEnchant, 10, 'dark', 0.15);

      expect(result.won).toBe(true);
      expect(result.turns).toBe(29);
      expect(result.enemyRemainingHp).toBe(0);
      expect(result.elementalMultiplier).toBe(1.0);
      expect(result.heroRemainingHp).toBeGreaterThan(0);
    });

    it('hero survives Floor 10 boss thanks to reforged armor 15% DR', () => {
      const heroWithEnchant = createEndgameHero(1.15);
      // With 15% armor DR (survives 24 turns)
      const resWithDr = resolveTrialCombat(heroWithEnchant, 10, 'fire', 0.15);
      // Without armor DR: 18,000 dmg/turn -> 23 hits = 414,000 dmg
      const resNoDr = resolveTrialCombat(heroWithEnchant, 10, 'fire', 0.0);

      expect(resWithDr.won).toBe(true);
      expect(resWithDr.damageTakenTotal).toBeLessThan(resNoDr.damageTakenTotal);
      expect(resWithDr.heroRemainingHp).toBeGreaterThan(resNoDr.heroRemainingHp);
    });
  });

  describe('3. Multi-Element Wheel Performance on Trial Bosses', () => {
    const midHero: HeroEntity = {
      id: 'mid-hero',
      name: '중견 용사',
      jobId: 'swordsman',
      level: 50,
      hp: 150000,
      hpMax: 150000,
      atk: 5000,
      def: 200,
      spd: 100,
      critRate: 0.05,
      critDmg: 1.5,
      exp: 0,
      expToNext: 10000,
      gold: 5000,
      cycleCount: 2,
    } as unknown as HeroEntity;

    it('Floor 1 (Fire Drake): Water counter kills in fewer turns than Lightning disadvantage', () => {
      const resCounter = resolveTrialCombat(midHero, 1, 'water', 0);
      const resDisadv = resolveTrialCombat(midHero, 1, 'lightning', 0);

      expect(resCounter.elementalMultiplier).toBe(1.5);
      expect(resDisadv.elementalMultiplier).toBe(0.7);
      expect(resDisadv.turns).toBeGreaterThan(resCounter.turns);
      expect(resDisadv.turns / resCounter.turns).toBeGreaterThanOrEqual(1.5);
    });

    it('Floor 2 (Sea Serpent): Lightning counter kills much faster than Fire disadvantage', () => {
      const resCounter = resolveTrialCombat(midHero, 2, 'lightning', 0);
      const resDisadv = resolveTrialCombat(midHero, 2, 'fire', 0);

      expect(resCounter.elementalMultiplier).toBe(1.5);
      expect(resDisadv.elementalMultiplier).toBe(0.7);
      expect(resDisadv.turns).toBeGreaterThan(resCounter.turns);
      expect(resDisadv.turns / resCounter.turns).toBeGreaterThanOrEqual(1.8);
    });

    it('Floor 3 (Dragon Lord): Fire counter kills much faster than Water disadvantage', () => {
      const resCounter = resolveTrialCombat(midHero, 3, 'fire', 0);
      const resDisadv = resolveTrialCombat(midHero, 3, 'water', 0);

      expect(resCounter.elementalMultiplier).toBe(1.5);
      expect(resDisadv.elementalMultiplier).toBe(0.7);
      expect(resDisadv.turns).toBeGreaterThan(resCounter.turns);
      expect(resDisadv.turns / resCounter.turns).toBeGreaterThanOrEqual(1.8);
    });
  });
});
