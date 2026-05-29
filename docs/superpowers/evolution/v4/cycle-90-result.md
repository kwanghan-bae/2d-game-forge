# Cycle 90 — Visual: Realm Ambient Particles

## 변경 요약
전투 배경에 렐름 테마 색상의 부유 파티클 6개.
- 렐름 accent 컬러, 0.3 투명도로 은은하게
- 위로 떠오르며 페이드, 반복 재생

## 파일
- `src/battle/BattleScene.ts` — ambient particle loop in create()
- `src/battle/ambientParticle.test.ts` — 2 tests

## 검증
- Vitest: 1781 passed
- Visual maturity: 22 → 23/30
