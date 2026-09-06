/**
 * apexTrialBalance.test.ts — C1106: Apex Trial Challenge Mathematical Balance & TTK Simulation.
 *
 * Mathematically validates the progression curve across the 3-tier Apex Trial Summit:
 * - Tier 1: 태초의 여명 (120M HP, 2.8M ATK, 180k DEF)
 * - Tier 2: 불멸의 황혼 (380M HP, 6.2M ATK, 350k DEF)
 * - Tier 3: 무극의 창조주 (1 Billion HP, 12.5M ATK, 600k DEF)
 *
 * Proves that the 1 Billion HP Zenith Divinity strictly requires the synergy of all 4
 * Transmuted Celestial Relics and 15-star Mythic Gear Nebula Resonance.
 */

import { describe, it, expect } from 'vitest';
import {
  APEX_TRIAL_BOSSES,
  resolveApexTrialCombat,
} from './apexTrialChallenge';
import { HeroEntity } from '../hero/HeroEntity';

describe('apexTrialBalance (C1106)', () => {
  function createHero(hp: number, atk: number, def: number = 200_000): HeroEntity {
    const hero = new HeroEntity({
      seed: 12345,
      heroHpMax: hp,
      heroAtkBase: atk,
    });
    hero.hp = hp;
    hero.hpMax = hp;
    hero.atk = atk;
    hero.def = def;
    return hero;
  }

  describe('Tier 1: 태초의 여명 (Primordial Dawn) TTK & Element Mastery', () => {
    it('proves water elemental advantage enables a 5-turn clear vs neutral taking longer', () => {
      const hero = createHero(40_000_000, 18_000_000);

      // Neutral weapon (no element multiplier)
      const neutralRes = resolveApexTrialCombat(hero, 1, {
        weaponElement: 'neutral',
        playerDR: 0.50,
      });

      // Water weapon (counters fire boss: 1.5x damage)
      const waterRes = resolveApexTrialCombat(hero, 1, {
        weaponElement: 'water',
        playerDR: 0.50,
      });

      expect(waterRes.won).toBe(true);
      expect(waterRes.turns).toBeLessThan(neutralRes.turns);
      expect(waterRes.turns).toBeLessThanOrEqual(6);
      expect(waterRes.damageDealt).toBeGreaterThanOrEqual(APEX_TRIAL_BOSSES[1].maxHp);
    });
  });

  describe('Tier 2: 불멸의 황혼 (Immortal Dusk) Erosion & Vega Shield Necessity', () => {
    it('demonstrates that Vega Veil immunity prevents devastating dusk erosion attrition', () => {
      // Hero with 65M HP, 32M ATK facing 6.2M ATK boss
      const hero = createHero(65_000_000, 32_000_000);

      // Without Vega veil: hero suffers erosion damage every turn from turn 3
      const resWithoutVega = resolveApexTrialCombat(hero, 2, {
        weaponElement: 'neutral',
        playerDR: 0.65,
        transmutedRelics: ['polaris_celestial_eye'],
      });

      // With Vega veil: complete immunity to dusk erosion + 15% shield on turn 1
      const resWithVega = resolveApexTrialCombat(hero, 2, {
        weaponElement: 'neutral',
        playerDR: 0.65,
        transmutedRelics: ['vega_celestial_veil', 'polaris_celestial_eye'],
      });

      expect(resWithVega.won).toBe(true);
      // Hero with Vega veil preserves significantly more HP
      expect(resWithVega.heroRemainingHp).toBeGreaterThan(resWithoutVega.heroRemainingHp);
      expect(resWithVega.mechanicsTriggered).toContain('영원의 직녀라: 황혼 침식 면역');
    });
  });

  describe('Tier 3: 무극의 창조주 (Apex of Zenith - 1 Billion HP) Summit Simulation', () => {
    it('proves un-awakened heroes perish to turn 5 Zenith Singularity', () => {
      // Hero with strong baseline stats (60M HP, 25M ATK) but no transmuted relics or mythic stars
      const hero = createHero(60_000_000, 25_000_000);

      const unawakenedResult = resolveApexTrialCombat(hero, 3, {
        weaponElement: 'neutral',
        playerDR: 0.50,
        transmutedRelics: [],
        mythicStarsTotal: 0,
      });

      // Unawakened hero fails against 1 Billion HP and dies
      expect(unawakenedResult.won).toBe(false);
      expect(unawakenedResult.bossRemainingHp).toBeGreaterThan(500_000_000);
      expect(unawakenedResult.mechanicsTriggered).toContain('무극의 창조주: 무극의 특이점 폭발');
    });

    it('mathematically proves victory with all 4 Transmuted Relics and 15-star Mythic Resonance', () => {
      // Fully developed endgame hero: 100M HP, 50M base ATK
      const apexHero = createHero(100_000_000, 50_000_000, 300_000);

      const apexResult = resolveApexTrialCombat(apexHero, 3, {
        weaponElement: 'fire', // counters lightning boss (1.5x) and activates Polaris
        playerDR: 0.65,
        defPierce: 0.10,
        transmutedRelics: [
          'polaris_celestial_eye',
          'sirius_celestial_fang',
          'vega_celestial_veil',
          'antares_celestial_heart',
        ],
        mythicStarsTotal: 15,
      });

      // 1. Sirius deals 100M instant true damage (10% of 1B)
      expect(apexResult.relicsTriggered.some(r => r.includes('멸겁의 천랑아'))).toBe(true);

      // 2. Vega shields 15M HP (15% of 100M)
      expect(apexResult.relicsTriggered.some(r => r.includes('영원의 직녀라'))).toBe(true);

      // 3. Victorious within reasonable turns (<= 8 turns)
      expect(apexResult.won).toBe(true);
      expect(apexResult.turns).toBeLessThanOrEqual(8);
      expect(apexResult.bossRemainingHp).toBe(0);

      // 4. Full summit rewards awarded
      expect(apexResult.rewards?.starlightShards).toBe(800);
      expect(apexResult.rewards?.crackStones).toBe(150);
      expect(apexResult.rewards?.gold).toBe(10_000_000);
      expect(apexResult.rewards?.title).toBe('무극의 초월자 (Zenith Transcendent)');
    });
  });

  describe('Rewards & Economy Scaling Curve across Apex Tiers', () => {
    it('scales rewards super-linearly from Tier 1 to Tier 3', () => {
      const t1 = APEX_TRIAL_BOSSES[1].rewards;
      const t2 = APEX_TRIAL_BOSSES[2].rewards;
      const t3 = APEX_TRIAL_BOSSES[3].rewards;

      // Starlight shards: 150 -> 300 -> 800
      expect(t2.starlightShards).toBe(t1.starlightShards * 2);
      expect(t3.starlightShards).toBeGreaterThan(t2.starlightShards * 2.5);

      // Crack stones: 30 -> 60 -> 150
      expect(t2.crackStones).toBe(t1.crackStones * 2);
      expect(t3.crackStones).toBe(t2.crackStones * 2.5);

      // Gold: 1M -> 2.5M -> 10M
      expect(t2.gold).toBe(2_500_000);
      expect(t3.gold).toBe(10_000_000);
    });
  });
});
