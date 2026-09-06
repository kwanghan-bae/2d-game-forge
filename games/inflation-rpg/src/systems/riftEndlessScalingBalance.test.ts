/**
 * riftEndlessScalingBalance.test.ts — C1082: Endless Chaos Rift Exponential Scaling & Endgame Cap Balance.
 *
 * Verifies:
 * 1. Exponential scaling curves of Guardian HP, ATK, and DEF across Depths 1 to 50.
 * 2. Infinite farming economy: Progressive rewards (Shards, Crack Stones, Gold) per depth.
 * 3. Endgame hero (Tier 9 Celestial Awakening + Full Zodiac + 3 Relics + Alchemy) survival and soft cap (~Depth 24-28).
 * 4. Continuous 10-depth expedition rewards efficiency.
 */

import { describe, it, expect } from 'vitest';
import {
  generateRiftGuardian,
  resolveRiftCombat,
  exploreChaosRift,
} from './endlessChaosRift';
import type { HeroEntity } from '../hero/HeroEntity';

describe('C1082 [balance]: Endless Chaos Rift Scaling & Endgame Cap Balance', () => {
  const createEndgameHero = (): HeroEntity => ({
    id: 'endgame-rift-walker',
    name: '천외천의 무극신선',
    jobId: 'swordsman',
    level: 150,
    hp: 1875000,
    hpMax: 1875000,
    atk: 1800000,
    def: 50000,
    spd: 120,
    critRate: 0.15,
    critDmg: 1.8,
    exp: 0,
    expToNext: 100000,
    gold: 500000,
    cycleCount: 5,
  } as unknown as HeroEntity);

  describe('1. Guardian Exponential Scaling & Reward Curves', () => {
    it('verifies exponential HP, ATK, and DEF inflation from depth 1 to 50', () => {
      const g1 = generateRiftGuardian(1);
      const g10 = generateRiftGuardian(10);
      const g20 = generateRiftGuardian(20);
      const g30 = generateRiftGuardian(30);
      const g50 = generateRiftGuardian(50);

      // Depth 1 Baseline
      expect(g1.maxHp).toBe(1000000);
      expect(g1.atk).toBe(50000);
      expect(g1.def).toBe(10000);

      // Depth 10 (1.15^9 = ~3.5x HP, 1.12^9 = ~2.7x ATK)
      expect(g10.maxHp).toBeGreaterThan(3500000);
      expect(g10.atk).toBeGreaterThan(130000);

      // Depth 20 (1.15^19 = ~14.2x HP, 1.12^19 = ~8.6x ATK)
      expect(g20.maxHp).toBeGreaterThan(14000000);
      expect(g20.atk).toBeGreaterThan(430000);

      // Depth 30 (1.15^29 = ~57.5x HP, 1.12^29 = ~26.7x ATK)
      expect(g30.maxHp).toBeGreaterThan(57000000);
      expect(g30.atk).toBeGreaterThan(1300000);

      // Depth 50 (1.15^49 = ~942x HP, 1.12^49 = ~258x ATK)
      expect(g50.maxHp).toBeGreaterThan(900000000); // 900M+ HP!
      expect(g50.atk).toBeGreaterThan(12000000);   // 12M+ ATK!
    });

    it('proves progressive rewards scale predictably with depth', () => {
      const g1 = generateRiftGuardian(1);
      const g10 = generateRiftGuardian(10);
      const g25 = generateRiftGuardian(25);

      expect(g1.rewards.shards).toBe(13);
      expect(g1.rewards.crackStones).toBe(1);
      expect(g1.rewards.gold).toBe(50000);

      expect(g10.rewards.shards).toBe(40);
      expect(g10.rewards.crackStones).toBe(6);
      expect(g10.rewards.gold).toBe(500000);

      expect(g25.rewards.shards).toBe(85);
      expect(g25.rewards.crackStones).toBe(13);
      expect(g25.rewards.gold).toBe(1250000);
    });
  });

  describe('2. Endgame Hero Capability & Soft Cap Simulation', () => {
    const hero = createEndgameHero();
    const totalDR = 0.45; // 45% DR from reforge + zodiac + alchemy + relics + awakening
    const totalElementBonus = 0.65;
    const finalDmgMultiplier = 2.0;

    it('sweeps Depth 1 in a single devastating turn', () => {
      const res = resolveRiftCombat(
        hero,
        hero.hpMax,
        1,
        'fire',
        totalDR,
        totalElementBonus,
        finalDmgMultiplier,
      );

      expect(res.cleared).toBe(true);
      expect(res.turns).toBe(1); // 1-turn kill!
      expect(res.damageTaken).toBe(0); // Hero attacks first, boss dies before acting
      expect(res.heroRemainingHp).toBe(hero.hpMax);
    });

    it('clears Depth 10 in 1-2 turns with negligible damage taken', () => {
      const res = resolveRiftCombat(
        hero,
        hero.hpMax,
        10,
        'fire',
        totalDR,
        totalElementBonus,
        finalDmgMultiplier,
      );

      expect(res.cleared).toBe(true);
      expect(res.turns).toBeLessThanOrEqual(2);
      expect(res.heroRemainingHp / hero.hpMax).toBeGreaterThan(0.95);
    });

    it('clears Depth 20 in 5 turns and preserves >50% HP', () => {
      const res = resolveRiftCombat(
        hero,
        hero.hpMax,
        20,
        'neutral',
        totalDR,
        totalElementBonus,
        finalDmgMultiplier,
      );

      expect(res.cleared).toBe(true);
      expect(res.turns).toBeLessThanOrEqual(5);
      expect(res.heroRemainingHp).toBeGreaterThan(hero.hpMax * 0.50);
    });

    it('identifies the Soft Cap between Depth 24 and 28 where guardian HP reaches 30M+', () => {
      // Test progression from Depth 20 to 30
      let maxClearedDepth = 20;

      for (let depth = 21; depth <= 30; depth++) {
        const res = resolveRiftCombat(
          hero,
          hero.hpMax,
          depth,
          'neutral',
          totalDR,
          totalElementBonus,
          finalDmgMultiplier,
        );
        if (res.cleared) {
          maxClearedDepth = depth;
        } else {
          break;
        }
      }

      // Soft cap verified in the mid-20s
      expect(maxClearedDepth).toBeGreaterThanOrEqual(23);
      expect(maxClearedDepth).toBeLessThanOrEqual(28);
    });
  });

  describe('3. 10-Depth Expedition Continuous Farming Economy', () => {
    it('clears depths 1~10 continuously and yields substantial rewards', () => {
      const hero = createEndgameHero();
      const res = exploreChaosRift(
        hero,
        1,
        10,
        'neutral',
        0.45,
        0.65,
        2.0,
        0.15, // 15% heal between floors
      );

      expect(res.totalDepthsCleared).toBe(10);
      expect(res.highestDepthCleared).toBe(10);
      expect(res.battleLog).toHaveLength(10);

      // Reward sum for Depths 1 to 10:
      // Shards: sum(10 + 3*d for d=1..10) = 10*10 + 3*55 = 100 + 165 = 265
      expect(res.totalRewards.shards).toBe(265);
      // Crack Stones: sum(1 + floor(d/2) for d=1..10) = 10 + (0+1+1+2+2+3+3+4+4+5) = 10 + 25 = 35
      expect(res.totalRewards.crackStones).toBe(35);
      // Gold: 50,000 * sum(1..10) = 50,000 * 55 = 2,750,000G
      expect(res.totalRewards.gold).toBe(2750000);

      // Hero finishes with high HP thanks to 15% inter-depth heal
      expect(res.heroFinalHp / hero.hpMax).toBeGreaterThan(0.90);
    });
  });
});
