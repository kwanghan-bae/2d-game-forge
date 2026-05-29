# Cycle 74 — Visual: Enemy Spawn Animation Variety

## 변경 요약
적 등장 애니메이션 3종 분기 (bounce / slide-from-right / fade-float-up).
보스는 별도: 180° spin + scale 드라마틱 등장.

## 파일
- `src/battle/BattleScene.ts` — spawn animation 3-way branch + boss spin
- `src/battle/spawnAnimation.test.ts` — 2 tests

## 검증
- Vitest: 1729 passed
- Visual maturity: 18 → 19/30 (전환 category 기여)
