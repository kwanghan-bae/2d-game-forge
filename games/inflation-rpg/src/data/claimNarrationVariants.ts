// Cycle 134 — claim 시 표시될 신의 어조 한 줄 variant 풀.
// 사용처: SeasonPassScreen 의 handleClaim 성공 path. feedback 영역에 표시.
// V3 정체성: 후원자 (player) 가 hero 의 노고를 인정하는 짧은 비트.

export const CLAIM_NARRATION_VARIANTS: readonly string[] = [
  '용사여, 그대의 노고를 치하한다',
  '한 페이지가 더 채워졌다',
  '운명의 저울이 그대 편으로 기울었다',
  '경배하라, 새 별이 떴다',
  '신은 침묵 속에 미소 짓는다',
  '시간의 강물이 그대를 기억한다',
  '하늘이 그대의 발자국을 인장한다',
  // Cycle 142 — variance pool 7 → 12 확장. realm/personality 가중은 cycle 145+ 페르소나 surface 에서 결정.
  '먼지 한 줌이 다시 별이 되었다',
  '잠든 영웅의 이름을 신이 부른다',
  '운명의 책장이 또 한 장 넘어간다',
  '여명은 그대의 노래를 들었다',
  '돌 위에 새겨진 이름이 빛난다',
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
