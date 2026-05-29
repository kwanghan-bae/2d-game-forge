# Cycle 87 — Visual: Enemy Death Particle Burst

## 변경 요약
적 사망 시 원형 파티클 폭발 효과.
- 일반 적: 8개 빨간 파티클
- 보스: 20개 황금 파티클 + 넓은 범위
- 파티클이 원형으로 퍼지며 fade + scale to 0

## 파일
- `src/battle/BattleScene.ts` — death particle loop
- `src/battle/deathParticle.test.ts` — 2 tests

## 검증
- Vitest: 1773 passed
- Visual maturity: 21 → 22/30
