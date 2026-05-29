# Cycle 100 — Visual: Boss Victory Confetti

## 변경 요약
보스 처치 시 축하 컨페티 파티클.
- 파이널 보스: 30개, 일반 보스: 12개
- 5색 회전하며 낙하 (gold, pink, green, blue, orange)
- 상단에서 화면 하단으로 자연 낙하 + 페이드

## 파일
- `src/battle/BattleScene.ts` — confetti loop in showBossVictoryText()
- `src/battle/confetti.test.ts` — 3 tests

## 검증
- Vitest: 1810 passed
- Visual maturity: 25 → 26/30
