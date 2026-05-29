# Cycle 43 Result

- **Category**: Visual
- **Title**: 몬스터 등장 바운스 애니메이션
- **Commit**: a8f0a68

## 변경 사항

- `src/battle/BattleScene.ts` — enemySprite setScale(0) → Back.easeOut 300ms로 원래 크기 도달
  - 보스: 0→5, 일반: 0→4
  - 매 새 적 등장 시 팝인 효과

## 검증

- Typecheck: clean
- Visual maturity: 몬스터 1→2 (sprite + spawn animation)
