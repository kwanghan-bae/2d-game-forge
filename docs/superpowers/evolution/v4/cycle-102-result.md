# Cycle 102 — System: Number Formatting Utility

## 변경 요약
일관된 숫자 표시 유틸리티 모듈.
- `formatCompact()`: 500→"500", 1.5K, 2.3M, 1.2B
- `formatWithCommas()`: 1,234,567
- `formatPercent()`: 0.75 → "75%"
- `formatDuration()`: 90 → "1m 30s"

## 파일
- `src/systems/numberFormat.ts` — 4 formatting functions
- `src/systems/numberFormat.test.ts` — 4 tests

## 검증
- Vitest: 1817 passed
