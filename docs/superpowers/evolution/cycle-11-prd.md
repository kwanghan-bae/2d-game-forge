# Cycle 11 PRD — 자연사 Emit + Auto-Rejuv (cycle 10+11 fold)

## 한 줄

Cycle 10 partial 의 FAIL 2 (자연사 emit path 부재 + auto-rejuv trigger 부재) 해소. V3 정체성 lifecycle drama **뒤 40%** 활성. cycle 10 partial 위에 쌓아 cycle 11 머지 시 cycle 10+11 fold.

## Root cause (cycle 10 implementer 완성)

1. **자연사 emit path 부재** — `OverworldEvents.ts:16` 의 `hero_died` cause union: `'전사' | '자연사'`. 그러나 `EncounterEngine.ts:61` 한 곳에서만 `'전사'` emit. age 70 도달 시 emit 안 되어 deterministic max_arrivals 종료.
2. **Auto-rejuv 부재** — `HeroEntity.rejuvenate(years)` API 있고 `rejuvenationCost(age)` 정의됨. 그러나 `light` resource 보유 시 age threshold (예: 65) 자동 trigger 부재. light spend modal 의 player 결정 경로만 (sim/idle 에 player input 없음).

## 두 fix

### C10-A — `hero_died('자연사')` emit

**파일**: `games/inflation-rpg/src/overworld/CycleControllerV2.ts` 의 `handleArrival` 또는 `HeroLifecycle.ts` 의 age advance hook

**구현**:
- Hero age 가 일정 임계 (예: 70) 도달 + 그 후 N actions 추가 시 `hero_died('자연사')` emit
- 또는 age cap = 70 시점 즉시 emit
- 우선 검토: 산술 `floor(5 + 65×1000/1000) = 70`. action 1000 도달 시 age cap. 즉 max_arrivals 도달과 자연사가 동시. → cycle 10 의 MAX_ARRIVALS 1000 변경이 정확히 age 70 도달 시점 = 종료 시점.
- 따라서 변경: `CycleControllerV2` 의 종료 분기에서 `actions >= 1000 + age >= 70` 일 때 `hero_died('자연사')` emit + endCycle('자연사')

**Unit test**:
- `endCycle` 호출 전 hero.age >= 70 시 `hero_died('자연사')` emit
- max_arrivals 도달 + age < 70 시 emit '전사' or 기본 (현재 동작 유지)
- 새 분기로 v22→v23/v24 migration 회귀 0

### C10-B — Auto-rejuv trigger

**파일**: `games/inflation-rpg/src/overworld/CycleControllerV2.ts` 또는 hero lifecycle hook

**구현**:
- Hero.age 가 임계 (예: 65) 도달 + light resource ≥ `rejuvenationCost(age)` 시 자동 `hero.rejuvenate(years)` 호출
- Sim/idle 자동 — player input 없이도 진행
- 1 cycle 내 최대 N 회 (예: 2) 제한 — 무한 회춘 방지
- light cost 차감 + saga emit `rejuvenated` (cycle 4 의 narrative wire 활용)

**Unit test**:
- age 65 + light cost 충분 → rejuvenate 호출 + age 감소
- age 65 + light 부족 → rejuvenate skip
- age 65 + cycle 내 이미 2회 회춘 → skip
- light resource 차감 정확

## 수용 기준 (Δ-from-baseline + multi-seed)

Baseline = cycle 10 partial (MAX_ARRIVALS 1000, emit path 부재): rejuv 0/150, 자연사 endCause 0/150.

Cycle 11 fix 후 (150 cycle multi-seed):
- **`hero_died('자연사')` emit 확인**: endCause `자연사` ≥ 30% (45/150 이상)
- **Auto-rejuv 확인**: rejuv count ≥ 1 인 cycle ≥ 30/150 (20% 이상)
- **maxLevel p50 회귀 ≤ 5%** (cycle 10 baseline 4.8M → 4.56M 이상)
- **ageEnd 분포**: rejuv 활성 cycle 은 ageEnd < 70 가능 (rejuv 가 age 되돌림)

## 머지 가드

- typecheck/lint PASS
- vitest 1184 baseline + 신규 (C10-A 2+ + C10-B 3+ = 5+)
- circular baseline 1
- Multi-seed sim 150 cycle (rejuv ≥ 20%, 자연사 ≥ 30%)
- Cycle 5-10 회귀 0

## 작업 순서

1. cycle 11 branch = `feat/cycle-11-natural-death-autorejuv`. **Base = cycle 10 branch (`feat/cycle-10-lifecycle-activation`) 의 끝 commit** — cycle 10 의 1 commit 포함
2. implementer (advisor 호출 권장 — emit path 와 auto-rejuv 의 architecturally clean 위치 결정):
   - Phase A: grep + git log 로 `hero_died` emit pattern 확인 + `rejuvenate` 호출 path 확인
   - Phase B: C10-A + C10-B 구현 + unit test
   - Phase C: 머지 가드 + sim 150 cycle 측정
3. finisher: PRD 수용 통과 시 main 머지 (cycle 10+11 fold) + tag `cycle-11-complete` + `cycle-10-complete` (same SHA — cycle 7-9 fold 패턴)

## Phase G self-check 예상

- 약점 고갈: ✗ (cycle 7+8+10 carry-over + D1-D7 + cycle 6 staggered 등)
- 3 연속 같은 1순위: cycle 9 path → cycle 10 lifecycle (앞) → **cycle 11 lifecycle (뒤)**. 살짝 같은 카테고리. 다만 cycle 10 의 직접 후속 (3-fold 패턴 cycle 7-9 와 동일)
- 자원 추정: 10 cycle 누적 매우 무거움. cycle 11 의 implementer dispatch + finisher dispatch 모두 진행 시 hard halt 가능. partial 진행 시 main 머지 보류 + 다음 세션 재개

## Cycle 12+ carry-over

- 모든 cycle 10 carry-over (C10-C maxLevel intent 검토, C10-D jsonl chunked write)
- D1-D7 backlog
- HeroSnapshot staggered (cycle 6)
- prod 빌드 추가 정찰
- PRD fixture schema (cycle 7)
- Reactive subscription audit (cycle 9)
- 페르소나 doc patch (negative claim grep 룰 — cycle 10 신규)
- 페르소나 doc patch (measurable baseline 사전 측정 — cycle 8 carry-over)
