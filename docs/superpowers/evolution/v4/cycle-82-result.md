# Cycle 82 — Visual: Level-Up Flash Effect

## 변경 요약
레벨업 시 카메라 플래시 + 히어로 스프라이트 glow 추가.
- 10레벨 단위 마일스톤: 골드 플래시 (400ms)
- 일반 레벨업: 화이트 플래시 (200ms)
- 히어로 warm yellow tint 300ms

## 파일
- `src/battle/BattleScene.ts` — flash + hero tint on level-up
- `src/battle/levelUpVfx.test.ts` — 3 tests

## 검증
- Vitest: 1756 passed
- Visual maturity: 20 → 21/30
