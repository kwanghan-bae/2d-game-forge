# Cycle 96 — System: Equipment Comparison Logic

## 변경 요약
장비 비교 유틸리티 — 현재 장착 vs 후보 장비의 스탯 차이 계산.
- `compareEquipment()`: delta + isUpgrade 판정
- `formatDiff()`: "+5 atk" 형식 표시
- 새 스탯, 사라진 스탯 모두 감지

## 파일
- `src/systems/equipCompare.ts` — comparison module
- `src/systems/equipCompare.test.ts` — 5 tests

## 검증
- Vitest: 1799 passed
