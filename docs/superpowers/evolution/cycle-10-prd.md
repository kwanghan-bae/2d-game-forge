# Cycle 10 PRD — Lifecycle Activation (ageEnd=37 cap 해소)

## 한 줄

Cycle 10 정찰 (`a05f9332a644e53af`) finding — `MAX_ARRIVALS=500` + `floor(5 + 65×actions/1000)` = age 37 hard cap → V3-B lifecycle drama 후반 60% (노년기/자연사/회춘) dead. 150/150 cycle 모두 ageEnd=37 deterministic. cycle 3 D3 carry-over 의 measurable 첫 확정.

## Root cause (확정)

- `games/inflation-rpg/src/hero/HeroLifecycle.ts:26-29` 의 `ageFromActions(actions, agingMul=1.0)` = `floor(5 + 65 × actions/1000)`
- `MAX_ARRIVALS = 500` → 1 arrival = 1 action → age = floor(5 + 65×500/1000) = **floor(37.5) = 37**
- 150 cycle 모두 max_arrivals 종료 + ageEnd 37 deterministic
- 노년기 (50-69) 진입 0, 마지막 (70+) 진입 0, 자연사 0, rejuv trigger 0

## 변경

**Single 1-line**: `MAX_ARRIVALS 500 → 1000` (혹은 그 외 적절 위치)

확정 grep:
```bash
grep -rnE "MAX_ARRIVALS" games/inflation-rpg/src
grep -rnE "maxArrivals" games/inflation-rpg/scripts
```

산술 검증: `floor(5 + 65 × 1000/1000) = 70`. age 70 도달 가능 → 자연사 (≥70) 활성, 노년기 chapter 활성, age 임계 회춘 활성.

## 수용 기준 (Δ-from-baseline + multi-seed)

Cycle 10 정찰 baseline = MAX_ARRIVALS 500, 150 cycle (seed 1024+2048+4096):
- maxLevel p50: 824,133
- ageEnd: 37 deterministic (min/p50/max)
- 자연사 rate: 0.7% (1/150)
- 노년기 chapter 진입: 0/150
- rejuv: 0/150
- endCause `max_arrivals` 149/150

Cycle 10 fix 후 (150 cycle multi-seed):
- **maxLevel p50 회귀 ≤ 5%** (≥ 783k)
- **ageEnd p50 ≥ 60** (37 → 60+ 이동, age 70 도달 distribution 확인)
- **마지막 chapter (70+) 진입 ≥ 30%** (45/150 이상)
- **rejuv count ≥ 1 인 cycle ≥ 30/150** (20% 이상)
- **endCause `자연사` 또는 `노화` ≥ 30%** (45/150 이상, max_arrivals 비율 감소 의미)

## 머지 가드

- typecheck/lint PASS
- vitest 1183 baseline + 신규 (multi-seed sim guard 1+ 추가, 단 sim 은 별도 script 라 unit test 추가 안 해도 OK — Sim aggregate evidence 가 primary)
- circular baseline 1
- Multi-seed sim 150 cycle (Δ-from-baseline 수용 기준 측정)
- Playwright (선택): dev server 8-10분 idle 시 age > 50 + rejuv ≥ 1 확인

## 반대 기준 (NOT this)

- P1 (boss-pick weight) — cycle 11 으로 분리. cycle 10 의 lifecycle cascade 효과 격리 측정 위함
- D1 (priest saturator) — cycle 11+
- 회춘 trigger logic 변경 — `MAX_ARRIVALS 1000` 만으로 age 70 도달 → 기존 회춘 (age threshold-based) 활성 가능 — 변경 0 가설

## Phase G self-check 예상

- 약점 고갈: ✗ (P1 + D1-D7 + cycle 6+ carry-over)
- 3 연속 같은 1순위: ... → cycle 9 path → **cycle 10 lifecycle**. 다른 카테고리
- 자원 추정: 9 cycle 누적 자원 ~90% — cycle 10 의 변경 1-line + sim 재실행만이라 작음. partial 가능성 작음

## Cycle 11+ carry-over

- P1 boss-pick weight (cycle 10 정찰 P1)
- D1-D7 backlog
- HeroSnapshot staggered field
- prod 빌드 추가 정찰
- PRD fixture schema (cycle 7)
- Sim onBossKill realm_unlocked dedup (cycle 10 정찰 발견)
- C2 pathfinderFallbackCount saga 기록 (cycle 7+8 — fallback=0 이라 informational)
- 페르소나 doc patch — measurable baseline 사전 측정 룰 (cycle 8 carry-over)
