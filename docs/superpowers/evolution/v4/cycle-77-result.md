# Cycle 77 — Sound: Low HP Heartbeat

## 변경 요약
플레이어 HP < 25% 시 800ms 간격 저음 heartbeat 리듬 재생.
회복/사망/25% 이상 복구 시 자동 중단.

## 파일
- `src/battle/BattleScene.ts` — heartbeatActive/Timer fields + trigger logic
- `src/systems/heartbeat.test.ts` — 4 tests

## 검증
- Vitest: 1738 passed
- Typecheck: clean
