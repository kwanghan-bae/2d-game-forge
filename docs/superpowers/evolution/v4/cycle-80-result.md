# Cycle 80 — System: DPS Counter in Battle Stats

## 변경 요약
전투 종료 통계에 DPS(초당 데미지) 표시 추가.
elapsed time 기반 실시간 계산, K/M 약식 표기.

## 파일
- `src/battle/BattleScene.ts` — showBattleStats에 DPS 항목 추가
- `src/battle/dps.test.ts` — 3 tests

## 검증
- Vitest: 1750 passed
