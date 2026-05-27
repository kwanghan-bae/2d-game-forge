// Cycle 134 — claim 시 표시될 신의 어조 한 줄 variant 풀.
// 사용처: SeasonPassScreen 의 handleClaim 성공 path. feedback 영역에 표시.
// V3 정체성: 후원자 (player) 가 hero 의 노고를 인정하는 짧은 비트.

export const CLAIM_NARRATION_VARIANTS: readonly string[] = [
  // closure 톤 (cycle 134/142 정착) — 12 줄 의 8 줄 유지.
  '용사여, 그대의 노고를 치하한다',
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

/**
 * claim 시점의 narration 한 줄 선택. seed (Date.now() % length) 또는 명시.
 * test 에서는 seed 명시로 결정성 확보.
 */
export function pickClaimNarration(seed?: number): string {
  const s = typeof seed === 'number' ? seed : Date.now();
  const idx = ((s % CLAIM_NARRATION_VARIANTS.length) + CLAIM_NARRATION_VARIANTS.length) % CLAIM_NARRATION_VARIANTS.length;
  return CLAIM_NARRATION_VARIANTS[idx];
}
