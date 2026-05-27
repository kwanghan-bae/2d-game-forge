// Cycle 134 — claim narration variant pure test.

import { describe, expect, it } from 'vitest';
import {
  CLAIM_NARRATION_VARIANTS,
  pickClaimNarration,
  pickClaimNarrationWeighted,
  TIER_VOCATIVE_PREFIX,
  CLAIM_NARRATION_BY_REALM,
  CLAIM_NARRATION_BY_REALM_TONED,
  formatClaimFeedback,
} from '../claimNarrationVariants';

describe('Cycle 134 — claimNarrationVariants', () => {
  it('CLAIM_NARRATION_VARIANTS 최소 20 variant (cycle 253 확장)', () => {
    expect(CLAIM_NARRATION_VARIANTS.length).toBeGreaterThanOrEqual(20);
  });

  it('모든 variant non-empty + 50 자 이내', () => {
    for (const v of CLAIM_NARRATION_VARIANTS) {
      expect(v.length).toBeGreaterThan(0);
      expect(v.length).toBeLessThanOrEqual(50);
    }
  });

  /** Cycle 204 — variant min length 5자 invariant. 5자 미만 = 의미 부재 narrative. */
  it('cycle 204 — 모든 general variant 의 length ≥ 5 (의미 보장)', () => {
    for (const v of CLAIM_NARRATION_VARIANTS) {
      expect(v.length, `"${v}" 너무 짧음`).toBeGreaterThanOrEqual(5);
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

  /** Cycle 202 — formatClaimFeedback helper. */
  describe('Cycle 202 — formatClaimFeedback', () => {
    it('tier 없을 때 — narration + delta', () => {
      expect(formatClaimFeedback('인사', 2, null)).toBe('인사 (+2 🎫)');
    });

    it('tier 진입 시 — ★ suffix 부착', () => {
      expect(formatClaimFeedback('인사', 3, '노련')).toBe('인사 (+3 🎫) ★ 노련 등급 달성!');
    });
  });

  /** Cycle 201 — TIER_VOCATIVE_PREFIX 길이 sanity (1-20자 invariant). */
  it('cycle 201 — TIER_VOCATIVE_PREFIX 각 prefix 의 길이가 1-20자', () => {
    for (const tier of ['신참', '노련', '숙련', '마스터', '전설'] as const) {
      const prefix = TIER_VOCATIVE_PREFIX[tier];
      expect(prefix.length, `${tier} prefix length`).toBeGreaterThanOrEqual(1);
      expect(prefix.length, `${tier} prefix length`).toBeLessThanOrEqual(20);
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

  /** Cycle 165 — realm-aware sub-pool (story-writer #3 11-cycle 표류 deadline) */
  describe('Cycle 165 — realm-aware sub-pool', () => {
    it('realm 미지정 → general pool 만 (backward compat)', () => {
      const a = pickClaimNarration(0);
      const b = pickClaimNarration(0, undefined, null);
      expect(a).toBe(b);
      expect(a).toBe(CLAIM_NARRATION_VARIANTS[0]);
    });

    it('realm = sea → sub-pool variant 가 후보에 합류 (union 길이 22, cycle 253 pool 확장 후)', () => {
      // union = 20 general (cycle 253) + 2 sea = 22. seed 20 → union[20] = first sea variant.
      const out = pickClaimNarration(20, undefined, 'sea');
      expect(out).toBe('바다의 너울이 그대의 이름을 적신다');
    });

    it('realm = volcano → seed 21 (union 22 의 idx 21) = second volcano variant', () => {
      expect(pickClaimNarration(21, undefined, 'volcano')).toBe('잿더미 위로 별이 떨어진다');
    });

    it('realm = unknown → general pool fallback (backward compat)', () => {
      const a = pickClaimNarration(5);
      const b = pickClaimNarration(5, undefined, 'realm-that-does-not-exist');
      expect(a).toBe(b);
    });

    it('realm = sea + tier=신참 + seed 20 → tier prefix + first sea variant (cycle 253 pool 확장 후)', () => {
      expect(pickClaimNarration(20, '신참', 'sea')).toBe('용사여, 바다의 너울이 그대의 이름을 적신다');
    });
  });

  /** Cycle 169 — TONED sub-pool (cycle 161 분할 3/n). data-only invariant 검증. */
  describe('Cycle 169 — CLAIM_NARRATION_BY_REALM_TONED metadata', () => {
    it('5 realm 모두 정의 + 각 realm 의 variant 가 BY_REALM 의 text 와 1:1', () => {
      const realms = ['sea', 'volcano', 'underworld', 'heaven', 'chaos'] as const;
      for (const realm of realms) {
        const plain = CLAIM_NARRATION_BY_REALM[realm];
        const toned = CLAIM_NARRATION_BY_REALM_TONED[realm];
        expect(plain).toBeDefined();
        expect(toned).toBeDefined();
        expect(toned!.length).toBe(plain!.length);
        // text 1:1 매칭
        for (let i = 0; i < plain!.length; i++) {
          expect(toned![i].text).toBe(plain![i]);
        }
      }
    });

    it('각 realm 의 tone 이 narrativeWeightMul 카탈로그 매핑과 정합', () => {
      // heaven-narrative-ode (cycle 137) → heaven 의 모든 variant tone = 'ode'.
      // chaos-narrative-elegy 는 없으나 chaos 는 'hymn' (혼돈의 송가) 매핑.
      for (const v of CLAIM_NARRATION_BY_REALM_TONED['heaven']!) {
        expect(v.tone).toBe('ode');
      }
      for (const v of CLAIM_NARRATION_BY_REALM_TONED['sea']!) {
        expect(v.tone).toBe('elegy');
      }
      for (const v of CLAIM_NARRATION_BY_REALM_TONED['chaos']!) {
        expect(v.tone).toBe('hymn');
      }
    });
  });

  /** Cycle 181 — pickClaimNarrationWeighted (cycle 169 toned data 활용). */
  describe('Cycle 181 — pickClaimNarrationWeighted', () => {
    it('realm 미매칭 → 기존 pickClaimNarration fallback', () => {
      expect(pickClaimNarrationWeighted(0, undefined, null)).toBe(pickClaimNarration(0));
      expect(pickClaimNarrationWeighted(3, undefined, 'realm-unknown')).toBe(pickClaimNarration(3, undefined, 'realm-unknown'));
    });

    it('weights 미지정 → 기존 pickClaimNarration 동등', () => {
      expect(pickClaimNarrationWeighted(0, undefined, 'sea')).toBe(pickClaimNarration(0, undefined, 'sea'));
    });

    it('sea + tone elegy ×2 weight → sea variants 중 elegy 가 등장', () => {
      // sea 의 2 variant 모두 elegy. weight elegy: 2 → total = 4, seed 1 → 첫 variant.
      const out = pickClaimNarrationWeighted(1, undefined, 'sea', { elegy: 2 });
      expect(out).toBe(CLAIM_NARRATION_BY_REALM_TONED['sea']![0].text);
    });

    it('heaven + ode ×1.5 weight + tier 신참 → tier prefix + heaven variant', () => {
      const out = pickClaimNarrationWeighted(0, '신참', 'heaven', { ode: 1.5 });
      expect(out.startsWith('용사여, ')).toBe(true);
      // heaven 의 variant 가 base 텍스트.
      const tonedSubset = CLAIM_NARRATION_BY_REALM_TONED['heaven']!.map((v) => v.text);
      const base = out.replace('용사여, ', '');
      expect(tonedSubset).toContain(base);
    });
  });
});
