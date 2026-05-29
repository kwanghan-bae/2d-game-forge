# Cycle 93 — Visual: Crit Damage Scale Punch

## 변경 요약
크리티컬 데미지 텍스트에 scale punch VFX 추가.
- 1.5x 시작 → 1x로 Back.easeOut 축소 (임팩트감)
- 💥 이모지 접두사 + 빨간색 볼드 20px
- 더 오래 떠오르며 사라짐 (800ms vs 600ms)

## 파일
- `src/battle/BattleScene.ts` — showFloatingDamage enhanced
- `src/battle/critDamageVfx.test.ts` — 4 tests

## 검증
- Vitest: 1788 passed
- Visual maturity: 23 → 24/30
