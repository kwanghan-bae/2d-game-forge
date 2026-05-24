# Cycle 66 — cycleSlice.helpers Summary (cycle 18 follow-up)

## 한 줄
Cycle 18 의 `cycleSlice.helpers.ts` pure helper extract = sim-real parity refactor. 미래 endCycle 변경의 false PASS 재발 방지.

## Pure helper
`endCycleAction(state, cause)` returns partial run state:
- currentRealmId = 'base' (cycle 5 F1)
- npcs = [] (cycle 5 F1)
- sagaHistory.push (cycle 6 P1 flat alias)
- endCause (cycle 5 F3 '무위' / cycle 14 '자연사')

## Callers
- `cycleSliceV2.endCycle`: setState wrapper
- `sim-cycle-v2.ts::endCycle`: 직접 helper 호출

## Validation
- 6 신규 unit test (cycle 18)
- vitest 1233 baseline 회귀 0
