# Cycle 79 — Visual: Floating XP/Gold Reward Numbers

## 변경 요약
전투 승리 시 "+1,500 G" (금색) / "+2,400 XP" (파란색) 플로팅 텍스트 표시.
800ms 동안 위로 떠오르며 페이드아웃.

## 파일
- `src/battle/BattleScene.ts` — showFloatingReward() + 호출 2곳
- `src/battle/floatingReward.test.ts` — 2 tests

## 검증
- Vitest: 1747 passed
- Visual maturity: 19 → 20/30 (이펙트 category 기여)
