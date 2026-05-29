# Cycle 56 Result

- **Category**: Visual
- **Title**: 적 사망 페이드아웃 애니메이션
- **Commit**: 1a26356

## 변경 사항

- `src/battle/BattleScene.ts`:
  - 적 HP≤0 시 sprite shrink+fade (250ms, Power2)
  - 기존 death particles 와 병행 재생

## 검증

- Typecheck: clean
