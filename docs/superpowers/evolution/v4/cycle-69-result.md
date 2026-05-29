# Cycle 69 — Visual: Boss Golden Tint

## 변경 요약
보스 스프라이트에 골든 틴트(0xffd700) 적용으로 시각적 위계 강화.
히트 플래시 후 틴트 자동 복원.

## 파일
- `src/battle/BattleScene.ts` — boss setTint(0xffd700) + clearTint 후 복원
- `src/battle/bossTint.test.ts` — 2 tests

## 검증
- Vitest: 1718 passed
- 시각 확인: 보스 전투 시 금색 외곽 확인
