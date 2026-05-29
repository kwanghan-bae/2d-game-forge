# Cycle 44 Result

- **Category**: System
- **Title**: 전투 결과 통계 요약
- **Commit**: bf1a3c7

## 변경 사항

- `src/battle/BattleScene.ts`:
  - roundCount, totalDamageDealt, skillUseCount 카운터 추가
  - `showBattleStats()` — 컴팩트 통계 라인 (⚔1.2M | ⟳45 | 💀12 | ✦8)
  - Floor 완료 시 logText에 표시

## 검증

- Typecheck: clean
