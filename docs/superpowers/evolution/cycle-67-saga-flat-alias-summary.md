# Cycle 67 — Saga Flat Alias Summary (cycle 6 follow-up)

## 한 줄
Cycle 6 P1 의 SagaTypes flat alias 5종 (finalLevel/finalAge/finalRealm/deathCause/finishedAt) 이 cycle 7 의 v24 migration + cycle 18 의 helper extract 와 함께 stable.

## Flat field
- finalLevel: cleared 전 hero.level snapshot
- finalAge: cleared 전 hero.age
- finalRealm: cycle 5 F1 reset 직전 currentRealmId 또는 'base'
- deathCause: '자연사' / '전사' / '무위' / 기타
- finishedAt: Date.now()

## v24 migration close-up
- cycle 7 S1: stale 5세 saga retroactive purge
- finalLevel 1, finalAge ≤ 5, deathCause '자연사', eventCount 0 의 4-AND condition

## Forward compat
- 향후 SagaSnapshot 변경 시 flat alias 우선 유지
