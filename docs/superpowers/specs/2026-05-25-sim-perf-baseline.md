# Sim Performance Baseline Spec

## 한 줄
Cycle 32 의 finding (sim smoke 누적 slow-down) 의 root cause 분석을 위한 baseline 측정 spec.

## 측정 항목
- `pnpm vitest run scripts/__tests__/sim-cycle-v2.smoke.test.ts` 단독 실행 시간
- `pnpm vitest run` 전체 시간
- `pnpm sim:v3 --seed 1024 --count 1 --max-arrivals 1200` wall time
- `pnpm sim:v3 --chained --seed 100 --count 50 --max-arrivals 1200` wall time

## 비교 baseline
- Cycle 0 (V3-H 시드): 측정 불가 (history)
- Cycle 14 baseline (sim 30 cycle 자연사 100%): 측정 가능
- Cycle 17 baseline (chained 50 cycle): 측정 가능

## 가설
- `useGameStore.setState` 의 zustand listener 가 chained sim 의 hot path 에서 누적
- 또는 `events.push` 의 array reallocation 비용 (1200 arrivals × ~6000 events)
- 또는 RealmCatalog lookup 의 linear scan

## Phase B (cycle 61-80) 의 fix candidate
- `useGameStore.setState` 의 batched update
- events array 의 pre-allocation
- RealmCatalog 의 Map 으로 변환

## 측정 자체는 분리 작업 (cycle 61+).
