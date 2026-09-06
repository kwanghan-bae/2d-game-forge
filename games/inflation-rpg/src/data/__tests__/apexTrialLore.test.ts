import { describe, it, expect } from 'vitest';
import {
  APEX_TRIAL_LORE,
  getApexBossLore,
  formatApexTrialSagaEntry,
} from '../apexTrialLore';
import type { ApexTrialTier } from '../../systems/apexTrialChallenge';

describe('apexTrialLore (C1107)', () => {
  const tiers: ApexTrialTier[] = [1, 2, 3];

  it('contains comprehensive lore entries for all 3 Apex Trial tiers', () => {
    tiers.forEach((tier) => {
      const lore = getApexBossLore(tier);
      expect(lore).toBeDefined();
      expect(lore.tier).toBe(tier);
      expect(lore.bossNameKR.length).toBeGreaterThan(0);
      expect(lore.encounterQuote.length).toBeGreaterThan(10);
      expect(lore.mechanicQuote.length).toBeGreaterThan(10);
      expect(lore.defeatCry.length).toBeGreaterThan(10);
      expect(lore.sagaChronicle.length).toBeGreaterThan(15);
    });
  });

  it('formats epic saga chronicle inscriptions containing tier, hero name, and boss name', () => {
    const saga1 = formatApexTrialSagaEntry(1, '아르테미스');
    expect(saga1).toContain('[초월 시련 1단계]');
    expect(saga1).toContain('용사 아르테미스이(가) 태초의 성흔룡을(를) 토벌하였다.');
    expect(saga1).toContain('태초의 새벽을 여는 자로 칭송받았다.');

    const saga3 = formatApexTrialSagaEntry(3, '무극신선');
    expect(saga3).toContain('[초월 시련 3단계]');
    expect(saga3).toContain('용사 무극신선이(가) 무극의 창조주을(를) 토벌하였다.');
    expect(saga3).toContain('무극의 초월자로 신화에 새겨졌다.');
  });

  it('throws error when querying invalid tier', () => {
    expect(() => getApexBossLore(99 as any)).toThrow('Invalid Apex Trial tier for lore: 99');
  });
});
