# Cycle 98 — Visual: Hero Idle Breathing Animation

## 변경 요약
히어로 스프라이트에 미세 호흡 애니메이션 (scaleY 4→4.1, 1200ms Sine loop).
- 2.5% 스케일 변화로 자연스러운 생동감
- 전투 중 항상 재생 (무한 반복)

## 파일
- `src/battle/BattleScene.ts` — breathing tween on heroSprite
- `src/battle/heroBreathing.test.ts` — 2 tests

## 검증
- Vitest: 1804 passed
- Visual maturity: 24 → 25/30
