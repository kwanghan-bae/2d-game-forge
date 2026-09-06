/**
 * celestialRelicTransmutation.test.ts — C1099: Celestial Relic Transmutation Unit Tests.
 */

import { describe, it, expect } from 'vitest';
import {
  TRANSMUTED_RELICS,
  BASE_TO_TRANSMUTED,
  canTransmuteRelic,
  transmuteRelic,
  evaluateAntaresRevive,
} from './celestialRelicTransmutation';

describe('C1099 [system]: Celestial Relic Transmutation Engine', () => {
  describe('Definitions and Mapping', () => {
    it('maps all 4 base relics to transmuted apex relics with unique skills', () => {
      expect(BASE_TO_TRANSMUTED.polaris_eye).toBe('polaris_celestial_eye');
      expect(BASE_TO_TRANSMUTED.sirius_fang).toBe('sirius_celestial_fang');
      expect(BASE_TO_TRANSMUTED.vega_veil).toBe('vega_celestial_veil');
      expect(BASE_TO_TRANSMUTED.antares_heart).toBe('antares_celestial_heart');

      const polaris = TRANSMUTED_RELICS.polaris_celestial_eye;
      expect(polaris.apexSkillName).toBe('태초의 직관');
      expect(polaris.costShards).toBe(120);
      expect(polaris.costCrackStones).toBe(20);
      expect(polaris.costGold).toBe(300000);
    });
  });

  describe('Transmutation Execution', () => {
    it('evaluates resource requirements accurately', () => {
      expect(canTransmuteRelic('polaris_eye', 100, 15, 200000)).toBe(false);
      expect(canTransmuteRelic('polaris_eye', 120, 20, 300000)).toBe(true);
    });

    it('transmutes relic and returns spent resources and apex skill announcement', () => {
      const res = transmuteRelic('antares_heart', 150, 25, 400000);
      expect(res.success).toBe(true);
      expect(res.transmutedType).toBe('antares_celestial_heart');
      expect(res.shardsSpent).toBe(120);
      expect(res.crackStonesSpent).toBe(20);
      expect(res.goldSpent).toBe(300000);
      expect(res.message).toContain('불사조의 환생');
    });

    it('fails transmutation when resources are insufficient', () => {
      const res = transmuteRelic('sirius_fang', 50, 5, 50000);
      expect(res.success).toBe(false);
      expect(res.shardsSpent).toBe(0);
      expect(res.message).toContain('부족합니다');
    });
  });

  describe('Antares Celestial Heart Revive Trigger', () => {
    it('revives fallen hero with 50% max HP once per expedition', () => {
      const heroMaxHp = 2000000;

      // 1st fatal blow: Revives!
      const res1 = evaluateAntaresRevive(0, heroMaxHp, true, false);
      expect(res1.revived).toBe(true);
      expect(res1.newHp).toBe(1000000); // 50% of 2M
      expect(res1.usedNow).toBe(true);

      // 2nd fatal blow: Already used -> No revive
      const res2 = evaluateAntaresRevive(0, heroMaxHp, true, true);
      expect(res2.revived).toBe(false);
      expect(res2.newHp).toBe(0);
      expect(res2.usedNow).toBe(false);

      // Non-fatal blow: No revive
      const res3 = evaluateAntaresRevive(500000, heroMaxHp, true, false);
      expect(res3.revived).toBe(false);
      expect(res3.newHp).toBe(500000);
    });
  });
});
