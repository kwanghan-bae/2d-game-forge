# Cycle 63 — Pathfinder Fallback Validation (cycle 7+8+9 follow-up)

## 한 줄
Cycle 7 F4 의 `findPathWithFallback` + cycle 8 의 candidate filter + cycle 9 의 columnBounds expand + setCurrentRealm wire 가 3-fold 로 stale realm bug 완전 해소.

## Layers
1. **F4 (cycle 7)**: columnBounds path null 시 retry without bounds + console.warn telemetry
2. **C1 (cycle 8)**: filterCandidatesByRealm 가 cross-realm enemy 사전 거부
3. **C1 follow-up (cycle 8)**: setCurrentRealm wire — V3-H Bug A 패턴 mirror
4. **R1 (cycle 9)**: pickNextDestination 의 columnBounds 가 hero + target col 모두 포함
5. **R2 (cycle 9)**: cross-realm exit candidate 거부 (2+ realm jump)

## Δ-from-baseline measurement
- Cycle 7 baseline: 89 회/cycle fallback (4분 idle)
- Cycle 8 partial: 11 회/cycle (-87.6%, PRD ≤9 미달)
- Cycle 9 full: 0 회/cycle (Playwright 6분 idle, 100% 감소)

## Conclusion
PRD 후보 외 채택 (Mode 실증 재해석) 패턴의 첫 성공.
