import { describe, it, expect } from 'vitest';
import {
  MAX_ENHANCE_LEVEL,
  getReforgeCost,
  getReforgeRates,
  getReforgedStatMultiplier,
  attemptReforge,
  getDismantleYield,
  type ReforgeCost,
} from './reforgeSystem';
import type { EquipmentInstance, EquipmentRarity } from '../types';

describe('C1035: Blacksmith Economy & Enhance Rates Balance Simulation', () => {
  const rarities: EquipmentRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

  describe('Cost Progression & Economy Curves', () => {
    it('costs strictly increase monotonically per level for every rarity', () => {
      for (const rarity of rarities) {
        let prevCost: ReforgeCost = { gold: 0, stones: 0 };
        for (let lv = 0; lv < MAX_ENHANCE_LEVEL; lv++) {
          const cost = getReforgeCost(rarity, lv);
          expect(cost.gold).toBeGreaterThan(prevCost.gold);
          expect(cost.stones).toBeGreaterThanOrEqual(prevCost.stones);
          expect(cost.gold).toBeGreaterThan(0);
          expect(cost.stones).toBeGreaterThan(0);
          prevCost = cost;
        }
      }
    });

    it('mythic costs scale higher than common by appropriate multiplier ratio', () => {
      const commonCost10 = getReforgeCost('common', 9);
      const mythicCost10 = getReforgeCost('mythic', 9);

      // Gold multiplier for mythic is 16x
      expect(mythicCost10.gold / commonCost10.gold).toBeCloseTo(16, 1);
      // Stones multiplier for mythic is 5x
      expect(mythicCost10.stones / commonCost10.stones).toBeCloseTo(5, 1);
    });

    it('dismantling 10 unequipped common weapons yields enough stones for +1 to +3 rush', () => {
      const knife: EquipmentInstance = { instanceId: 'k', baseId: 'w-knife', enhanceLv: 0, modifiers: [] };
      const singleYield = getDismantleYield(knife)!;
      const totalStonesFrom10 = singleYield.stones * 10;
      expect(totalStonesFrom10).toBe(10);

      // Cost of +0->+1 (1 stone), +1->+2 (1 stone), +2->+3 (2 stones) = 4 stones total
      const cost1 = getReforgeCost('common', 0).stones;
      const cost2 = getReforgeCost('common', 1).stones;
      const cost3 = getReforgeCost('common', 2).stones;
      const totalCostToPlus3 = cost1 + cost2 + cost3;

      expect(totalStonesFrom10).toBeGreaterThanOrEqual(totalCostToPlus3);
    });
  });

  describe('Monte Carlo Simulation of Enhance Progression', () => {
    it('simulates 500 heroes attempting +0 to +5, verifying average attempts between 4.0 and 7.5', () => {
      const runs = 500;
      let totalAttemptsToPlus5 = 0;

      // Seeded pseudo-random generator for reproducible simulation
      let seed = 12345;
      const lcg = () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
      };

      for (let r = 0; r < runs; r++) {
        let currentLv = 0;
        let attempts = 0;
        while (currentLv < 5 && attempts < 100) {
          attempts++;
          const inst: EquipmentInstance = { instanceId: 'test', baseId: 'w-sword', enhanceLv: currentLv, modifiers: [] };
          const result = attemptReforge(inst, lcg(), lcg());
          currentLv = result.newLv;
        }
        totalAttemptsToPlus5 += attempts;
      }

      const avgAttempts = totalAttemptsToPlus5 / runs;
      // Because +1 to +3 are 100% and great success skips levels, average is around 5
      expect(avgAttempts).toBeGreaterThanOrEqual(4.0);
      expect(avgAttempts).toBeLessThanOrEqual(7.5);
    });

    it('simulates 200 heroes attempting +0 to +10, verifying zero items broken and finish within expected attempts', () => {
      const runs = 200;
      let totalAttemptsToMax = 0;

      let seed = 99999;
      const lcg = () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
      };

      for (let r = 0; r < runs; r++) {
        let currentLv = 0;
        let attempts = 0;
        while (currentLv < MAX_ENHANCE_LEVEL && attempts < 200) {
          attempts++;
          const inst: EquipmentInstance = { instanceId: 'test', baseId: 'w-yongcheon', enhanceLv: currentLv, modifiers: [] };
          const result = attemptReforge(inst, lcg(), lcg());
          expect(result.newLv).toBeGreaterThanOrEqual(currentLv); // Invariant: no regression!
          currentLv = result.newLv;
        }
        expect(currentLv).toBe(MAX_ENHANCE_LEVEL);
        totalAttemptsToMax += attempts;
      }

      const avgAttemptsToMax = totalAttemptsToMax / runs;
      // Expected around 16 to 30 attempts given the success curve
      expect(avgAttemptsToMax).toBeGreaterThanOrEqual(14.0);
      expect(avgAttemptsToMax).toBeLessThanOrEqual(35.0);
    });
  });

  describe('Stat Growth & Combat Counterplay Invariants', () => {
    it('+5 Epic item provides +75% stats, matching mid-game boss pacing', () => {
      const mul = getReforgedStatMultiplier('epic', 5);
      expect(mul).toBeCloseTo(1.75, 2); // 1 + 0.15 * 5 = 1.75
    });

    it('+10 Legendary weapon provides 3.0x base stat (+200%), countering Boss Phase 2 2.0x Enrage', () => {
      const mul = getReforgedStatMultiplier('legendary', 10);
      expect(mul).toBeCloseTo(3.0, 2); // 1 + 0.20 * 10 = 3.0

      const baseHeroAtk = 1000;
      const weaponBuffedAtk = Math.floor(baseHeroAtk * mul);
      expect(weaponBuffedAtk).toBe(3000);

      // Hero damage output scales with 3.0x, effectively overcoming boss 2.0x enrage damage
      expect(mul).toBeGreaterThan(2.0);
    });
  });
});
