// Cycle 134/142/147 — claim 시 표시될 신의 어조 한 줄 variant 풀.
// 사용처: SeasonPassScreen 의 handleClaim 성공 path. feedback 영역에 표시.
// V3 정체성: 후원자 (player) 가 hero 의 노고를 인정하는 짧은 비트.
//
// Cycle 148 — story-writer #2 권고: ClaimerTier 별 후원자 호칭 prefix.
//   같은 base narration 에 tier-specific prefix 가 붙어 12 base × 5 tier =
//   60 variation. 전설 player 와 신참이 다른 어조를 듣는다.

import type { ClaimerTier } from './claimerTier';

export const CLAIM_NARRATION_VARIANTS: readonly string[] = [
  // closure 톤 (cycle 134/142 정착) — 12 줄 의 8 줄 유지.
  // Cycle 156 — story-writer #2 권고: variant 0 의 자체 vocative '용사여, ' 제거.
  //   TIER_VOCATIVE_PREFIX 합성 시 이중 호칭 ('용사여, 용사여, ...') 봉인.
  '그대의 노고를 치하한다',
  '한 페이지가 더 채워졌다',
  '운명의 저울이 그대 편으로 기울었다',
  '경배하라, 새 별이 떴다',
  '신은 침묵 속에 미소 짓는다',
  '시간의 강물이 그대를 기억한다',
  '하늘이 그대의 발자국을 인장한다',
  '잠든 영웅의 이름을 신이 부른다',
  // Cycle 147 — story-writer #2 권고: anticipation 톤 4 신규. closure 一邊倒
  //   의 motif 4-frame (별/책장/이름/하늘) 봉인 해소.
  '다음 무대의 막이 천천히 열린다',
  '새 길의 첫 돌이 깔린다',
  '오는 바람이 그대의 깃발을 흔들 채비를 한다',
  '아직 쓰지 않은 장이 그대를 기다린다',
] as const;

/** ClaimerTier 별 후원자 호칭 prefix. cycle 148 story-writer #2 권고.
 *  신참 = 거리감, 전설 = 친밀감. */
export const TIER_VOCATIVE_PREFIX: Readonly<Record<ClaimerTier, string>> = {
  '신참': '용사여',
  '노련': '오랜 길손이여',
  '숙련': '익숙한 손이여',
  '마스터': '장로여',
  '전설': '오랜 동반자여',
};

/**
 * Cycle 165 — realm-aware claim narration sub-pool (story-writer #3, cycle 145
 * 부터 11 cycle 표류 deadline). saga.finalRealm 이 있는 경우 *추가* variant 를
 * 후보에 합류 → realm 별 톤 token. 매칭 부재 realm 은 general pool 만.
 *
 * cycle 165 의 도입은 *data only* — pickClaimNarration 시그니처에 realm 옵션
 * 인자 추가. 실제 SeasonPassScreen.handleClaim 의 wire (saga.finalRealm 추출
 * + 전달) 은 cycle 173+ narrative slot 분할.
 */
export const CLAIM_NARRATION_BY_REALM: Readonly<Partial<Record<string, readonly string[]>>> = {
  sea: [
    '바다의 너울이 그대의 이름을 적신다',
    '해풍이 신의 인장을 묶어 둔다',
  ],
  volcano: [
    '용암의 숨결이 그대를 새긴다',
    '잿더미 위로 별이 떨어진다',
  ],
  underworld: [
    '망자들의 합창이 그대를 향한다',
    '저편의 등불이 처음 켜진다',
  ],
  heaven: [
    '구름이 그대 발 아래 굳는다',
    '하늘의 종이 한 번 울린다',
  ],
  chaos: [
    '경계 너머의 침묵이 그대를 안다',
    '없던 길이 그대의 발자국으로 생긴다',
  ],
};

/**
 * claim 시점의 narration 한 줄 선택. seed (Date.now() % length) 또는 명시.
 * test 에서는 seed 명시로 결정성 확보.
 *
 * tier 인자 (cycle 148) 가 주어지면 tier-specific prefix 가 base 앞에 붙음.
 * undefined 시 prefix 없는 base 만 반환 (legacy 호출 호환).
 *
 * Cycle 165 — realm 인자 추가. realm 이 `CLAIM_NARRATION_BY_REALM` 의 key 와
 * 매칭하면 해당 realm 의 sub-pool 이 *추가 후보로 합류* (general + realm
 * union). seed 가 union 길이로 modulo. realm undefined 또는 매칭 부재 시
 * legacy general pool 만 사용 — backward compat 100%.
 */
export function pickClaimNarration(
  seed?: number,
  tier?: ClaimerTier,
  realm?: string | null,
): string {
  const realmPool = realm && CLAIM_NARRATION_BY_REALM[realm] ? CLAIM_NARRATION_BY_REALM[realm]! : null;
  const pool: readonly string[] = realmPool
    ? [...CLAIM_NARRATION_VARIANTS, ...realmPool]
    : CLAIM_NARRATION_VARIANTS;
  const s = typeof seed === 'number' ? seed : Date.now();
  const idx = ((s % pool.length) + pool.length) % pool.length;
  const base = pool[idx];
  if (tier === undefined) return base;
  return `${TIER_VOCATIVE_PREFIX[tier]}, ${base}`;
}
