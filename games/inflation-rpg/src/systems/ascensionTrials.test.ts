import { describe, it, expect } from 'vitest';
import {
  TRIAL_FLOORS,
  MAX_TRIAL_FLOOR,
  getTrialFloor,
  resolveTrialCombat,
} from './ascensionTrials';
import { HeroEntity } from '../hero/HeroEntity';

describe('C1043: AscensionTrials (승천의 시련) Boss Rush Engine Tests', () => {
  describe('Floor Definitions & Progression Scaling', () => {
    it('has exactly 10 floors with monotonically increasing HP, ATK, and rewards', () => {
      expect(TRIAL_FLOORS).toHaveLength(MAX_TRIAL_FLOOR);

      let prevHp = 0;
      let prevAtk = 0;
      let prevStones = 0;

      for (const floor of TRIAL_FLOORS) {
        expect(floor.baseHp).toBeGreaterThan(prevHp);
        expect(floor.baseAtk).toBeGreaterThan(prevAtk);
        expect(floor.rewards.enhanceStones).toBeGreaterThan(prevStones);

        prevHp = floor.baseHp;
        prevAtk = floor.baseAtk;
        prevStones = floor.rewards.enhanceStones;
      }
    });

    it('retrieves floor by number and returns null for invalid floor numbers', () => {
      const f1 = getTrialFloor(1);
      expect(f1?.enemyId).toBe('volcano_drake');
      expect(f1?.element).toBe('fire');

      const f10 = getTrialFloor(10);
      expect(f10?.enemyId).toBe('chaos_overlord');

      expect(getTrialFloor(0)).toBeNull();
      expect(getTrialFloor(11)).toBeNull();
    });
  });

  describe('Trial Combat Resolution & Elemental Advantage', () => {
    it('high-level hero successfully defeats Floor 1 and claims rewards', () => {
      const hero = HeroEntity.create({ seed: 42, heroHpMax: 10000, heroAtkBase: 2000 });
      const result = resolveTrialCombat(hero, 1, 'water', 0.10);

      expect(result.won).toBe(true);
      expect(result.elementalMultiplier).toBe(1.5); // Water vs Fire
      expect(result.affinityRelation).toBe('weakness');
      expect(result.rewards).toBeDefined();
      expect(result.rewards?.enhanceStones).toBe(5);
      expect(result.rewards?.gold).toBe(3000);
      expect(result.rewards?.jpBonus).toBe(2);
    });

    it('elemental advantage deals 1.5x damage and finishes fight faster than disadvantage', () => {
      // Boss: Volcano Drake (Fire), HP: 5,000
      // 1. Water Hero (Advantage)
      const heroWater = HeroEntity.create({ seed: 1, heroHpMax: 10000, heroAtkBase: 1000 });
      const resWater = resolveTrialCombat(heroWater, 1, 'water');

      // 2. Lightning Hero (Disadvantage)
      const heroLightning = HeroEntity.create({ seed: 1, heroHpMax: 10000, heroAtkBase: 1000 });
      const resLightning = resolveTrialCombat(heroLightning, 1, 'lightning');

      expect(resWater.turns).toBeLessThan(resLightning.turns);
      expect(resWater.heroRemainingHp).toBeGreaterThan(resLightning.heroRemainingHp);
    });

    it('armor DR reduces damage taken from trial boss', () => {
      const heroNoDr = HeroEntity.create({ seed: 1, heroHpMax: 10000, heroAtkBase: 1200 });
      const resNoDr = resolveTrialCombat(heroNoDr, 2, 'neutral', 0);

      const heroWithDr = HeroEntity.create({ seed: 1, heroHpMax: 10000, heroAtkBase: 1200 });
      const resWithDr = resolveTrialCombat(heroWithDr, 2, 'neutral', 0.20); // 20% DR

      expect(resWithDr.won).toBe(true);
      expect(resNoDr.won).toBe(true);
      expect(resWithDr.damageTakenTotal).toBeLessThan(resNoDr.damageTakenTotal);
      expect(resWithDr.heroRemainingHp).toBeGreaterThan(resNoDr.heroRemainingHp);
    });
  });
});
