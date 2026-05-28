# Cycle 38 Result

- **Category**: System
- **Title**: 전투 HUD 플로어 진행률 표시
- **Commit**: 9c0c64c

## 변경 사항

- `src/battle/BattleScene.ts` — Kill 카운터 아래에 `F{currentFloor}` 텍스트 표시
  - 11px 회색 (#aaa), 우측 정렬 (336, 34)
  - 현재 던전 내 위치를 플레이어에게 명확히 전달

## 검증

- Typecheck: clean
