import { describe, it, expect } from 'vitest';
import {
  COSMIC_AFFIXES,
  INFUSION_COST,
  canInfuseEquipment,
  infuseEquipment,
  computeAggregateCosmicBonuses,
  type CosmicAffixType,
} from './cosmicInfusion';
import type { EquipmentInstance } from '../types';

describe('cosmicInfusion engine (C1115)', () => {
  const affixKeys: CosmicAffixType[] = [
    'celestial_sharpness',
    'astral_fortitude',
    'singularity_might',
    'cosmic_celerity',
  ];

  const mockItem: EquipmentInstance = {
    instanceId: 'inst-wpn-1',
    baseId: 'w-sword-9',
    enhanceLv: 10,
    modifiers: [],
  };

  it('defines 4 valid cosmic affixes with complete attributes and stats', () => {
    affixKeys.forEach((key) => {
      const def = COSMIC_AFFIXES[key];
      expect(def).toBeDefined();
      expect(def.type).toBe(key);
      expect(def.nameKR.length).toBeGreaterThan(0);
      expect(def.hanja.length).toBeGreaterThan(0);
      expect(def.emoji.length).toBeGreaterThan(0);
      expect(def.description.length).toBeGreaterThan(10);
      expect(Object.keys(def.stats).length).toBeGreaterThan(0);
    });
  });

  describe('canInfuseEquipment cost checks', () => {
    it('validates essence, shards, and gold thresholds', () => {
      expect(canInfuseEquipment(0, 20, 50_000)).toBe(false);
      expect(canInfuseEquipment(1, 19, 50_000)).toBe(false);
      expect(canInfuseEquipment(1, 20, 49_999)).toBe(false);
      expect(canInfuseEquipment(1, 20, 50_000)).toBe(true);
      expect(canInfuseEquipment(5, 100, 500_000)).toBe(true);
    });
  });

  describe('infuseEquipment execution', () => {
    it('successfully infuses an equipment instance with a cosmic affix', () => {
      const res = infuseEquipment(mockItem, 'celestial_sharpness', 2, 50, 100_000);
      expect(res.success).toBe(true);
      expect(res.updatedInstance?.cosmicAffix).toBe('celestial_sharpness');
      expect(res.costSpent.essence).toBe(INFUSION_COST.essence);
      expect(res.costSpent.shards).toBe(INFUSION_COST.shards);
      expect(res.costSpent.gold).toBe(INFUSION_COST.gold);
      expect(res.message).toContain('천상의 예리함');
    });

    it('rejects infusion when resources are insufficient', () => {
      const res = infuseEquipment(mockItem, 'singularity_might', 0, 10, 20_000);
      expect(res.success).toBe(false);
      expect(res.updatedInstance).toBeUndefined();
      expect(res.message).toContain('재화가 부족합니다');
    });
  });

  describe('computeAggregateCosmicBonuses', () => {
    it('aggregates bonuses across multiple equipped instances with affixes', () => {
      const items: EquipmentInstance[] = [
        {
          instanceId: '1',
          baseId: 'w-1',
          enhanceLv: 10,
          modifiers: [],
          cosmicAffix: 'celestial_sharpness', // +15% Crit DMG, +5% DEF Pierce
        },
        {
          instanceId: '2',
          baseId: 'a-1',
          enhanceLv: 10,
          modifiers: [],
          cosmicAffix: 'astral_fortitude', // +10% HP, +5% DR
        },
        {
          instanceId: '3',
          baseId: 'acc-1',
          enhanceLv: 10,
          modifiers: [],
          cosmicAffix: 'singularity_might', // +12% ATK, +5% Final DMG
        },
        {
          instanceId: '4',
          baseId: 'acc-2',
          enhanceLv: 5,
          modifiers: [],
          // No affix
        },
      ];

      const bonuses = computeAggregateCosmicBonuses(items);
      expect(bonuses.critDmgBonus).toBe(0.15);
      expect(bonuses.defPierceBonus).toBe(0.05);
      expect(bonuses.hpPercentBonus).toBe(0.10);
      expect(bonuses.damageReduction).toBe(0.05);
      expect(bonuses.atkPercentBonus).toBe(0.12);
      expect(bonuses.finalDmgMultiplierBonus).toBe(0.05);
      expect(bonuses.spdPercentBonus).toBe(0);
      expect(bonuses.dodgeRateBonus).toBe(0);
    });

    it('returns zeroes when no instances have cosmic affixes', () => {
      const bonuses = computeAggregateCosmicBonuses([mockItem]);
      expect(bonuses.atkPercentBonus).toBe(0);
      expect(bonuses.damageReduction).toBe(0);
      expect(bonuses.critDmgBonus).toBe(0);
    });
  });
});
