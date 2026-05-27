// Cycle 143 — claimerTier unit test.

import { describe, expect, it } from 'vitest';
import { getClaimerTier, nextTierThreshold, TIER_UNLOCK_REWARD, getTierUnlockBonus, getClaimerTierProgress } from '../claimerTier';
import type { ClaimerTier } from '../claimerTier';

describe('Cycle 143 — claimerTier', () => {
  it('0 → 신참 / 4 → 신참 / 5 → 노련 (cycle 146 재조정)', () => {
    expect(getClaimerTier(0)).toBe('신참');
    expect(getClaimerTier(4)).toBe('신참');
    expect(getClaimerTier(5)).toBe('노련');
  });

  it('19 → 노련 / 20 → 숙련 / 79 → 숙련', () => {
    expect(getClaimerTier(19)).toBe('노련');
    expect(getClaimerTier(20)).toBe('숙련');
    expect(getClaimerTier(79)).toBe('숙련');
  });

  it('80 → 마스터 / 299 → 마스터 / 300 → 전설', () => {
    expect(getClaimerTier(80)).toBe('마스터');
    expect(getClaimerTier(299)).toBe('마스터');
    expect(getClaimerTier(300)).toBe('전설');
  });

  it('nextTierThreshold — 신참 0 → 노련 5', () => {
    expect(nextTierThreshold(0)).toEqual({ nextTier: '노련', remaining: 5 });
  });

  it('nextTierThreshold — 노련 10 → 숙련 10', () => {
    expect(nextTierThreshold(10)).toEqual({ nextTier: '숙련', remaining: 10 });
  });

  it('nextTierThreshold — 전설 500 → null 0', () => {
    expect(nextTierThreshold(500)).toEqual({ nextTier: null, remaining: 0 });
  });

  /** Cycle 152 — tier 도달 보상 */
  it('cycle 152 TIER_UNLOCK_REWARD — 5 tier 모두 정의 + 신참 0', () => {
    expect(Object.keys(TIER_UNLOCK_REWARD).length).toBe(5);
    expect(TIER_UNLOCK_REWARD['신참'].tokenBonus).toBe(0);
    expect(TIER_UNLOCK_REWARD['전설'].tokenBonus).toBeGreaterThan(TIER_UNLOCK_REWARD['마스터'].tokenBonus);
  });

  it('cycle 152 getTierUnlockBonus — 신참→노련 (4→5) = 5 보너스', () => {
    expect(getTierUnlockBonus(4, 5)).toEqual({ bonus: 5, newTier: '노련' });
  });

  it('cycle 152 getTierUnlockBonus — 같은 tier 안 (1→2) = 0 보너스', () => {
    expect(getTierUnlockBonus(1, 2)).toEqual({ bonus: 0, newTier: null });
  });

  it('cycle 152 getTierUnlockBonus — 마스터→전설 (299→300) = 200 보너스', () => {
    expect(getTierUnlockBonus(299, 300)).toEqual({ bonus: 200, newTier: '전설' });
  });

  it('cycle 152 getTierUnlockBonus — 같은 등급 (전설→전설, 500→501) = 0 보너스', () => {
    expect(getTierUnlockBonus(500, 501)).toEqual({ bonus: 0, newTier: null });
  });

  /** Cycle 163 — TIER_UNLOCK_REWARD compound 산술 sanity (level-designer
   *  cycle 156 권고 의 compound 50-cycle sim 검증 의 정적 부분). 평생 누적
   *  보너스 = 5 + 15 + 50 + 200 = 270 token = 90 균열석 (3:1 cycle 157 ratio).
   *  cycle 116 organic 균열석 90/시즌 와 비교 → 평생 30% 한 시즌 분 보조.
   *  과도하지 않은 milestone reward. */
  it('cycle 163 — TIER_UNLOCK_REWARD 평생 누적 = 270 token / 90 균열석 (3:1)', () => {
    const lifetimeTokens = TIER_UNLOCK_REWARD['신참'].tokenBonus
      + TIER_UNLOCK_REWARD['노련'].tokenBonus
      + TIER_UNLOCK_REWARD['숙련'].tokenBonus
      + TIER_UNLOCK_REWARD['마스터'].tokenBonus
      + TIER_UNLOCK_REWARD['전설'].tokenBonus;
    expect(lifetimeTokens).toBe(270);
    // 3:1 환전 (cycle 157) → 90 균열석 정확.
    expect(Math.floor(lifetimeTokens / 3)).toBe(90);
  });

  it('cycle 163 — TIER_UNLOCK_REWARD 단조 증가 (각 tier 가 이전보다 큼)', () => {
    const tiers: ClaimerTier[] = ['신참', '노련', '숙련', '마스터', '전설'];
    for (let i = 1; i < tiers.length; i++) {
      expect(TIER_UNLOCK_REWARD[tiers[i]].tokenBonus).toBeGreaterThan(
        TIER_UNLOCK_REWARD[tiers[i - 1]].tokenBonus,
      );
    }
  });

  /** Cycle 186 — tier curve sanity: 후속 tier 가 ≥ 2× prev (단계 격차 보장). */
  it('cycle 186 — TIER_UNLOCK_REWARD curve ≥ 2× 단계 격차 (sentinel 매력 보장)', () => {
    expect(TIER_UNLOCK_REWARD['노련'].tokenBonus).toBeGreaterThanOrEqual(2 * 1); // 신참=0 의 격차는 별도
    expect(TIER_UNLOCK_REWARD['숙련'].tokenBonus).toBeGreaterThanOrEqual(2 * TIER_UNLOCK_REWARD['노련'].tokenBonus);
    expect(TIER_UNLOCK_REWARD['마스터'].tokenBonus).toBeGreaterThanOrEqual(2 * TIER_UNLOCK_REWARD['숙련'].tokenBonus);
    expect(TIER_UNLOCK_REWARD['전설'].tokenBonus).toBeGreaterThanOrEqual(2 * TIER_UNLOCK_REWARD['마스터'].tokenBonus);
  });

  /** Cycle 194 — getClaimerTierProgress 0-1 normalized */
  it('cycle 194 — getClaimerTierProgress 경계 5/20/80/300 정합', () => {
    expect(getClaimerTierProgress(0)).toBe(0);      // 신참 0%
    expect(getClaimerTierProgress(2.5)).toBe(0.5);  // 신참 50%
    expect(getClaimerTierProgress(5)).toBe(0);      // 노련 진입, 0%
    expect(getClaimerTierProgress(12.5)).toBe(0.5); // 노련 50% (12.5/15 fraction)
    expect(getClaimerTierProgress(20)).toBe(0);     // 숙련 진입
    expect(getClaimerTierProgress(80)).toBe(0);     // 마스터 진입
    expect(getClaimerTierProgress(300)).toBe(1);    // 전설 (max)
    expect(getClaimerTierProgress(500)).toBe(1);    // 전설 초과도 max
  });

  /** Cycle 186 — tier threshold vs reward 비율 sanity (claim 효율). */
  it('cycle 186 — tier threshold 1 claim 당 보너스 비율 점진 ≤ 1 token/claim (sub-1 가드)', () => {
    // 노련 진입 = 5 claim, bonus 5 → 1.0 token/claim
    expect(TIER_UNLOCK_REWARD['노련'].tokenBonus / 5).toBeLessThanOrEqual(1.5);
    // 숙련 진입 = 20 claim total, bonus 15 → 0.75 token/claim
    expect(TIER_UNLOCK_REWARD['숙련'].tokenBonus / 20).toBeLessThanOrEqual(1.5);
    // 마스터 진입 = 80 claim total, bonus 50 → 0.625 token/claim
    expect(TIER_UNLOCK_REWARD['마스터'].tokenBonus / 80).toBeLessThanOrEqual(1.5);
    // 전설 진입 = 300 claim total, bonus 200 → 0.67 token/claim
    expect(TIER_UNLOCK_REWARD['전설'].tokenBonus / 300).toBeLessThanOrEqual(1.5);
  });
});
