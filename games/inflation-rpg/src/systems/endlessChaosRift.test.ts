/**
 * endlessChaosRift.test.ts — C1079: Endless Procedural Chaos Rift Dungeon Engine Unit Tests.
 */

import { describe, it, expect } from 'vitest';
import {
  generateRiftGuardian,
  resolveRiftCombat,
  exploreChaosRift,
} from './endlessChaosRift';
import type { HeroEntity } from '../hero/HeroEntity';

describe('C1079 [system]: Endless Chaos Rift Procedural Dungeon Engine', () => {
  const createHero = (atk: number, hp: number, def: number): HeroEntity => ({
    id: 'rift-walker-hero',
    name: '천외천의 무극신선',
    jobId: 'swordsman',
    level: 150,
    hp,
    hpMax: hp,
    atk,
    def,
    spd: 120,
    critRate: 0.15,
    critDmg: 1.8,
    exp: 0,
    expToNext: 100000,
    gold: 50000,
    cycleCount: 5,
  } as unknown as HeroEntity);

  describe('generateRiftGuardian', () => {
    it('procedurally scales guardian stats exponentially with depth', () => {
      const g1 = generateRiftGuardian(1);
      const g10 = generateRiftGuardian(10);
      const g25 = generateRiftGuardian(25);

      expect(g1.depth).toBe(1);
      expect(g1.maxHp).toBe(1000000);
      expect(g1.atk).toBe(50000);
      expect(g1.def).toBe(10000);
      expect(g1.rewards.shards).toBe(13); // 10 + 3*1

      expect(g10.maxHp).toBeGreaterThan(g1.maxHp * 3);
      expect(g10.atk).toBeGreaterThan(g1.atk * 2.5);
      expect(g10.rewards.shards).toBe(40); // 10 + 3*10

      expect(g25.maxHp).toBeGreaterThan(g10.maxHp * 5);
      expect(g25.rewards.shards).toBe(85); // 10 + 3*25
    });

    it('cycles through the 4 elemental affinities deterministically', () => {
      const g1 = generateRiftGuardian(1);
      const g2 = generateRiftGuardian(2);
      const g3 = generateRiftGuardian(3);
      const g4 = generateRiftGuardian(4);
      const g5 = generateRiftGuardian(5);

      expect(g1.element).toBe('fire');
      expect(g2.element).toBe('water');
      expect(g3.element).toBe('lightning');
      expect(g4.element).toBe('dark');
      expect(g5.element).toBe('fire');
    });
  });

  describe('resolveRiftCombat', () => {
    it('clears depth 1 and grants scaled shards, crack stones, and gold', () => {
      const hero = createHero(300000, 800000, 30000);
      const res = resolveRiftCombat(hero, hero.hpMax, 1, 'fire', 0.25, 0.20, 1.0);

      expect(res.cleared).toBe(true);
      expect(res.depth).toBe(1);
      expect(res.turns).toBe(4);
      expect(res.rewards).toEqual({
        shards: 13,
        crackStones: 1,
        gold: 50000,
      });
      expect(res.heroRemainingHp).toBeGreaterThan(0);
    });

    it('amplifies hero damage with 2.0x final damage multiplier from Tier 9 awakening', () => {
      const hero = createHero(500000, 1000000, 30000);

      // Without 2.0x multiplier
      const res1 = resolveRiftCombat(hero, hero.hpMax, 5, 'neutral', 0.20, 0, 1.0);
      // With 2.0x multiplier
      const res2 = resolveRiftCombat(hero, hero.hpMax, 5, 'neutral', 0.20, 0, 2.0);

      expect(res2.turns).toBeLessThan(res1.turns);
    });

    it('fails depth when guardian damage depletes hero HP', () => {
      const weakHero = createHero(5000, 10000, 1000);
      const res = resolveRiftCombat(weakHero, weakHero.hpMax, 20);

      expect(res.cleared).toBe(false);
      expect(res.heroRemainingHp).toBe(0);
      expect(res.rewards).toBeUndefined();
    });
  });

  describe('exploreChaosRift', () => {
    it('endgame awakened hero successfully ascends 5 consecutive depths', () => {
      const hero = createHero(800000, 1500000, 50000);
      const res = exploreChaosRift(hero, 1, 5, 'neutral', 0.35, 0.30, 2.0, 0.15);

      expect(res.totalDepthsCleared).toBe(5);
      expect(res.highestDepthCleared).toBe(5);
      expect(res.battleLog).toHaveLength(5);
      expect(res.totalRewards.shards).toBeGreaterThan(50);
      expect(res.totalRewards.gold).toBeGreaterThan(500000);
      expect(res.heroFinalHp).toBeGreaterThan(0);
    });

    it('terminates expedition upon defeat and preserves earned rewards', () => {
      const midHero = createHero(60000, 100000, 5000);
      const res = exploreChaosRift(midHero, 1, 10, 'neutral', 0.10, 0, 1.0);

      expect(res.totalDepthsCleared).toBeLessThan(10);
      expect(res.highestDepthCleared).toBe(res.totalDepthsCleared);
      expect(res.heroFinalHp).toBe(0);
    });
  });
});
