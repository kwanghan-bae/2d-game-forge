import { describe, it, expect } from 'vitest';
import {
  CORRIDOR_SECTORS,
  checkCorridorUnlock,
  resolveCorridorCombat,
  type CorridorSectorId,
} from './abyssalCorridor';
import { HeroEntity } from '../hero/HeroEntity';

describe('abyssalCorridor engine (C1123)', () => {
  function createHero(hp: number, atk: number, def: number = 800_000): HeroEntity {
    const hero = new HeroEntity({
      seed: 42,
      heroHpMax: hp,
      heroAtkBase: atk,
    });
    hero.hp = hp;
    hero.hpMax = hp;
    hero.atk = atk;
    hero.def = def;
    return hero;
  }

  describe('Sector Definitions & Progression', () => {
    it('defines 5 sequential sectors with escalating difficulty and apex rewards', () => {
      expect(CORRIDOR_SECTORS[1].maxHp).toBe(400_000_000);
      expect(CORRIDOR_SECTORS[2].maxHp).toBe(700_000_000);
      expect(CORRIDOR_SECTORS[3].maxHp).toBe(1_100_000_000);
      expect(CORRIDOR_SECTORS[4].maxHp).toBe(1_500_000_000);
      expect(CORRIDOR_SECTORS[5].maxHp).toBe(2_000_000_000);

      expect(CORRIDOR_SECTORS[5].rewards.dimensionalEssence).toBe(5);
      expect(CORRIDOR_SECTORS[5].rewards.title).toBe('태초의 승천자 (Primordial Ascendant)');
    });
  });

  describe('checkCorridorUnlock', () => {
    it('requires Apex Trial Tier 3 cleared to unlock Sector 1', () => {
      expect(checkCorridorUnlock(1, [1, 2], []).unlocked).toBe(false);
      expect(checkCorridorUnlock(1, [1, 2, 3], []).unlocked).toBe(true);
    });

    it('requires previous sector cleared for Sectors 2 to 5', () => {
      expect(checkCorridorUnlock(2, [3], []).unlocked).toBe(false);
      expect(checkCorridorUnlock(2, [3], [1]).unlocked).toBe(true);

      expect(checkCorridorUnlock(5, [3], [1, 2, 3]).unlocked).toBe(false);
      expect(checkCorridorUnlock(5, [3], [1, 2, 3, 4]).unlocked).toBe(true);
    });
  });

  describe('resolveCorridorCombat', () => {
    it('resolves Sector 1 combat and grants rewards on victory', () => {
      const hero = createHero(150_000_000, 80_000_000);
      const res = resolveCorridorCombat(hero, 1, {
        weaponElement: 'water', // counters fire
        playerDR: 0.70,
      });

      expect(res.won).toBe(true);
      expect(res.sector).toBe(1);
      expect(res.guardianName).toBe('잔해의 파수거신');
      expect(res.rewards?.starlightShards).toBe(200);
    });

    it('triggers Vega immunity against Sector 2 Void Erosion', () => {
      const hero = createHero(150_000_000, 80_000_000);
      const resWithVega = resolveCorridorCombat(hero, 2, {
        weaponElement: 'fire',
        playerDR: 0.70,
        transmutedRelics: ['vega_celestial_veil'],
      });

      if (resWithVega.turns >= 2) {
        expect(resWithVega.hazardsTriggered).toContain('영원의 직녀라: 공허 침식 면역');
      }
    });

    it('triggers Sector 4 Gravity Crush hazard (DEF 50% reduction)', () => {
      const hero = createHero(150_000_000, 90_000_000, 1_000_000);
      const res = resolveCorridorCombat(hero, 4, {
        weaponElement: 'fire',
        playerDR: 0.70,
      });

      expect(res.hazardsTriggered).toContain('중력 압착 (방어력 50% 삭감)');
    });

    it('achieves victory on Sector 5 Doomsday Singularity Core with full endgame synergy', () => {
      const apexHero = createHero(200_000_000, 150_000_000, 1_200_000);
      const res = resolveCorridorCombat(apexHero, 5, {
        weaponElement: 'dark', // clash multiplier
        playerDR: 0.75,
        defPierce: 0.20,
        transmutedRelics: [
          'polaris_celestial_eye',
          'sirius_celestial_fang',
          'vega_celestial_veil',
          'antares_celestial_heart',
        ],
        mythicStarsTotal: 15,
        astralResonance: {
          totalAffixes: 3,
          distinctAffixes: ['celestial_sharpness', 'astral_fortitude', 'singularity_might'],
          harmonyTier: 2,
          tierNameKR: '삼위일체 성간 조화',
          hanja: '三位一體星間調和',
          badge: '🌌✨👑',
          omniStatMultiplier: 1.10,
          defPierceBonus: 0.10,
          finalDmgMultiplier: 1.10,
          dimensionalEvasionChance: 0.10,
          elementalBonus: 0.10,
        },
      });

      expect(res.won).toBe(true);
      expect(res.guardianRemainingHp).toBe(0);
      expect(res.rewards?.dimensionalEssence).toBe(5);
      expect(res.rewards?.title).toBe('태초의 승천자 (Primordial Ascendant)');
    });

    it('throws on invalid sector number', () => {
      const hero = createHero(100, 10);
      expect(() => resolveCorridorCombat(hero, 99 as any)).toThrow('Invalid Corridor Sector: 99');
    });
  });
});
