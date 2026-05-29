# Cycle 75 — System: Battle Elapsed Timer

## 변경 요약
전투 HUD 우상단에 실시간 경과 시간 (⏱ Ns) 표시.
1초 간격 갱신, 작은 회색 텍스트로 방해 최소화.

## 파일
- `src/battle/BattleScene.ts` — battleStartTime + timerText + 1s interval
- `src/battle/battleTimer.test.ts` — 1 test

## 검증
- Vitest: 1730 passed

## 비고
Era 3 최종 사이클. era-3-summary.md 작성 완료.
