import { describe, it, expect } from 'vitest';
import {
  EQUIPMENT_SETS,
  getEquipmentSet,
  getSetForEquipment,
  getActiveSetBonuses,
  aggregateSetEffects,
} from './equipmentSets';

describe('C1027: Equipment Set Synergy System', () => {
  describe('definitions and lookup', () => {
    it('defines 4 standard equipment sets with unique IDs', () => {
      expect(EQUIPMENT_SETS).toHaveLength(4);
      const ids = EQUIPMENT_SETS.map(s => s.id);
      expect(new Set(ids).size).toBe(4);
    });

    it('each set has exactly 3 items and 2 bonus tiers (2P and 3P)', () => {
      for (const set of EQUIPMENT_SETS) {
        expect(set.itemBaseIds).toHaveLength(3);
        expect(set.bonuses).toHaveLength(2);
        expect(set.bonuses[0]!.pieces).toBe(2);
        expect(set.bonuses[1]!.pieces).toBe(3);
      }
    });

    it('getSetForEquipment finds matching set for valid baseId', () => {
      const dragonSet = getSetForEquipment('w-bluedragon');
      expect(dragonSet?.id).toBe('dragon');
      expect(dragonSet?.name).toBe('용의 위엄');

      const merchantSet = getSetForEquipment('acc-gold-magnet');
      expect(merchantSet?.id).toBe('merchant');

      expect(getSetForEquipment('unknown-item')).toBeUndefined();
    });
  });

  describe('getActiveSetBonuses', () => {
    it('returns empty array when no set items are equipped', () => {
      const result = getActiveSetBonuses(['w-knife', 'a-cloth']);
      // a-cloth is part of ascetic set (1 item)
      const ascetic = result.find(r => r.set.id === 'ascetic');
      expect(ascetic?.equippedCount).toBe(1);
      expect(ascetic?.activeBonuses).toHaveLength(0);
      expect(ascetic?.inactiveBonuses).toHaveLength(2);
    });

    it('activates 2-piece bonus when 2 items from same set are equipped', () => {
      const equipped = ['w-bluedragon', 'a-dragon'];
      const result = getActiveSetBonuses(equipped);
      const dragon = result.find(r => r.set.id === 'dragon');
      expect(dragon).toBeDefined();
      expect(dragon?.equippedCount).toBe(2);
      expect(dragon?.activeBonuses).toHaveLength(1);
      expect(dragon?.activeBonuses[0]!.pieces).toBe(2);
      expect(dragon?.activeBonuses[0]!.effect.atkMulBonus).toBe(0.15);
      expect(dragon?.inactiveBonuses).toHaveLength(1);
      expect(dragon?.inactiveBonuses[0]!.pieces).toBe(3);
    });

    it('activates both 2-piece and 3-piece bonuses when all 3 items are equipped', () => {
      const equipped = ['w-fairy', 'a-celestial', 'w-celestial-spear'];
      const result = getActiveSetBonuses(equipped);
      const celestial = result.find(r => r.set.id === 'celestial');
      expect(celestial).toBeDefined();
      expect(celestial?.equippedCount).toBe(3);
      expect(celestial?.activeBonuses).toHaveLength(2);
      expect(celestial?.inactiveBonuses).toHaveLength(0);
    });
  });

  describe('aggregateSetEffects', () => {
    it('aggregates Dragon 3P bonuses (ATK +15%, Boss DMG +20%)', () => {
      const equipped = ['w-bluedragon', 'a-dragon', 'w-yongcheon'];
      const effects = aggregateSetEffects(equipped);
      expect(effects.atkMulBonus).toBe(0.15);
      expect(effects.bossDamageBonus).toBe(0.20);
      expect(effects.hpMulBonus).toBe(0);
    });

    it('aggregates Celestial 3P bonuses (HP +20%, EXP +25%)', () => {
      const equipped = ['w-fairy', 'a-celestial', 'w-celestial-spear'];
      const effects = aggregateSetEffects(equipped);
      expect(effects.hpMulBonus).toBe(0.20);
      expect(effects.expBonus).toBe(25);
    });

    it('aggregates Ascetic 2P and Merchant 2P across multiple sets', () => {
      const equipped = [
        'w-exp-katana', 'a-cloth', // Ascetic 2P
        'acc-gold-magnet', 'acc-charm', // Merchant 2P
      ];
      const effects = aggregateSetEffects(equipped);
      expect(effects.combatHealPercent).toBe(0.05);
      expect(effects.goldBonus).toBe(25);
      expect(effects.atkMulBonus).toBe(0);
      expect(effects.dropRateBonus).toBe(0);
    });
  });
});
