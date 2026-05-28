# Cycle 34 Result

- **Category**: Visual
- **Title**: 크리티컬 히트 카메라 쉐이크
- **Commit**: cd0a3dd

## 변경 사항

- `src/battle/BattleScene.ts` — crit 판정 시 `cameras.main.shake(150, 0.01)` 추가
  - 150ms 지속, intensity 0.01 (미세하지만 체감 가능)
  - 기존 crit SFX와 동시 발동

## 검증

- Typecheck: clean

## 관찰

- 이펙트 영역은 이미 3/3 (hit flash + HP tween + death particles)
- shake는 bonus polish로 이펙트 점수에 반영하지 않음
- 2배속 전투에서도 shake duration 고정 150ms로 적절
