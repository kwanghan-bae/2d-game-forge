# Cycle 49 — Sim Perf Baseline 측정 결과

## 한 줄
`pnpm vitest run scripts/__tests__/sim-cycle-v2.smoke.test.ts` 단독 실행 = **35.7s** (cycle 20 finding 의 975s 와 30x 차이).

## 측정
- Sim smoke 10 test PASS / Duration 35.7s
- Cycle 20 시점 측정 = 975s (1 fail timeout) — 매우 큰 변동
- Cycle 49 측정 baseline = 35.7s

## 가설
- Cycle 20 의 975s 는 staggered field 추가로 인한 단발성 spike?
- 또는 system load (다른 build process) 영향?
- 또는 watchdog accumulation noise?

## Phase B 우선순위 재평가
- Sim smoke 자체는 35s 로 정상 작동 — Subagent watchdog 600s timeout 안에 들어옴
- Phase B 의 perf optimization 우선순위 ↓ (cycle 81+ defer)
- 대신 narrative depth + 작은 polish 위주

## Carry-over
- Cycle 20 의 975s spike 의 root cause 는 미해소 (단발성 가능성 큼)
- 다른 작업 우선 진행
