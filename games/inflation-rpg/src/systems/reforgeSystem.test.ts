import { describe, it, expect } from 'vitest';
import type { EquipmentInstance, Inventory } from '../types';
import {
  MAX_ENHANCE_LEVEL,
  getDismantleYield,
  dismantleSingleItem,
  batchDismantleItems,
  getReforgeCost,
  getReforgeRates,
  getReforgedStatMultiplier,
  attemptReforge,
  formatEnhancedName,
} from './reforgeSystem';

describe('C1033: reforgeSystem (Blacksmith Reforging & Dismantling)', () => {
  describe('Equipment Dismantling (분해)', () => {
    it('calculates correct dismantle stones and gold for common and rare gear', () => {
      const knife: EquipmentInstance = { instanceId: 'k1', baseId: 'w-knife', enhanceLv: 0, modifiers: [] };
      const knifeYield = getDismantleYield(knife);
      expect(knifeYield).not.toBeNull();
      expect(knifeYield?.stones).toBe(1);
      expect(knifeYield?.goldRefund).toBe(50); // 100 * 0.5

      const bow: EquipmentInstance = { instanceId: 'b1', baseId: 'w-bow', enhanceLv: 0, modifiers: [] };
      const bowYield = getDismantleYield(bow);
      expect(bowYield?.stones).toBe(5); // rare base stones
      expect(bowYield?.goldRefund).toBe(400); // 800 * 0.5
    });

    it('grants bonus enhance stones for enhanced equipment', () => {
      const swordPlus3: EquipmentInstance = { instanceId: 's1', baseId: 'w-sword', enhanceLv: 3, modifiers: [] };
      const yieldData = getDismantleYield(swordPlus3);
      // common base 1 + 3 enhanceLv = 4 stones
      expect(yieldData?.stones).toBe(4);
    });

    it('prevents dismantling currently equipped items', () => {
      const inv: Inventory = {
        weapons: [{ instanceId: 'w1', baseId: 'w-knife', enhanceLv: 0, modifiers: [] }],
        armors: [],
        accessories: [],
      };

      // w1 is equipped
      const res = dismantleSingleItem(inv, 'w1', ['w1']);
      expect(res.success).toBe(false);
      expect(res.error).toBe('equipped');
      expect(res.newInventory.weapons).toHaveLength(1);
    });

    it('successfully dismantles unequipped item and removes it from inventory', () => {
      const inv: Inventory = {
        weapons: [
          { instanceId: 'w1', baseId: 'w-knife', enhanceLv: 0, modifiers: [] },
          { instanceId: 'w2', baseId: 'w-sword', enhanceLv: 0, modifiers: [] },
        ],
        armors: [],
        accessories: [],
      };

      // w2 is unequipped
      const res = dismantleSingleItem(inv, 'w2', ['w1']);
      expect(res.success).toBe(true);
      expect(res.yield?.baseId).toBe('w-sword');
      expect(res.newInventory.weapons).toHaveLength(1);
      expect(res.newInventory.weapons[0].instanceId).toBe('w1');
    });

    it('batch dismantles only matching rarities and excludes equipped items', () => {
      const inv: Inventory = {
        weapons: [
          { instanceId: 'w1', baseId: 'w-knife', enhanceLv: 0, modifiers: [] },      // common, EQUIPPED
          { instanceId: 'w2', baseId: 'w-sword', enhanceLv: 0, modifiers: [] },      // common, unequipped
          { instanceId: 'w3', baseId: 'w-yongcheon', enhanceLv: 0, modifiers: [] },  // epic, unequipped
        ],
        armors: [
          { instanceId: 'a1', baseId: 'a-cloth', enhanceLv: 0, modifiers: [] },      // common, unequipped
        ],
        accessories: [],
      };

      // Dismantle all unequipped common gear
      const result = batchDismantleItems(inv, ['common'], ['w1']);
      expect(result.dismantledCount).toBe(2); // w2 and a1
      expect(result.totalStones).toBe(2);     // 1 + 1
      expect(result.newInventory.weapons).toHaveLength(2); // w1 (equipped) + w3 (epic)
      expect(result.newInventory.armors).toHaveLength(0);
    });
  });

  describe('Reforge Costs & Success Rates', () => {
    it('costs scale with level and item rarity', () => {
      const costLv0Common = getReforgeCost('common', 0);
      const costLv5Common = getReforgeCost('common', 5);
      const costLv0Epic = getReforgeCost('epic', 0);

      expect(costLv5Common.gold).toBeGreaterThan(costLv0Common.gold);
      expect(costLv5Common.stones).toBeGreaterThan(costLv0Common.stones);
      expect(costLv0Epic.gold).toBeGreaterThan(costLv0Common.gold);
    });

    it('provides 100% success rate up to +3', () => {
      for (let lv = 0; lv < 3; lv++) {
        const rates = getReforgeRates(lv);
        expect(rates.successRate).toBe(1.0);
        expect(rates.failureRate).toBe(0);
        expect(rates.greatSuccessRate).toBeGreaterThan(0);
      }
    });

    it('decreases success rates for high enhance levels', () => {
      const r3 = getReforgeRates(3);
      const r6 = getReforgeRates(6);
      const r9 = getReforgeRates(9);

      expect(r3.successRate).toBeGreaterThan(r6.successRate);
      expect(r6.successRate).toBeGreaterThan(r9.successRate);
      expect(r9.successRate).toBe(0.35);
    });

    it('handles MAX_ENHANCE_LEVEL', () => {
      const rates = getReforgeRates(MAX_ENHANCE_LEVEL);
      expect(rates.successRate).toBe(0);
      expect(rates.failureRate).toBe(1);
    });
  });

  describe('Reforge Execution (재연마 시도)', () => {
    it('normal success increments enhanceLv by 1', () => {
      const inst: EquipmentInstance = { instanceId: 'w1', baseId: 'w-knife', enhanceLv: 0, modifiers: [] };
      const res = attemptReforge(inst, 0.05, 0.99); // success roll passes, great roll fails
      expect(res.outcome).toBe('success');
      expect(res.prevLv).toBe(0);
      expect(res.newLv).toBe(1);
    });

    it('great success increments enhanceLv by 2', () => {
      const inst: EquipmentInstance = { instanceId: 'w1', baseId: 'w-knife', enhanceLv: 0, modifiers: [] };
      const res = attemptReforge(inst, 0.01, 0.01); // both pass
      expect(res.outcome).toBe('great_success');
      expect(res.prevLv).toBe(0);
      expect(res.newLv).toBe(2);
    });

    it('safe failure leaves enhanceLv unchanged (no item break/level loss)', () => {
      const inst: EquipmentInstance = { instanceId: 'w1', baseId: 'w-knife', enhanceLv: 5, modifiers: [] };
      const res = attemptReforge(inst, 0.99); // roll fails
      expect(res.outcome).toBe('failure');
      expect(res.prevLv).toBe(5);
      expect(res.newLv).toBe(5); // Invariant: level preserved!
    });

    it('already at MAX_ENHANCE_LEVEL returns max_level outcome with 0 cost', () => {
      const inst: EquipmentInstance = { instanceId: 'w1', baseId: 'w-knife', enhanceLv: 10, modifiers: [] };
      const res = attemptReforge(inst, 0.01);
      expect(res.outcome).toBe('max_level');
      expect(res.newLv).toBe(10);
      expect(res.cost.gold).toBe(0);
      expect(res.cost.stones).toBe(0);
    });
  });

  describe('Stat Multiplier & Name Formatting', () => {
    it('amplifies stats based on rarity and enhance level', () => {
      expect(getReforgedStatMultiplier('rare', 0)).toBe(1.0);
      expect(getReforgedStatMultiplier('rare', 5)).toBe(1.5); // +10% * 5 = +50%
      expect(getReforgedStatMultiplier('rare', 10)).toBe(2.0); // +10% * 10 = +100%
      expect(getReforgedStatMultiplier('mythic', 10)).toBe(4.0); // +30% * 10 = +300%
    });

    it('formats enhanced equipment names correctly', () => {
      expect(formatEnhancedName('용천검', 0)).toBe('용천검');
      expect(formatEnhancedName('용천검', 7)).toBe('+7 용천검');
      expect(formatEnhancedName('선녀검', 10)).toBe('+10 선녀검');
    });
  });
});
