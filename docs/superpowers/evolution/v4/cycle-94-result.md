# Cycle 94 — Sound: Floor Clear Ascending Chime

## 변경 요약
던전 플로어 클리어 시 상승 3음 차임.
- click SFX를 1.0 → 1.3 → 1.6 피치로 80ms 간격 재생
- 진행감과 성취감 청각 피드백

## 파일
- `src/battle/BattleScene.ts` — 3-note chime on floor clear
- `src/battle/floorChime.test.ts` — 2 tests

## 검증
- Vitest: 1790 passed
