# Cycle 72 — Chained Sim Coverage Summary

## 한 줄
Cycle 16 의 chained sim driver (runSimV2Chained) 가 V3 progression 누적 검증 도구 = sim infra 의 second-order capability.

## Coverage
- store mutations: sponsorGold spend, unlockedRealms, sagaHistory.append
- realm rotation: pickStartingRealm(unlockedRealms, sagaHistory.length)
- batch / chained mode toggle
- vitest worker pollution 방지

## Measurement examples
- Cycle 16: 50 cycle / atk+hp bonus 1076 / 6 realm organic
- Cycle 17: 1200-arrival ratio 1.01 (Case 1)

## CLI
- `pnpm sim:v3 --chained --seed 100 --count 50 --max-arrivals 1200`
