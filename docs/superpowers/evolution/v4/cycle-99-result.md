# Cycle 99 — Sound: Final Boss Victory Fanfare

## 변경 요약
파이널 보스 처치 시 5음 상승 팡파레.
- milestone SFX를 0.8→1.0→1.2→1.5→1.8 피치로 120ms 간격
- 비파이널 보스는 기존 단일 boss-victory SFX 유지

## 파일
- `src/battle/BattleScene.ts` — conditional fanfare on final boss
- `src/battle/victoryFanfare.test.ts` — 3 tests

## 검증
- Vitest: 1807 passed
