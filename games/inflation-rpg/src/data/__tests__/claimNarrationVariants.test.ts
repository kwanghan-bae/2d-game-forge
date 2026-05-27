// Cycle 134 — claim narration variant pure test.

import { describe, expect, it } from 'vitest';
import { CLAIM_NARRATION_VARIANTS, pickClaimNarration, TIER_VOCATIVE_PREFIX } from '../claimNarrationVariants';

describe('Cycle 134 — claimNarrationVariants', () => {
  it('CLAIM_NARRATION_VARIANTS 최소 12 variant (cycle 142 확장)', () => {
    expect(CLAIM_NARRATION_VARIANTS.length).toBeGreaterThanOrEqual(12);
  });

  it('모든 variant non-empty + 50 자 이내', () => {
    for (const v of CLAIM_NARRATION_VARIANTS) {
      expect(v.length).toBeGreaterThan(0);
      expect(v.length).toBeLessThanOrEqual(50);
    }
  });

  it('pickClaimNarration(seed) — 동일 seed 동일 결과 (deterministic)', () => {
    expect(pickClaimNarration(0)).toBe(CLAIM_NARRATION_VARIANTS[0]);
    expect(pickClaimNarration(CLAIM_NARRATION_VARIANTS.length)).toBe(CLAIM_NARRATION_VARIANTS[0]);
    expect(pickClaimNarration(1)).toBe(CLAIM_NARRATION_VARIANTS[1]);
  });

  it('pickClaimNarration() — 인자 없을 때 catalog 안 반환', () => {
    const out = pickClaimNarration();
    expect(CLAIM_NARRATION_VARIANTS).toContain(out);
  });

  it('pickClaimNarration(negative seed) — modulo 정상', () => {
    const out = pickClaimNarration(-1);
    expect(CLAIM_NARRATION_VARIANTS).toContain(out);
  });

  /** Cycle 148 — tier prefix 적용 */
  it('cycle 148 — tier 인자 시 prefix 부착', () => {
    expect(pickClaimNarration(0, '신참')).toBe(`${TIER_VOCATIVE_PREFIX['신참']}, ${CLAIM_NARRATION_VARIANTS[0]}`);
    expect(pickClaimNarration(1, '전설')).toBe(`${TIER_VOCATIVE_PREFIX['전설']}, ${CLAIM_NARRATION_VARIANTS[1]}`);
  });

  it('cycle 148 — tier undefined 시 prefix 없음 (legacy 호환)', () => {
    expect(pickClaimNarration(0)).toBe(CLAIM_NARRATION_VARIANTS[0]);
    expect(pickClaimNarration(0, undefined)).toBe(CLAIM_NARRATION_VARIANTS[0]);
  });

  it('cycle 148 — TIER_VOCATIVE_PREFIX 5 tier 모두 정의', () => {
    expect(Object.keys(TIER_VOCATIVE_PREFIX).length).toBe(5);
    for (const tier of ['신참', '노련', '숙련', '마스터', '전설'] as const) {
      expect(TIER_VOCATIVE_PREFIX[tier].length).toBeGreaterThan(0);
    }
  });

  /** Cycle 156 — story-writer #2 권고: variant 0 의 자체 vocative 제거로
   *  TIER_VOCATIVE_PREFIX 합성 시 이중 호칭 ('용사여, 용사여, ...') 부재 검증.
   *  occurrence-count 가드 — 신참 합성에 '용사여' 1 회, 전설 합성에 0 회. */
  it('cycle 156 — variant 0 + tier prefix 합성 시 vocative 이중 부재', () => {
    const 신참 = pickClaimNarration(0, '신참');
    const 전설 = pickClaimNarration(0, '전설');
    expect(신참.split('용사여').length - 1).toBe(1);
    expect(전설.split('용사여').length - 1).toBe(0);
  });
});
