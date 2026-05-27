// Cycle 143 — claimerTier unit test.

import { describe, expect, it } from 'vitest';
import { getClaimerTier, nextTierThreshold } from '../claimerTier';

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
});
