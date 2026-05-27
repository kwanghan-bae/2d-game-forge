// Cycle 134 — claim narration variant pure test.

import { describe, expect, it } from 'vitest';
import { CLAIM_NARRATION_VARIANTS, pickClaimNarration } from '../claimNarrationVariants';

describe('Cycle 134 — claimNarrationVariants', () => {
  it('CLAIM_NARRATION_VARIANTS 최소 5 variant', () => {
    expect(CLAIM_NARRATION_VARIANTS.length).toBeGreaterThanOrEqual(5);
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
});
