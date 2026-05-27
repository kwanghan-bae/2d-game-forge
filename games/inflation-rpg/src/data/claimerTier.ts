// Cycle 143 — claim 누적 카운트 기반 후원자 등급. pure helper.
// cycle 139 의 `meta.totalClaimsCount` 와 1:1 매핑. UI 사용처 (cycle 144+)
// 에서 MainMenu 또는 SeasonPass header 에 등급 chip 노출.

export type ClaimerTier = '신참' | '노련' | '숙련' | '마스터' | '전설';

/** count 기반 tier mapping. 경계는 1·10·50·200·1000. */
export function getClaimerTier(count: number): ClaimerTier {
  if (count >= 1000) return '전설';
  if (count >= 200) return '마스터';
  if (count >= 50) return '숙련';
  if (count >= 10) return '노련';
  return '신참';
}

/** 다음 tier 까지 남은 claim 횟수. 최고 tier 의 경우 0. */
export function nextTierThreshold(count: number): { nextTier: ClaimerTier | null; remaining: number } {
  if (count >= 1000) return { nextTier: null, remaining: 0 };
  if (count >= 200) return { nextTier: '전설', remaining: 1000 - count };
  if (count >= 50) return { nextTier: '마스터', remaining: 200 - count };
  if (count >= 10) return { nextTier: '숙련', remaining: 50 - count };
  return { nextTier: '노련', remaining: 10 - count };
}
