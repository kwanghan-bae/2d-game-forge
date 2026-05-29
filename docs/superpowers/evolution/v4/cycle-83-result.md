# Cycle 83 — Sound: UI Click Pitch Variety

## 변경 요약
UI 클릭 사운드에 미세 피치 변화(0.95–1.05 랜덤) 추가 + 컨텍스트별 UI SFX 헬퍼.
- 기존 단일 'click' SFX → 매 클릭마다 미세 피치 랜덤
- `playUiSfx()` 헬퍼: navigate/purchase/equip/error/confirm 이벤트별 차별화

## 파일
- `src/App.tsx` — global click handler에 pitch randomization
- `src/systems/uiSfx.ts` — 컨텍스트별 UI SFX 매핑 헬퍼
- `src/systems/uiSfx.test.ts` — 3 tests

## 검증
- Vitest: 1759 passed
