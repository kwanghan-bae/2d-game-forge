# Cycle 48 Result

- **Category**: Visual
- **Title**: 데미지 숫자 팝업
- **Commit**: 150bddd

## 변경 사항

- `src/battle/BattleScene.ts`:
  - `showFloatingDamage(amount, isCrit)` 메서드 추가
  - Crit: 18px bold red, 일반: 14px white
  - 40px 상승 + fade out 600ms
  - X 오프셋 랜덤 (±15px)

## 검증

- Typecheck: clean
- Visual maturity: 캐릭터 1→1, 몬스터 2→2 (기존 유지. 이펙트는 별도 카테고리)
