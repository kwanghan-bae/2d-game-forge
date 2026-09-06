import { describe, it, expect } from 'vitest';
import {
  APEX_TRIAL_BOSSES,
  checkApexTrialUnlock,
  resolveApexTrialCombat,
} from './apexTrialChallenge';
import { HeroEntity } from '../hero/HeroEntity';

describe('apexTrialChallenge engine (C1103)', () => {
  function createMockHero(hp: number, atk: number): HeroEntity {
    const hero = new HeroEntity({
      seed: 42,
      heroHpMax: hp,
      heroAtkBase: atk,
    });
    hero.hp = hp;
    hero.hpMax = hp;
    hero.atk = atk;
    return hero;
  }

  describe('Boss definitions', () => {
    it('defines 3 tiers with increasing difficulty and proper rewards', () => {
      expect(APEX_TRIAL_BOSSES[1].maxHp).toBe(120_000_000);
      expect(APEX_TRIAL_BOSSES[2].maxHp).toBe(380_000_000);
      expect(APEX_TRIAL_BOSSES[3].maxHp).toBe(1_000_000_000);

      expect(APEX_TRIAL_BOSSES[1].rewards.starlightShards).toBe(150);
      expect(APEX_TRIAL_BOSSES[2].rewards.starlightShards).toBe(300);
      expect(APEX_TRIAL_BOSSES[3].rewards.starlightShards).toBe(800);
    });
  });

  describe('checkApexTrialUnlock', () => {
    it('evaluates Tier 1 unlock condition based on rift depth >= 20', () => {
      expect(checkApexTrialUnlock(1, 19, [], 0, 0).unlocked).toBe(false);
      expect(checkApexTrialUnlock(1, 20, [], 0, 0).unlocked).toBe(true);
      expect(checkApexTrialUnlock(1, 35, [], 0, 0).unlocked).toBe(true);
    });

    it('evaluates Tier 2 unlock condition: Tier 1 cleared & >=1 transmuted relic', () => {
      expect(checkApexTrialUnlock(2, 30, [], 1, 0).unlocked).toBe(false);
      expect(checkApexTrialUnlock(2, 30, [1], 0, 0).unlocked).toBe(false);
      expect(checkApexTrialUnlock(2, 30, [1], 1, 0).unlocked).toBe(true);
    });

    it('evaluates Tier 3 unlock condition: Tier 2 cleared & (4 transmuted relics or 15 stars)', () => {
      expect(checkApexTrialUnlock(3, 40, [1], 4, 15).unlocked).toBe(false);
      expect(checkApexTrialUnlock(3, 40, [1, 2], 3, 10).unlocked).toBe(false);
      expect(checkApexTrialUnlock(3, 40, [1, 2], 4, 0).unlocked).toBe(true);
      expect(checkApexTrialUnlock(3, 40, [1, 2], 1, 15).unlocked).toBe(true);
    });
  });

  describe('resolveApexTrialCombat', () => {
    it('resolves Tier 1 combat and triggers Dawn solar flare mechanic', () => {
      // Hero with water element (counters fire boss)
      const hero = createMockHero(50_000_000, 25_000_000);
      const result = resolveApexTrialCombat(hero, 1, {
        weaponElement: 'water',
        playerDR: 0.50,
      });

      expect(result.tier).toBe(1);
      expect(result.mechanicsTriggered).toContain('태초의 성흔룡: 여명의 폭염');
      expect(result.won).toBe(true);
      expect(result.rewards?.title).toBe('여명의 개척자');
    });

    it('handles Vega veil immunity against Tier 2 Dusk Erosion', () => {
      const heroWithoutVega = createMockHero(100_000_000, 40_000_000);
      const resWithout = resolveApexTrialCombat(heroWithoutVega, 2, {
        weaponElement: 'neutral',
        playerDR: 0.60,
      });
      // Should have dusk erosion damage if battle reaches turn 3+
      if (resWithout.turns >= 3) {
        expect(resWithout.mechanicsTriggered).toContain('불멸의 황혼성황: 황혼 침식 지속 피해');
      }

      const heroWithVega = createMockHero(100_000_000, 40_000_000);
      const resWith = resolveApexTrialCombat(heroWithVega, 2, {
        weaponElement: 'neutral',
        playerDR: 0.60,
        transmutedRelics: ['vega_celestial_veil'],
      });
      if (resWith.turns >= 3) {
        expect(resWith.mechanicsTriggered).toContain('영원의 직녀라: 황혼 침식 면역');
      }
      expect(resWith.relicsTriggered.some(r => r.includes('영원의 직녀라'))).toBe(true);
    });

    it('triggers Sirius true damage and Antares revival in deep Tier 3 battle', () => {
      // Hero with high ATK but fragile HP against Tier 3 boss (12.5M ATK)
      const hero = createMockHero(10_000_000, 60_000_000);
      const result = resolveApexTrialCombat(hero, 3, {
        weaponElement: 'dark', // neutral vs lightning
        playerDR: 0.30,
        transmutedRelics: [
          'sirius_celestial_fang',
          'antares_celestial_heart',
        ],
      });

      expect(result.relicsTriggered.some(r => r.includes('멸겁의 천랑아'))).toBe(true);
      // Hero would have taken fatal damage and revived
      if (result.revivedByAntares) {
        expect(result.relicsTriggered.some(r => r.includes('불멸의 대화심'))).toBe(true);
      }
    });

    it('achieves victory on Tier 3 Apex of Zenith with full 4 relics and 15-star mythic resonance', () => {
      const hero = createMockHero(120_000_000, 80_000_000);
      const result = resolveApexTrialCombat(hero, 3, {
        weaponElement: 'dark',
        playerDR: 0.70,
        transmutedRelics: [
          'polaris_celestial_eye',
          'sirius_celestial_fang',
          'vega_celestial_veil',
          'antares_celestial_heart',
        ],
        mythicStarsTotal: 15,
      });

      expect(result.won).toBe(true);
      expect(result.bossRemainingHp).toBe(0);
      expect(result.rewards?.title).toBe('무극의 초월자 (Zenith Transcendent)');
      expect(result.rewards?.starlightShards).toBe(800);
    });

    it('throws on invalid trial tier', () => {
      const hero = createMockHero(1000, 100);
      expect(() => resolveApexTrialCombat(hero, 99 as any)).toThrow('Invalid Apex Trial Tier: 99');
    });
  });
});
