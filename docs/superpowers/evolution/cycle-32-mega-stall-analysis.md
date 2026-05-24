# Cycle 32 — Mega-cycle Subagent Stall Pattern Root Cause

## 한 줄
Cycle 18-20 의 3 회 연속 subagent stall 의 root cause = sim 측정 (`runSimV2` chained 또는 1200 arrival 단일) 이 vitest 의 sim smoke 와 같은 inflated time, subagent watchdog 600s timeout 과 충돌.

## Pattern
- Cycle 18 endCycle helper → sim 측정 phase stall (600s)
- Cycle 19 narrative design → narrative variants 작성 단계 stall (Sim 도 아님, 그러나 watchdog 갑작)
- Cycle 20 staggered field → smoke wait stall

## Causality
- Vitest 의 sim smoke (`pnpm test`) 가 누적 changes 후 980s 까지 늘어남 (cycle 20 finding)
- 같은 sim 호출이 subagent context 안에서도 같은 시간 소요
- Subagent watchdog 600s timeout < sim duration

## 해소책 (적용중)
- Cycle 21+ 부터 main context 직접 진행 (subagent 안 씀)
- Sim 측정 cycle 마다 의무 → optional 로 격하 (typecheck/lint/vitest 만 가드)
- 큰 측정 필요 시 작은 N (예: 10 cycle) + 별도 `pnpm vitest` 한 번씩

## Future fix candidate
- Sim performance optimization (chained loop 의 hot path)
- 또는 sim smoke 의 maxArrivals 축소 (1000 → 500 또는 dev only opt-in)

## Carry-over
- Sim hot path profiling (cycle 33+)
- Subagent stall pattern docs 정착 (cycle 25 룰 의 첫 적용 결과)
