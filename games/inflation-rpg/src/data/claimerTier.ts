// Cycle 143 — claim 누적 카운트 기반 후원자 등급. pure helper.
// cycle 139 의 `meta.totalClaimsCount` 와 1:1 매핑. UI 사용처 (cycle 144+)
// 에서 MainMenu 또는 SeasonPass header 에 등급 chip 노출.

export type ClaimerTier = '신참' | '노련' | '숙련' | '마스터' | '전설';

/** count 기반 tier mapping. 경계는 0·5·20·80·300 (cycle 146 재조정).
 *  level-designer 의 claimerTier 전설 sentinel 발견 — 기존 1000 은 평생 도달
 *  불가능 (5 starter × 일주일 cohort). 새 곡선은 신참 0-4 / 노련 5-19 /
 *  숙련 20-79 / 마스터 80-299 / 전설 300+. */
export function getClaimerTier(count: number): ClaimerTier {
  if (count >= 300) return '전설';
  if (count >= 80) return '마스터';
  if (count >= 20) return '숙련';
  if (count >= 5) return '노련';
  return '신참';
}

/** 다음 tier 까지 남은 claim 횟수. 최고 tier 의 경우 0. */
export function nextTierThreshold(count: number): { nextTier: ClaimerTier | null; remaining: number } {
  if (count >= 300) return { nextTier: null, remaining: 0 };
  if (count >= 80) return { nextTier: '전설', remaining: 300 - count };
  if (count >= 20) return { nextTier: '마스터', remaining: 80 - count };
  if (count >= 5) return { nextTier: '숙련', remaining: 20 - count };
  return { nextTier: '노련', remaining: 5 - count };
}
