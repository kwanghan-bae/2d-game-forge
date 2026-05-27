// Cycle 143 — claimerTier unit test.

import { describe, expect, it } from 'vitest';
import { getClaimerTier, nextTierThreshold } from '../claimerTier';

describe('Cycle 143 — claimerTier', () => {
  it('0 → 신참 / 9 → 신참 / 10 → 노련', () => {
    expect(getClaimerTier(0)).toBe('신참');
    expect(getClaimerTier(9)).toBe('신참');
    expect(getClaimerTier(10)).toBe('노련');
  });

  it('49 → 노련 / 50 → 숙련 / 199 → 숙련', () => {
    expect(getClaimerTier(49)).toBe('노련');
    expect(getClaimerTier(50)).toBe('숙련');
    expect(getClaimerTier(199)).toBe('숙련');
  });

  it('200 → 마스터 / 999 → 마스터 / 1000 → 전설', () => {
    expect(getClaimerTier(200)).toBe('마스터');
    expect(getClaimerTier(999)).toBe('마스터');
    expect(getClaimerTier(1000)).toBe('전설');
  });

  it('nextTierThreshold — 신참 0 → 노련 10', () => {
    expect(nextTierThreshold(0)).toEqual({ nextTier: '노련', remaining: 10 });
  });

  it('nextTierThreshold — 노련 25 → 숙련 25', () => {
    expect(nextTierThreshold(25)).toEqual({ nextTier: '숙련', remaining: 25 });
  });

  it('nextTierThreshold — 전설 1500 → null 0', () => {
    expect(nextTierThreshold(1500)).toEqual({ nextTier: null, remaining: 0 });
  });
});
