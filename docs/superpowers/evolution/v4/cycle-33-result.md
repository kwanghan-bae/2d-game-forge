# Cycle 33 Result

- **Category**: System
- **Title**: 전투 속도 토글 (1×/2×)
- **Commit**: 71d0132

## 변경 사항

- `src/types.ts` — `MetaState.battleSpeed: 1 | 2` 추가
- `src/store/gameStore.ts` — 기본값 1, `toggleBattleSpeed()` action
- `src/battle/BattleScene.ts` — combatTimer delay를 `600 / battleSpeed`로 계산

## 검증

- Typecheck: clean
- Vitest: 1659 passed
- 2× 시 delay 300ms → 체감 2배 속도 전투

## 관찰

- UI 버튼은 아직 미연결 (향후 cycle에서 전투 HUD에 속도 버튼 추가 예정)
- persist version 미변경 — `?? 1` fallback으로 하위 호환
