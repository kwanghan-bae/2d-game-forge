# Cycle 2 Result — "Inflation 곡선 복원"

## 판정: PASS ✅

## 변경 요약

| 항목 | 내용 |
|------|------|
| 카테고리 | Balance |
| 커밋 | 5de0a08 |
| 코드 변경 | 1줄 (BattleScene.ts expGain 공식) |
| 테스트 | 1609 vitest ✅, typecheck ✅ |

## 핵심 변경

```typescript
// Before: expGain = Math.floor(run.level * 10)       → O(level^1.0)
// After:  expGain = Math.floor(10 * Math.pow(run.level, 2.0))  → O(level^2.0)
```

gain/req 비율: `0.1 × level^0.2` (단조 증가)
- 레벨 10: ~6킬/레벨업 (초반 유사)
- 레벨 1000: ~2.5킬
- 레벨 100000: ~1킬 (폭발 성장)

## carry-over 해소

- ✅ k_gain == k_req inflation 위배 → **해결** (k_gain > k_req로 전환)

## carry-over (잔여)

1. 패시브 스킬 7/16 동일 (age 1)
2. personality-blind 나레이션 (age 1)
