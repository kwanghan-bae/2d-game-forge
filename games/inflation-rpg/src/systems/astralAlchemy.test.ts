/**
 * astralAlchemy.test.ts — C1063: Celestial Astral Alchemy Unit Tests.
 */

import { describe, it, expect } from 'vitest';
import {
  ALL_ELIXIRS,
  ELIXIR_DEFINITIONS,
  MAX_ELIXIR_DOSES,
  canCraftElixir,
  craftAndConsumeElixir,
  transmuteToShards,
  computeElixirStatBonuses,
} from './astralAlchemy';

describe('C1063 [system]: Celestial Astral Alchemy Engine', () => {
  describe('1. Definitions & Cost Schema', () => {
    it('defines 4 High Celestial Elixirs with balanced cost curves', () => {
      expect(ALL_ELIXIRS).toHaveLength(4);
      for (const id of ALL_ELIXIRS) {
        const def = ELIXIR_DEFINITIONS[id];
        expect(def.nameKR).toBeTruthy();
        expect(def.hanja).toBeTruthy();
        expect(def.costShards).toBeGreaterThan(0);
        expect(def.costGold).toBeGreaterThan(0);
        expect(def.maxDoses).toBe(MAX_ELIXIR_DOSES);
        expect(def.bonusesPerDose).toBeDefined();
      }
    });
  });

  describe('2. Transmutation to Starlight Shards', () => {
    it('transmutes Crack Stones at 1:10 ratio', () => {
      const res1 = transmuteToShards('crackStone', 1);
      expect(res1.shardsGained).toBe(10);
      expect(res1.stonesConsumed).toBe(1);

      const res5 = transmuteToShards('crackStone', 5);
      expect(res5.shardsGained).toBe(50);
      expect(res5.stonesConsumed).toBe(5);
    });

    it('transmutes Enhance Stones at 5:10 ratio with 5-stone batch bundling', () => {
      const res5 = transmuteToShards('enhanceStone', 5);
      expect(res5.shardsGained).toBe(10);
      expect(res5.stonesConsumed).toBe(5);

      // 14 stones -> 2 bundles = 10 consumed, 20 gained (4 remainder preserved)
      const res14 = transmuteToShards('enhanceStone', 14);
      expect(res14.shardsGained).toBe(20);
      expect(res14.stonesConsumed).toBe(10);
    });

    it('returns zeroes for zero or negative amount', () => {
      expect(transmuteToShards('crackStone', 0)).toEqual({ shardsGained: 0, stonesConsumed: 0 });
      expect(transmuteToShards('enhanceStone', -2)).toEqual({ shardsGained: 0, stonesConsumed: 0 });
    });
  });

  describe('3. Crafting & Ingesting Elixirs', () => {
    it('canCraftElixir checks resources and max dose caps', () => {
      // Solar pill costs 50 shards, 10,000 gold
      expect(canCraftElixir('solar_pill', 50, 10000, 0)).toBe(true);
      expect(canCraftElixir('solar_pill', 49, 10000, 0)).toBe(false);
      expect(canCraftElixir('solar_pill', 50, 9999, 0)).toBe(false);
      expect(canCraftElixir('solar_pill', 100, 20000, 10)).toBe(false); // dose capped
    });

    it('craftAndConsumeElixir increments doses and deducts resources', () => {
      const res = craftAndConsumeElixir('solar_pill', 100, 20000, 3);
      expect(res.success).toBe(true);
      expect(res.shardsSpent).toBe(50);
      expect(res.goldSpent).toBe(10000);
      expect(res.newDoseCount).toBe(4);
      expect(res.message).toContain('태양의 환약');
    });

    it('craftAndConsumeElixir fails when dose cap reached or funds lacking', () => {
      const capFail = craftAndConsumeElixir('solar_pill', 500, 100000, 10);
      expect(capFail.success).toBe(false);
      expect(capFail.message).toContain('최대 복용 한도');

      const poorFail = craftAndConsumeElixir('lunar_elixir', 10, 500, 0);
      expect(poorFail.success).toBe(false);
      expect(poorFail.message).toContain('부족');
    });
  });

  describe('4. Computing Aggregated Stat Bonuses', () => {
    it('returns empty bonuses when no elixirs consumed', () => {
      const empty = computeElixirStatBonuses({});
      expect(empty.totalDoses).toBe(0);
      expect(empty.atkPercent).toBe(0);
    });

    it('calculates bonuses accurately for partial consumption', () => {
      const doses = {
        solar_pill: 5, // 5 * 2% = +10% ATK
        lunar_elixir: 3, // 3 * 2% = +6% HP, +6% DEF
      };
      const bonus = computeElixirStatBonuses(doses);
      expect(bonus.totalDoses).toBe(8);
      expect(bonus.atkPercent).toBe(10);
      expect(bonus.hpPercent).toBe(6);
      expect(bonus.defPercent).toBe(6);
      expect(bonus.spdFlat).toBe(0);
    });

    it('calculates grand soft-cap bonuses for all 40 doses', () => {
      const fullDoses = {
        solar_pill: 10,
        lunar_elixir: 10,
        lightning_crystal: 10,
        abyssal_essence: 10,
      };
      const bonus = computeElixirStatBonuses(fullDoses);
      expect(bonus.totalDoses).toBe(40);
      expect(bonus.atkPercent).toBe(20);
      expect(bonus.hpPercent).toBe(20);
      expect(bonus.defPercent).toBe(20);
      expect(bonus.spdFlat).toBe(10);
      expect(bonus.critRate).toBeCloseTo(0.10);
      expect(bonus.elementalDmgPercent).toBe(20);
      expect(bonus.damageReduction).toBeCloseTo(0.05); // 10 * 0.005 = 5% DR
    });
  });
});
