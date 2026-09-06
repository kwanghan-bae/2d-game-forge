/**
 * celestialRelics.test.ts — C1067: Celestial Star Relics Socketing Engine Unit Tests.
 */

import { describe, it, expect } from 'vitest';
import {
  ALL_CELESTIAL_RELICS,
  CELESTIAL_RELICS,
  SOCKET_COST_SHARDS,
  SOCKET_COST_GOLD,
  UNSOCKET_COST_SHARDS,
  canSocketRelic,
  socketRelic,
  canUnsocketRelic,
  unsocketRelic,
  getRelicBonusesForSlot,
  computeEquippedRelicBonuses,
} from './celestialRelics';
import type { EquipmentInstance } from '../types';

describe('C1067 [system]: Celestial Star Relics Socketing Engine', () => {
  const dummyItem: EquipmentInstance = {
    instanceId: 'item-1',
    baseId: 'w-sword',
    enhanceLv: 5,
    modifiers: [],
  };

  it('defines all 4 celestial star relics with full slot bonuses', () => {
    expect(ALL_CELESTIAL_RELICS).toHaveLength(4);

    for (const relicId of ALL_CELESTIAL_RELICS) {
      const def = CELESTIAL_RELICS[relicId];
      expect(def).toBeDefined();
      expect(def.nameKR.length).toBeGreaterThan(2);
      expect(def.hanja.length).toBeGreaterThan(1);
      expect(def.costShards).toBe(SOCKET_COST_SHARDS);
      expect(def.costGold).toBe(SOCKET_COST_GOLD);

      expect(def.bonuses.weapon).toBeDefined();
      expect(def.bonuses.armor).toBeDefined();
      expect(def.bonuses.accessory).toBeDefined();
    }
  });

  describe('canSocketRelic & socketRelic', () => {
    it('validates affordability and rejects insufficient shards or gold', () => {
      // Insufficient shards
      expect(canSocketRelic(dummyItem, 'polaris_eye', 20, 50000)).toBe(false);
      // Insufficient gold
      expect(canSocketRelic(dummyItem, 'polaris_eye', 50, 10000)).toBe(false);
      // Sufficient resources
      expect(canSocketRelic(dummyItem, 'polaris_eye', 30, 25000)).toBe(true);
    });

    it('rejects socketing if same relic is already socketed', () => {
      const socketedItem: EquipmentInstance = {
        ...dummyItem,
        celestialRelic: 'polaris_eye',
      };
      expect(canSocketRelic(socketedItem, 'polaris_eye', 100, 100000)).toBe(false);

      const res = socketRelic(socketedItem, 'polaris_eye', 100, 100000);
      expect(res.success).toBe(false);
      expect(res.message).toContain('이미');
    });

    it('sockets relic successfully, deducting costs and updating instance', () => {
      const res = socketRelic(dummyItem, 'sirius_fang', 50, 30000);
      expect(res.success).toBe(true);
      expect(res.shardsSpent).toBe(SOCKET_COST_SHARDS);
      expect(res.goldSpent).toBe(SOCKET_COST_GOLD);
      expect(res.updatedInstance.celestialRelic).toBe('sirius_fang');
      expect(res.message).toContain('시리우스의 송곳니');
    });
  });

  describe('canUnsocketRelic & unsocketRelic', () => {
    it('rejects unsocketing if item has no relic or insufficient shards', () => {
      expect(canUnsocketRelic(dummyItem, 50)).toBe(false);

      const socketedItem: EquipmentInstance = {
        ...dummyItem,
        celestialRelic: 'vega_veil',
      };
      expect(canUnsocketRelic(socketedItem, 5)).toBe(false);
      expect(canUnsocketRelic(socketedItem, 10)).toBe(true);

      const emptyRes = unsocketRelic(dummyItem, 50);
      expect(emptyRes.success).toBe(false);
    });

    it('unsockets relic cleanly when player has enough shards', () => {
      const socketedItem: EquipmentInstance = {
        ...dummyItem,
        celestialRelic: 'antares_heart',
      };

      const res = unsocketRelic(socketedItem, 20);
      expect(res.success).toBe(true);
      expect(res.shardsSpent).toBe(UNSOCKET_COST_SHARDS);
      expect(res.updatedInstance.celestialRelic).toBeUndefined();
      expect(res.message).toContain('추출');
    });
  });

  describe('slot bonuses & computeEquippedRelicBonuses', () => {
    it('returns slot-specific bonuses for polaris eye', () => {
      const weaponBonus = getRelicBonusesForSlot('polaris_eye', 'weapon');
      expect(weaponBonus.atkPercent).toBe(8);
      expect(weaponBonus.critRate).toBe(0.05);

      const armorBonus = getRelicBonusesForSlot('polaris_eye', 'armor');
      expect(armorBonus.defPercent).toBe(8);
      expect(armorBonus.damageReduction).toBe(0.02);

      const accBonus = getRelicBonusesForSlot('polaris_eye', 'accessory');
      expect(accBonus.goldBoost).toBe(0.15);
      expect(accBonus.expBoost).toBe(0.15);
    });

    it('aggregates multi-item socketed relic bonuses across weapon, armor, and accessory', () => {
      const weapon: EquipmentInstance = {
        instanceId: 'w1',
        baseId: 'w-sword',
        enhanceLv: 10,
        modifiers: [],
        celestialRelic: 'sirius_fang', // Weapon: ATK +10%, Crit DMG +20%
      };
      const armor: EquipmentInstance = {
        instanceId: 'a1',
        baseId: 'a-plate',
        enhanceLv: 10,
        modifiers: [],
        celestialRelic: 'antares_heart', // Armor: DR +3%, DEF +10%
      };
      const accessory: EquipmentInstance = {
        instanceId: 'acc1',
        baseId: 'acc-ring',
        enhanceLv: 10,
        modifiers: [],
        celestialRelic: 'vega_veil', // Accessory: Elemental DMG +10%, HP +8%
      };

      const total = computeEquippedRelicBonuses([
        { instance: weapon, slotType: 'weapon' },
        { instance: armor, slotType: 'armor' },
        { instance: accessory, slotType: 'accessory' },
      ]);

      expect(total.atkPercent).toBe(10);
      expect(total.critDmg).toBe(0.20);
      expect(total.damageReduction).toBe(0.03);
      expect(total.defPercent).toBe(10);
      expect(total.elementalDmgPercent).toBe(10);
      expect(total.hpPercent).toBe(8);
    });
  });
});
