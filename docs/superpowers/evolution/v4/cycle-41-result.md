# Cycle 41 Result

- **Category**: Sound (+ Visual polish)
- **Title**: 회피 사이드스텝 애니메이션
- **Commit**: d1f768b

## 변경 사항

- `src/battle/BattleScene.ts` — dodge 시 heroSprite 20px 좌측 이동 + yoyo 복귀 (80ms)
  - 기존 dodge SFX와 동시 발동
  - Quad.easeOut으로 자연스러운 움직임

## 검증

- Typecheck: clean
