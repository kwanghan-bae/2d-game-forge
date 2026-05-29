# Cycle 85 — System: Battle Session Records

## 변경 요약
전투 세션 개인 기록 트래커 추가.
- maxDps, maxKillStreak, fastestKillMs, totalKills, totalDamage 추적
- BattleScene.showBattleStats() 에서 자동 기록 갱신
- 메모리 기반 (앱 리로드 시 리셋, 향후 persist 확장 가능)

## 파일
- `src/systems/battleRecords.ts` — record tracker module
- `src/systems/battleRecords.test.ts` — 4 tests
- `src/battle/BattleScene.ts` — import + updateRecord call

## 검증
- Vitest: 1768 passed
