# Cycle 70 — System: Enhanced Save Indicator

## 변경 요약
SaveIndicator 를 "💾 Saved" 텍스트 + fadeInOut CSS 애니메이션으로 개선.
기존 이모지 only → 텍스트 추가 + 1.2초 표시 + 부드러운 opacity 전환.

## 파일
- `src/components/SaveIndicator.tsx` — "Saved" 텍스트 + flex + animation
- `src/styles/game.css` — @keyframes fadeInOut
- `src/components/SaveIndicator.test.tsx` — 2 tests (show/hide timing)

## 검증
- Vitest: 1720 passed
