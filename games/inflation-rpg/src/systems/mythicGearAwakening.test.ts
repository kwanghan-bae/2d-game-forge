/**
 * mythicGearAwakening.test.ts — C1093: Mythic Gear Awakening & Set Resonance Unit Tests.
 */

import { describe, it, expect } from 'vitest';
import {
  MAX_MYTHIC_STARS,
  MYTHIC_STAR_PROGRESSION,
  computeMythicStarMultiplier,
  canAwakenMythicStar,
  awakenMythicStar,
  computeMythicSetResonance,
} from './mythicGearAwakening';

describe('C1093 [system]: Mythic Gear Star Awakening & Set Resonance Engine', () => {
  describe('1. Star Progression & Multipliers', () => {
    it('defines 5 star progression levels with increasing costs and stat bonuses', () => {
      expect(MYTHIC_STAR_PROGRESSION).toHaveLength(5);
      expect(MYTHIC_STAR_PROGRESSION[0].statBonusPercent).toBe(20);
      expect(MYTHIC_STAR_PROGRESSION[4].statBonusPercent).toBe(100);

      expect(computeMythicStarMultiplier(0)).toBe(1.0);
      expect(computeMythicStarMultiplier(1)).toBe(1.2);
      expect(computeMythicStarMultiplier(3)).toBe(1.6);
      expect(computeMythicStarMultiplier(5)).toBe(2.0); // 2.0x base stat multiplier!
    });
  });

  describe('2. Awakening Execution', () => {
    it('properly checks currency sufficiency before awakening', () => {
      expect(canAwakenMythicStar(0, 30, 2, 50000)).toBe(false);
      expect(canAwakenMythicStar(0, 40, 5, 100000)).toBe(true);
      expect(canAwakenMythicStar(5, 9999, 999, 99999999)).toBe(false);
    });

    it('awakens gear sequentially up to 5 stars', () => {
      let stars = 0;

      // 0 -> 1 Star
      const res1 = awakenMythicStar(stars, 40, 5, 100000);
      expect(res1.success).toBe(true);
      expect(res1.newStars).toBe(1);
      stars = res1.newStars;

      // 1 -> 2 Stars
      const res2 = awakenMythicStar(stars, 70, 10, 200000);
      expect(res2.success).toBe(true);
      expect(res2.newStars).toBe(2);
      stars = res2.newStars;

      // Cannot exceed 5 stars
      const resMax = awakenMythicStar(5, 999, 99, 999999);
      expect(resMax.success).toBe(false);
      expect(resMax.message).toContain('최고 성운 5성');
    });
  });

  describe('3. Set Resonance Milestones', () => {
    it('activates progressive milestones at 2, 5, 10, and 15 total stars', () => {
      // 2 Stars
      const r2 = computeMythicSetResonance(2);
      expect(r2.elementalPiercePercent).toBe(15);
      expect(r2.activeMilestones).toHaveLength(1);

      // 5 Stars
      const r5 = computeMythicSetResonance(5);
      expect(r5.elementalPiercePercent).toBe(15);
      expect(r5.critDmgBonus).toBe(0.35);
      expect(r5.damageReduction).toBe(0.05);
      expect(r5.activeMilestones).toHaveLength(2);

      // 10 Stars
      const r10 = computeMythicSetResonance(10);
      expect(r10.elementalPiercePercent).toBe(30);
      expect(r10.atkBonusPercent).toBe(25);
      expect(r10.hpBonusPercent).toBe(25);
      expect(r10.activeMilestones).toHaveLength(3);

      // 15 Stars (Full 3-4 item 5-star set)
      const r15 = computeMythicSetResonance(15);
      expect(r15.chaosErosionImmunity).toBe(true);
      expect(r15.finalDmgMultiplier).toBe(1.30);
      expect(r15.activeMilestones).toHaveLength(4);
    });
  });
});
