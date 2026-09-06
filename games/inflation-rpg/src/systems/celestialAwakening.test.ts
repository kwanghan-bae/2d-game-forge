/**
 * celestialAwakening.test.ts — C1075: Nine-Star Celestial Awakening Engine Unit Tests.
 */

import { describe, it, expect } from 'vitest';
import {
  AWAKENING_TIERS,
  MAX_AWAKENING_TIER,
  canAwakenNextTier,
  attemptAwakenNextTier,
  computeCumulativeAwakeningStats,
} from './celestialAwakening';

describe('C1075 [system]: Nine-Star Celestial Awakening Engine', () => {
  it('defines 9 progressive ascending celestial tiers', () => {
    expect(AWAKENING_TIERS).toHaveLength(9);
    expect(MAX_AWAKENING_TIER).toBe(9);

    let prevShards = 0;
    let prevStones = 0;

    for (let i = 0; i < 9; i++) {
      const tier = AWAKENING_TIERS[i];
      expect(tier.tier).toBe(i + 1);
      expect(tier.nameKR.length).toBeGreaterThan(3);
      expect(tier.title.length).toBeGreaterThan(2);
      expect(tier.costShards).toBeGreaterThan(prevShards);
      expect(tier.costCrackStones).toBeGreaterThan(prevStones);
      prevShards = tier.costShards;
      prevStones = tier.costCrackStones;
    }
  });

  describe('canAwakenNextTier & attemptAwakenNextTier', () => {
    it('validates affordability for Tier 1 (40 shards, 5 crack stones)', () => {
      expect(canAwakenNextTier(0, 30, 10)).toBe(false); // shards short
      expect(canAwakenNextTier(0, 50, 4)).toBe(false); // stones short
      expect(canAwakenNextTier(0, 40, 5)).toBe(true);
    });

    it('successfully breaks through from Tier 0 to Tier 1', () => {
      const res = attemptAwakenNextTier(0, 100, 20);
      expect(res.success).toBe(true);
      expect(res.newTier).toBe(1);
      expect(res.shardsSpent).toBe(40);
      expect(res.crackStonesSpent).toBe(5);
      expect(res.message).toContain('일성경 · 개광');
      expect(res.message).toContain('성광의 각성자');
    });

    it('rejects breakthrough when already at maximum Tier 9', () => {
      expect(canAwakenNextTier(9, 1000, 1000)).toBe(false);

      const res = attemptAwakenNextTier(9, 1000, 1000);
      expect(res.success).toBe(false);
      expect(res.message).toContain('최고 경지에 도달');
    });
  });

  describe('computeCumulativeAwakeningStats', () => {
    it('returns 0 bonuses and 1.0x multiplier for unawakened Tier 0', () => {
      const stats = computeCumulativeAwakeningStats(0);
      expect(stats.tier).toBe(0);
      expect(stats.title).toContain('필멸자');
      expect(stats.atkPercent).toBe(0);
      expect(stats.hpPercent).toBe(0);
      expect(stats.finalDmgMultiplier).toBe(1.0);
    });

    it('returns cumulative stats for Tier 1', () => {
      const stats = computeCumulativeAwakeningStats(1);
      expect(stats.tier).toBe(1);
      expect(stats.title).toBe('성광의 각성자');
      expect(stats.atkPercent).toBe(15);
      expect(stats.hpPercent).toBe(15);
      expect(stats.finalDmgMultiplier).toBe(1.0);
    });

    it('returns full transcendent zenith stats and 2.0x final multiplier for Tier 9', () => {
      const stats = computeCumulativeAwakeningStats(9);
      expect(stats.tier).toBe(9);
      expect(stats.title).toBe('무극의 천존');

      // Cumulative ATK: 15 + 25 + 40 + 50 = 130%
      expect(stats.atkPercent).toBe(130);
      // Cumulative HP: 15 + 30 + 50 + 50 = 145%
      expect(stats.hpPercent).toBe(145);
      // Cumulative DEF: 20 + 25 + 40 = 85%
      expect(stats.defPercent).toBe(85);
      // Cumulative DR: 2% + 3% + 5% + 8% = 18% DR
      expect(stats.damageReduction).toBeCloseTo(0.18);
      // Cumulative Elemental DMG: 25 + 40 = 65%
      expect(stats.elementalDmgPercent).toBe(65);
      // Final Damage Doubling
      expect(stats.finalDmgMultiplier).toBe(2.0);
    });
  });
});
