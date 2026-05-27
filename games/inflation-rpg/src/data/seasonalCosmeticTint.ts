// Cycle 167 — cosmeticTint token → Phaser color hex 매핑.
// cycle 155+159 의 SeasonalModifier wire 분할의 4/n. cycle 155 의 pure helper
// + cycle 159 의 selector 진입점 이후, *token → 시각 색* 의 분리 keep.
//
// 분리 이유: SeasonalModifier catalog 의 cosmeticTint key (예: 'aqua-deep',
// 'spring-pastel') 는 디자인 token. 실제 색은 화면 매체 (Phaser bg color 0xRGB
// vs CSS hex '#rgb') 에 따라 다르게 매핑 — *renderer-specific* 변환 책임을
// 본 모듈에 집결.
//
// 실제 OverworldScene wire (realm 진입 시 setBackgroundColor 호출) 은 cycle
// 175+ system slot 분할.

/** 알려진 cosmetic tint token. catalog 의 cosmeticTint 값과 정합. */
export type CosmeticTintToken =
  | 'spring-pastel'   // 봄꽃 차원 — 연분홍/연두 (plains/field 적용)
  | 'aqua-deep'       // 해류 차원 — 깊은 청록 (sea 적용)
  | 'ember-glow'      // 미래 확장 — 용암 차원
  | 'shadow-ink'      // 미래 확장 — 황천 차원
  | 'cloud-silver'    // 미래 확장 — 천상 차원
  | 'chaos-prism';    // 미래 확장 — 혼돈 차원

/**
 * token → Phaser background color (CSS hex string). Phaser 의
 * `cameras.main.setBackgroundColor(hexString)` 가 hex string 또는 0xRGB
 * number 둘 다 수용 — 본 함수는 hex string 으로 통일 (debug 시 가독성).
 *
 * unknown token → null (caller 가 fallback 책임).
 */
export function cosmeticTintToHex(token: string): string | null {
  switch (token) {
    case 'spring-pastel': return '#3a4a3a';   // 어두운 파스텔 그린 — pixel bg 와 조화
    case 'aqua-deep':     return '#0d3a4a';   // 깊은 청록
    case 'ember-glow':    return '#4a200d';   // 어두운 적
    case 'shadow-ink':    return '#1a0d2e';   // 어두운 보라
    case 'cloud-silver':  return '#3a4658';   // 차분한 청회색
    case 'chaos-prism':   return '#2a0d3a';   // 어두운 마젠타
    default: return null;
  }
}

/**
 * token → Phaser numeric color (0xRGB). 같은 매핑의 number 버전 — Phaser
 * 의 일부 API 가 number 만 받는 경우 사용. unknown → null.
 */
export function cosmeticTintToNumber(token: string): number | null {
  const hex = cosmeticTintToHex(token);
  if (hex === null) return null;
  // '#rgb' → 0xRGB
  return parseInt(hex.slice(1), 16);
}
