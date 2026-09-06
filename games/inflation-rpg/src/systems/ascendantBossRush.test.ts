/**
 * ascendantBossRush.test.ts — C1072: Ascendant Boss Rush Engine Unit Tests.
 */

import { describe, it, expect } from 'vitest';
import {
  BOSS_RUSH_WAVES,
  TOTAL_RUSH_WAVES,
  TOTAL_RUSH_REWARDS,
  resolveBossRushWave,
  runFullBossRush,
} from './ascendantBossRush';
import type { HeroEntity } from '../hero/HeroEntity';

describe('C1072 [system]: Ascendant Boss Rush 5-Wave Trial Engine', () => {
  const createHero = (atk: number, hp: number, def: number): HeroEntity => ({
    id: 'rush-hero',
    name: '성광의 용사',
    jobId: 'swordsman',
    level: 150,
    hp,
    hpMax: hp,
    atk,
    def,
    spd: 100,
    critRate: 0.10,
    critDmg: 1.5,
    exp: 0,
    expToNext: 100000,
    gold: 50000,
    cycleCount: 5,
  } as unknown as HeroEntity);

  it('defines 5 ascending boss waves with progressive HP, ATK, and rewards', () => {
    expect(TOTAL_RUSH_WAVES).toBe(5);
    expect(BOSS_RUSH_WAVES).toHaveLength(5);

    let prevHp = 0;
    for (let i = 0; i < 5; i++) {
      const wave = BOSS_RUSH_WAVES[i];
      expect(wave.wave).toBe(i + 1);
      expect(wave.maxHp).toBeGreaterThan(prevHp);
      prevHp = wave.maxHp;

      expect(wave.rewards.shards).toBeGreaterThan(0);
      expect(wave.rewards.crackStones).toBeGreaterThan(0);
      expect(wave.rewards.gold).toBeGreaterThan(0);
    }

    expect(TOTAL_RUSH_REWARDS.shards).toBe(240);
    expect(TOTAL_RUSH_REWARDS.crackStones).toBe(33);
    expect(TOTAL_RUSH_REWARDS.gold).toBe(330000);
  });

  describe('resolveBossRushWave', () => {
    it('clears Wave 1 and grants 15 shards, 2 crack stones, 20k gold', () => {
      const hero = createHero(200000, 600000, 20000);
      const res = resolveBossRushWave(hero, hero.hpMax, 0, 'fire', 0.20, 0.15);

      expect(res.cleared).toBe(true);
      expect(res.wave).toBe(1);
      expect(res.bossName).toBe('승천의 발키리');
      expect(res.turns).toBe(3); // 500,000 / (200,000 - 5,000) = 3 turns
      expect(res.rewardsGained).toEqual({
        shards: 15,
        crackStones: 2,
        gold: 20000,
      });
      expect(res.heroRemainingHp).toBeGreaterThan(0);
    });

    it('fails wave when hero HP drops to 0 against overwhelming boss attack', () => {
      const weakHero = createHero(1000, 5000, 0);
      const res = resolveBossRushWave(weakHero, weakHero.hpMax, 4); // Wave 5 boss

      expect(res.cleared).toBe(false);
      expect(res.heroRemainingHp).toBe(0);
      expect(res.rewardsGained).toBeUndefined();
    });
  });

  describe('runFullBossRush', () => {
    it('endgame celestial hero clears all 5 waves and claims all 240 shards + 33 crack stones', () => {
      // Endgame celestial hero with Zodiac + Alchemy + Relics (ATK ~450k, HP ~1M, DEF ~35k, DR 26%)
      const hero = createHero(450000, 1000000, 35000);
      const fullRes = runFullBossRush(hero, 'dark', 0.26, 0.25, 0.20);

      expect(fullRes.allCleared).toBe(true);
      expect(fullRes.wavesCleared).toBe(5);
      expect(fullRes.waveResults).toHaveLength(5);

      // Verify total payouts
      expect(fullRes.totalRewards).toEqual({
        shards: 240,
        crackStones: 33,
        gold: 330000,
      });

      // Surviving HP preserved
      expect(fullRes.heroFinalHp).toBeGreaterThan(0);
      expect(fullRes.totalTurns).toBeGreaterThan(15);
      expect(fullRes.totalTurns).toBeLessThan(60);
    });

    it('early defeat terminates rush at reached wave and preserves accumulated rewards', () => {
      // Moderate hero that can clear wave 1 and 2, but dies at wave 3
      const midHero = createHero(50000, 80000, 5000);
      const res = runFullBossRush(midHero, 'neutral', 0.10, 0);

      expect(res.allCleared).toBe(false);
      expect(res.wavesCleared).toBeLessThan(5);
      expect(res.waveResults.length).toBe(res.wavesCleared + 1);
      // Final wave result indicates defeat
      const lastWave = res.waveResults[res.waveResults.length - 1];
      expect(lastWave.cleared).toBe(false);
      expect(res.heroFinalHp).toBe(0);
    });
  });
});
