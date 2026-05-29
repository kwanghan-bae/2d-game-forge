# Cycle 72 — Sound: Dynamic Crit Hit SFX

## 변경 요약
치명타 SFX 에 데미지 비율 기반 동적 피치 적용 (높은 데미지 = 낮은 음높이).
보스 상대 치명타 시 'hit' 0.6x 오버레이 추가. 흔들림 강도도 데미지 비례.

## 파일
- `src/battle/BattleScene.ts` — crit SFX 동적 rate + boss overlay + shake 스케일링
- `src/systems/critSfx.test.ts` — 2 tests (pitch scaling, shake calc)

## 검증
- Vitest: 1725 passed
